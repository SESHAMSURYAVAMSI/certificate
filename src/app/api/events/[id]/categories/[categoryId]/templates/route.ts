
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { z } from "zod";

import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Category from "@/models/Category";
import CertificateTemplate from "@/models/CertificateTemplate";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

const nameSchema = z.string().trim().min(2).max(150);

async function getBucket() {
  await connectDB();

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not available.");
  }

  return new GridFSBucket(db, {
    bucketName: "certificateTemplates",
  });
}

function uploadBuffer(
  bucket: GridFSBucket,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<mongoose.Types.ObjectId> {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: {
        contentType: mimeType,
        uploadedAt: new Date(),
      },
    });

    uploadStream.on("error", reject);

    uploadStream.on("finish", () => {
      resolve(uploadStream.id as mongoose.Types.ObjectId);
    });

    uploadStream.end(buffer);
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id, categoryId } = await context.params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(categoryId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event or category ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const [event, category] = await Promise.all([
      Event.findById(id).select("_id").lean(),
      Category.findOne({ _id: categoryId, eventId: id })
        .select("_id")
        .lean(),
    ]);

    if (!event || !category) {
      return NextResponse.json(
        { success: false, message: "Event or category not found." },
        { status: 404 }
      );
    }

    const templates = await CertificateTemplate.find({
      eventId: id,
      categoryId,
    })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return NextResponse.json({
      success: true,
      templates: templates.map((template) => ({
        ...template,
        _id: template._id.toString(),
        fileId: template.fileId.toString(),
        eventId: template.eventId.toString(),
        categoryId: template.categoryId.toString(),
        createdBy: template.createdBy.toString(),
      })),
    });
  } catch (error) {
    console.error("Certificate template GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load certificate templates." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; categoryId: string }> }
) {
  let uploadedFileId: mongoose.Types.ObjectId | null = null;
  let bucket: GridFSBucket | null = null;

  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id, categoryId } = await context.params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(categoryId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event or category ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const [event, category] = await Promise.all([
      Event.findById(id).select("_id").lean(),
      Category.findOne({ _id: categoryId, eventId: id })
        .select("_id")
        .lean(),
    ]);

    if (!event || !category) {
      return NextResponse.json(
        { success: false, message: "Event or category not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    const nameResult = nameSchema.safeParse(formData.get("name"));
    const file = formData.get("file");

    if (!nameResult.success) {
      return NextResponse.json(
        { success: false, message: "Enter a valid template name." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please select a certificate file." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File must be greater than 0 and no larger than 20 MB.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only PDF, PNG and JPEG files are supported.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    bucket = await getBucket();

    uploadedFileId = await uploadBuffer(
      bucket,
      buffer,
      file.name,
      file.type
    );

    const template = await CertificateTemplate.create({
      eventId: id,
      categoryId,
      name: nameResult.data,
      fileId: uploadedFileId,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fields: [],
      status: "draft",
      createdBy: admin.adminId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Certificate template uploaded successfully.",
        template: {
          _id: template._id.toString(),
          name: template.name,
          fileName: template.fileName,
          mimeType: template.mimeType,
          fileSize: template.fileSize,
          status: template.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Certificate template POST error:", error);

    if (uploadedFileId && bucket) {
      try {
        await bucket.delete(uploadedFileId);
      } catch (cleanupError) {
        console.error("Template file cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      { success: false, message: "Unable to upload certificate template." },
      { status: 500 }
    );
  }
}
