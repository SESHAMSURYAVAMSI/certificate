
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import JSZip from "jszip";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import GeneratedCertificate from "@/models/GeneratedCertificate";

type RouteContext = {
  params: Promise<{
    id: string;
    categoryId: string;
  }>;
};

function getBucket() {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not available.");
  }

  return new GridFSBucket(db, {
    bucketName: "generatedCertificates",
  });
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      );
    });

    stream.on("error", reject);

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

function safeFilename(filename: string) {
  const cleaned = filename
    .split(/[\\/]/)
    .pop()
    ?.replace(/[<>:"|?*\x00-\x1F]/g, "_")
    .trim();

  return cleaned || `certificate_${Date.now()}.pdf`;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Authenticate admin
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id, categoryId } = await context.params;

    // Validate IDs
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(categoryId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid event or category ID.",
        },
        { status: 400 }
      );
    }

    // Safely parse request body
    const body: unknown = await request.json().catch(() => ({}));

    let rawParticipantIds: unknown = undefined;

    if (body && typeof body === "object" && "participantIds" in body) {
      rawParticipantIds = body.participantIds;
    }

    const rawIds: unknown[] = Array.isArray(rawParticipantIds)
      ? rawParticipantIds
      : [];

    // Reject malformed participant IDs instead of trusting unknown values
    if (!rawIds.every((value) => typeof value === "string")) {
      return NextResponse.json(
        {
          success: false,
          message: "Participant IDs must be valid strings.",
        },
        { status: 400 }
      );
    }

    const requestedIds: string[] = rawIds as string[];

    if (
      requestedIds.some(
        (value) => !mongoose.isValidObjectId(value)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more participant IDs are invalid.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find generated certificates
    const filter: Record<string, unknown> = {
      eventId: id,
      categoryId,
      status: "generated",
    };

    if (requestedIds.length > 0) {
      filter.participantId = {
        $in: [...new Set(requestedIds)],
      };
    }

    const records = await GeneratedCertificate.find(filter)
      .sort({ generatedAt: 1 })
      .lean();

    if (!records.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No generated certificates are available to download for this selection.",
        },
        { status: 404 }
      );
    }

    const bucket = getBucket();
    const downloadedAt = new Date();

    // --------------------------------------------------
    // INDIVIDUAL DOWNLOAD: Return a direct PDF
    // --------------------------------------------------

    if (requestedIds.length === 1) {
      const record = records[0];
      const fileId = new ObjectId(String(record.fileId));

      const files = await bucket.find({ _id: fileId }).toArray();

      if (!files.length) {
        return NextResponse.json(
          {
            success: false,
            message: "The certificate PDF could not be found in storage.",
          },
          { status: 404 }
        );
      }

      const pdfBuffer = await streamToBuffer(
        bucket.openDownloadStream(fileId)
      );

      if (!pdfBuffer.length) {
        return NextResponse.json(
          {
            success: false,
            message: "The certificate PDF is empty.",
          },
          { status: 404 }
        );
      }

      // Update only the downloaded certificate
      await GeneratedCertificate.updateOne(
        { _id: record._id },
        {
          $inc: { downloadCount: 1 },
          $set: { lastDownloadedAt: downloadedAt },
        }
      );

      const filename = safeFilename(
        record.fileName || `${record.certificateId}.pdf`
      );

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdfBuffer.length),
          "X-Certificates-Downloaded": "1",
          "X-Download-Format": "pdf",
          "Cache-Control": "no-store",
        },
      });
    }

    // --------------------------------------------------
    // BULK DOWNLOAD: Return a ZIP
    // --------------------------------------------------

    const zip = new JSZip();
    const includedRecordIds: ObjectId[] = [];

    for (const record of records) {
      const fileId = new ObjectId(String(record.fileId));

      const files = await bucket.find({ _id: fileId }).toArray();

      if (!files.length) {
        continue;
      }

      const buffer = await streamToBuffer(
        bucket.openDownloadStream(fileId)
      );

      if (!buffer.length) {
        continue;
      }

      const filename = safeFilename(
        record.fileName || `${record.certificateId}.pdf`
      );

      zip.file(filename, buffer);

      includedRecordIds.push(
        new ObjectId(String(record._id))
      );
    }

    if (includedRecordIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The generated certificate files could not be found in storage.",
        },
        { status: 404 }
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    // Update download counters only for files included in ZIP
    await GeneratedCertificate.updateMany(
      {
        _id: {
          $in: includedRecordIds,
        },
      },
      {
        $inc: {
          downloadCount: 1,
        },
        $set: {
          lastDownloadedAt: downloadedAt,
        },
      }
    );

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates_${Date.now()}.zip"`,
        "Content-Length": String(zipBuffer.length),
        "X-Certificates-Downloaded": String(
          includedRecordIds.length
        ),
        "X-Download-Format": "zip",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Certificate download error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to download certificates.",
      },
      { status: 500 }
    );
  }
}
