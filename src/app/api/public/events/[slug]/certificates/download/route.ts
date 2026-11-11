import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Participant from "@/models/Participant";
import GeneratedCertificate from "@/models/GeneratedCertificate";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function getBucket() {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not available.");
  }

  return new GridFSBucket(db, { bucketName: "generatedCertificates" });
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function safeFilename(filename: string) {
  const cleaned = filename
    .split(/[\\/]/)
    .pop()
    ?.replace(/[<>:"|?*\x00-\x1F]/g, "_")
    .trim();

  const base = cleaned || `certificate_${Date.now()}.pdf`;
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid download request." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";
    const generatedCertificateId =
      typeof payload.generatedCertificateId === "string"
        ? payload.generatedCertificateId.trim()
        : "";

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !mongoose.isValidObjectId(generatedCertificateId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid download request." },
        { status: 400 }
      );
    }

    await connectDB();

    const event = await Event.findOne({
      slug: slug.toLowerCase(),
      status: "published",
    })
      .select("_id")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "This event is not available." },
        { status: 404 }
      );
    }

    // Locate the requested certificate, then verify its participant's registered email.
    const certificate = await GeneratedCertificate.findOne({
      _id: new mongoose.Types.ObjectId(generatedCertificateId),
      eventId: event._id,
      status: "generated",
    }).lean();

    if (!certificate) {
      return NextResponse.json(
        { success: false, message: "This certificate is unavailable or has been revoked." },
        { status: 404 }
      );
    }

    const participant = await Participant.findOne({
      _id: certificate.participantId,
      eventId: event._id,
      status: "active",
      $or: [{ normalizedEmail: email }, { email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }],
    })
      .select("_id")
      .lean();

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Email verification failed for this certificate." },
        { status: 403 }
      );
    }

    const fileId = new ObjectId(String(certificate.fileId));
    const bucket = getBucket();
    const storedFiles = await bucket.find({ _id: fileId }).toArray();

    if (!storedFiles.length) {
      return NextResponse.json(
        { success: false, message: "The certificate file was not found." },
        { status: 404 }
      );
    }

    const pdfBuffer = await streamToBuffer(bucket.openDownloadStream(fileId));

    if (!pdfBuffer.length) {
      return NextResponse.json(
        { success: false, message: "The certificate file is empty." },
        { status: 404 }
      );
    }

    await GeneratedCertificate.updateOne(
      { _id: certificate._id, status: "generated" },
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadedAt: new Date() },
      }
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(certificate.fileName)}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Public certificate download error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to download this certificate." },
      { status: 500 }
    );
  }
}
