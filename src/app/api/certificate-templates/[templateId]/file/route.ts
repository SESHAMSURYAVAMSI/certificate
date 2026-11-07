
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/mongodb";
import CertificateTemplate from "@/models/CertificateTemplate";


export async function GET(
  _request: Request,
  context: { params: Promise<{ templateId: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { templateId } = await context.params;

    if (!mongoose.isValidObjectId(templateId)) {
      return NextResponse.json(
        { success: false, message: "Invalid template ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const template = await CertificateTemplate.findById(templateId).lean();

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Certificate template not found." },
        { status: 404 }
      );
    }

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB connection is not available.");
    }

    const bucket = new GridFSBucket(db, {
      bucketName: "certificateTemplates",
    });

    const downloadStream = bucket.openDownloadStream(template.fileId);

    const webStream = Readable.toWeb(
      downloadStream
    ) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      headers: {
        "Content-Type": template.mimeType,
        "Content-Length": String(template.fileSize),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          template.fileName
        )}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Certificate template file GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to preview certificate template." },
      { status: 500 }
    );
  }
}
