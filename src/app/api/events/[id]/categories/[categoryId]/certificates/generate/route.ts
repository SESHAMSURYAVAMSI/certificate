import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Event from "@/models/Event";
import Category from "@/models/Category";
import CertificateTemplate from "@/models/CertificateTemplate";
import Participant from "@/models/Participant";
import GeneratedCertificate from "@/models/GeneratedCertificate";

type RouteContext = {
  params: Promise<{
    id: string;
    categoryId: string;
  }>;
};

type TemplateField = {
  key: string;
  label: string;
  type:
    | "participantName"
    | "workshopTitle"
    | "eventName"
    | "eventDates"
    | "venue"
    | "custom";
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
};

type CategoryField = {
  key: string;
  label: string;
  type: string;
};

type ParticipantRecord = {
  _id: mongoose.Types.ObjectId;
  certificateId: string;
  participantName: string;
  email?: string;
  data?: Record<string, unknown>;
};

function getBucket(bucketName: string) {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not available.");
  }

  return new GridFSBucket(db, { bucketName });
}

async function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function readGridFSFile(
  bucketName: string,
  fileId: ObjectId
): Promise<Buffer> {
  const bucket = getBucket(bucketName);
  const files = await bucket.find({ _id: fileId }).toArray();

  if (!files.length) {
    throw new Error("Certificate template file was not found.");
  }

  return streamToBuffer(bucket.openDownloadStream(fileId));
}

async function uploadGridFSFile(
  bucketName: string,
  buffer: Buffer,
  filename: string,
  metadata: Record<string, unknown>
): Promise<ObjectId> {
  const bucket = getBucket(bucketName);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        contentType: "application/pdf",
      },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve(uploadStream.id as ObjectId));
    uploadStream.end(buffer);
  });
}

function parseColor(hex: string) {
  const clean = hex.replace("#", "");
  const red = parseInt(clean.slice(0, 2), 16) / 255;
  const green = parseInt(clean.slice(2, 4), 16) / 255;
  const blue = parseInt(clean.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

function formatEventDates(startDate: Date, endDate: Date) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const start = formatter.format(new Date(startDate));
  const end = formatter.format(new Date(endDate));

  return start === end ? start : `${start} – ${end}`;
}

function getFieldText(
  field: TemplateField,
  participant: ParticipantRecord,
  event: {
    name: string;
    startDate: Date;
    endDate: Date;
    venue?: string;
    city?: string;
  },
  categoryFields: CategoryField[]
): string {
  const participantData = participant.data || {};

  switch (field.type) {
    case "participantName":
      return participant.participantName || "";

    case "eventName":
      return event.name || "";

    case "eventDates":
      return formatEventDates(event.startDate, event.endDate);

    case "venue":
      return [event.venue, event.city].filter(Boolean).join(", ");

    case "workshopTitle": {
      const directValue = participantData[field.key];

      if (directValue !== undefined && directValue !== null) {
        return String(directValue);
      }

      const candidates = [
        "workshop_title",
        "presentation_title",
        "title",
        "topic",
        "session_title",
      ];

      for (const key of candidates) {
        const value = participantData[key];

        if (value !== undefined && value !== null && String(value).trim()) {
          return String(value);
        }
      }

      const matchingField = categoryFields.find(
        (item) => item.key === field.key
      );

      if (matchingField) {
        const value = participantData[matchingField.key];
        return value === undefined || value === null ? "" : String(value);
      }

      return "";
    }

    case "custom": {
      const value = participantData[field.key];
      return value === undefined || value === null ? "" : String(value);
    }

    default:
      return "";
  }
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
        line = "";
      }

      // Split a single long word if it is wider than the field.
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let part = "";

        for (const character of word) {
          const next = part + character;

          if (
            part &&
            font.widthOfTextAtSize(next, fontSize) > maxWidth
          ) {
            lines.push(part);
            part = character;
          } else {
            part = next;
          }
        }

        line = part;
      } else {
        line = word;
      }
    }

    if (line) lines.push(line);
  }

  return lines;
}

function getFontFamily(
  fontFamily: string,
  fontWeight: "normal" | "bold"
) {
  const family = fontFamily.toLowerCase();

  if (family.includes("courier")) {
    return fontWeight === "bold"
      ? StandardFonts.CourierBold
      : StandardFonts.Courier;
  }

  if (family.includes("times")) {
    return fontWeight === "bold"
      ? StandardFonts.TimesRomanBold
      : StandardFonts.TimesRoman;
  }

  return fontWeight === "bold"
    ? StandardFonts.HelveticaBold
    : StandardFonts.Helvetica;
}

async function createCertificatePDF(
  templateBuffer: Buffer,
  mimeType: string,
  fields: TemplateField[],
  participant: ParticipantRecord,
  event: {
    name: string;
    startDate: Date;
    endDate: Date;
    venue?: string;
    city?: string;
  },
  categoryFields: CategoryField[]
): Promise<Buffer> {
  const outputDocument = await PDFDocument.create();
  outputDocument.registerFontkit(fontkit);

  let page: PDFPage;
  let pageWidth: number;
  let pageHeight: number;

  if (mimeType === "application/pdf") {
    const sourceDocument = await PDFDocument.load(templateBuffer);
    const copiedPages = await outputDocument.copyPages(sourceDocument, [0]);

    page = copiedPages[0];
    outputDocument.addPage(page);

    pageWidth = page.getWidth();
    pageHeight = page.getHeight();
  } else if (mimeType === "image/png") {
    const image = await outputDocument.embedPng(templateBuffer);
    pageWidth = image.width;
    pageHeight = image.height;

    page = outputDocument.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else if (mimeType === "image/jpeg") {
    const image = await outputDocument.embedJpg(templateBuffer);
    pageWidth = image.width;
    pageHeight = image.height;

    page = outputDocument.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else {
    throw new Error("Unsupported certificate template file type.");
  }

  for (const field of fields) {
    const text = getFieldText(
      field,
      participant,
      event,
      categoryFields
    ).trim();

    if (!text) continue;

    const font = await outputDocument.embedFont(
      getFontFamily(field.fontFamily, field.fontWeight)
    );

    const x = (field.x / 100) * pageWidth;
    const top = (field.y / 100) * pageHeight;
    const width = (field.width / 100) * pageWidth;
    const height = (field.height / 100) * pageHeight;

    const fontSize = Math.max(6, field.fontSize);
    const lineHeight = fontSize * 1.2;
    const lines = wrapText(text, font, fontSize, width);

    const maxLines = Math.max(
      1,
      Math.floor(height / lineHeight)
    );

    const visibleLines = lines.slice(0, maxLines);
    const color = parseColor(field.color);

    visibleLines.forEach((line, index) => {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);

      let drawX = x;

      if (field.align === "center") {
        drawX = x + Math.max(0, (width - lineWidth) / 2);
      } else if (field.align === "right") {
        drawX = x + Math.max(0, width - lineWidth);
      }

      const baselineY =
        pageHeight - top - fontSize - index * lineHeight;

      page.drawText(line, {
        x: drawX,
        y: baselineY,
        size: fontSize,
        font,
        color,
        maxWidth: width,
      });
    });
  }

  return Buffer.from(await outputDocument.save());
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id, categoryId } = await context.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(categoryId)) {
      return NextResponse.json({ success: false, message: "Invalid event or category ID." }, { status: 400 });
    }

    await connectDB();
    // Use ObjectIds and a literal status so the filter matches the Mongoose schema.
    const filter = {
      eventId: new mongoose.Types.ObjectId(id),
      categoryId: new mongoose.Types.ObjectId(categoryId),
      status: "generated" as const,
    };

    const [
      generatedCount,
      downloadedCount,
      downloadAggregate,
      generatedRecords,
    ] = await Promise.all([
      GeneratedCertificate.countDocuments(filter),
      GeneratedCertificate.countDocuments({
        ...filter,
        downloadCount: { $gt: 0 },
      }),
      GeneratedCertificate.aggregate([
        {
          $match: {
            eventId: filter.eventId,
            categoryId: filter.categoryId,
            status: filter.status,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ["$downloadCount", 0],
              },
            },
          },
        },
      ]),
      GeneratedCertificate.find(filter)
        .select({ participantId: 1 })
        .lean()
        .exec() as unknown as Array<{
        participantId: mongoose.Types.ObjectId;
      }>,
    ]);

    const stats = {
      generatedCount,
      downloadedCount,
      totalDownloads: Number(downloadAggregate[0]?.total || 0),
      generatedParticipantIds: generatedRecords.map((record) =>
        String(record.participantId),
      ),
    };

    // Keep the nested shape for existing pages and expose top-level aliases
    // for dashboard/event pages that read the original response format.
    return NextResponse.json({
      success: true,
      ...stats,
      stats,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Certificate statistics error:", error);
    return NextResponse.json({ success: false, message: "Unable to load certificate statistics." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const uploadedFileIds: ObjectId[] = [];

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

    const body = await request.json();

    const templateId = String(body.templateId || "");
    const singleParticipantId = body.participantId
      ? String(body.participantId)
      : "";

    const participantIds: string[] = Array.isArray(body.participantIds)
      ? body.participantIds.map(String)
      : singleParticipantId
        ? [singleParticipantId]
        : [];

    if (!mongoose.isValidObjectId(templateId)) {
      return NextResponse.json(
        { success: false, message: "Invalid certificate template ID." },
        { status: 400 }
      );
    }

    if (!participantIds.length) {
      return NextResponse.json(
        { success: false, message: "Select at least one participant." },
        { status: 400 }
      );
    }

    if (participantIds.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "A maximum of 500 certificates can be generated at once.",
        },
        { status: 400 }
      );
    }

    if (
      participantIds.some((participantId) =>
        !mongoose.isValidObjectId(participantId)
      )
    ) {
      return NextResponse.json(
        { success: false, message: "One or more participant IDs are invalid." },
        { status: 400 }
      );
    }

    const uniqueParticipantIds = Array.from(new Set(participantIds));

    await connectDB();

    const [event, category, template] = await Promise.all([
      Event.findById(id).lean(),
      Category.findOne({ _id: categoryId, eventId: id }).lean(),
      CertificateTemplate.findOne({
        _id: templateId,
        eventId: id,
        categoryId,
      }),
    ]);

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Certificate template not found." },
        { status: 404 }
      );
    }

    if (template.status !== "published") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This certificate template is still a draft. Publish the design before generating certificates.",
        },
        { status: 400 }
      );
    }

    if (!template.fields?.length) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected template has no dynamic fields.",
        },
        { status: 400 }
      );
    }

    const participants = (await Participant.find({
      _id: { $in: uniqueParticipantIds },
      eventId: id,
      categoryId,
      status: "active",
    }).lean()) as unknown as ParticipantRecord[];

    if (participants.length !== uniqueParticipantIds.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Some selected participants were not found, are inactive, or do not belong to this category.",
        },
        { status: 400 }
      );
    }

    const templateBuffer = await readGridFSFile(
      "certificateTemplates",
      new ObjectId(String(template.fileId))
    );

    const categoryFields = (category.fields || []) as CategoryField[];
    const templateFields = template.fields as unknown as TemplateField[];

    const generatedAt = new Date();
    let generatedCount = 0;

    for (const participant of participants) {
      const pdfBuffer = await createCertificatePDF(
        templateBuffer,
        template.mimeType,
        templateFields,
        participant,
        {
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          venue: event.venue,
          city: event.city,
        },
        categoryFields
      );

      const safeName = participant.participantName
        .replace(/[^a-z0-9-_ ]/gi, "")
        .trim()
        .replace(/\s+/g, "_");

      const filename = `${safeName || "Participant"}_${participant.certificateId}.pdf`;

      const newFileId = await uploadGridFSFile(
        "generatedCertificates",
        pdfBuffer,
        filename,
        {
          eventId: new ObjectId(id),
          categoryId: new ObjectId(categoryId),
          participantId: participant._id,
          templateId: template._id,
          certificateId: participant.certificateId,
          generatedAt,
        }
      );

      uploadedFileIds.push(newFileId);

      const previousCertificate = await GeneratedCertificate.findOne({
        eventId: id,
        categoryId,
        participantId: participant._id,
      });

      const previousFileId = previousCertificate?.fileId;

      await GeneratedCertificate.findOneAndUpdate(
        {
          eventId: id,
          categoryId,
          participantId: participant._id,
        },
        {
          $setOnInsert: {
            downloadCount: 0,
            lastDownloadedAt: null,
          },
          $set: {
            eventId: id,
            categoryId,
            participantId: participant._id,
            templateId: template._id,
            certificateId: participant.certificateId,
            fileId: newFileId,
            fileName: filename,
            fileSize: pdfBuffer.length,
            status: "generated",
            generatedBy: admin.adminId,
            generatedAt,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      // The new file is now referenced by the generated-certificate record.
      uploadedFileIds.splice(uploadedFileIds.indexOf(newFileId), 1);

      if (
        previousFileId &&
        String(previousFileId) !== String(newFileId)
      ) {
        try {
          await getBucket("generatedCertificates").delete(
            new ObjectId(String(previousFileId))
          );
        } catch (deleteError) {
          console.warn(
            "Unable to remove previous generated certificate file:",
            deleteError
          );
        }
      }

      generatedCount += 1;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${generatedCount} certificate${generatedCount === 1 ? "" : "s"}.`,
      generatedCount,
    });
  } catch (error) {
    console.error("Certificate generation error:", error);

    // Remove any newly uploaded files that were not committed to a record.
    for (const fileId of uploadedFileIds) {
      try {
        await getBucket("generatedCertificates").delete(fileId);
      } catch (cleanupError) {
        console.error("Generated file cleanup error:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate certificates.",
      },
      { status: 500 }
    );
  }
}