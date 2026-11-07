
import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import JSZip from "jszip";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Event from "@/models/Event";
import Category from "@/models/Category";
import Participant from "@/models/Participant";
import CertificateTemplate from "@/models/CertificateTemplate";
import GeneratedCertificate from "@/models/GeneratedCertificate";

type RouteParams = {
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

type ParticipantData = {
  _id: mongoose.Types.ObjectId;
  certificateId: string;
  participantName: string;
  email?: string;
  data: Record<string, unknown>;
};

const TEMPLATE_BUCKET = "certificateTemplates";
const CERTIFICATE_BUCKET = "generatedCertificates";
const MAX_PARTICIPANTS = 500;

function streamToBuffer(
  stream: NodeJS.ReadableStream
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    });

    stream.on("error", reject);

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

async function readGridFSFile(
  bucket: GridFSBucket,
  fileId: mongoose.Types.ObjectId
) {
  return streamToBuffer(
    bucket.openDownloadStream(new ObjectId(fileId.toString()))
  );
}

async function uploadGridFSFile(
  bucket: GridFSBucket,
  buffer: Buffer,
  fileName: string,
  metadata: Record<string, unknown>
) {
  const uploadStream = bucket.openUploadStream(fileName, {
    metadata,
  });

  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(uploadStream)
      .on("finish", resolve)
      .on("error", reject);
  });

  return uploadStream.id as ObjectId;
}

function getFont(
  family: string,
  bold: boolean
): typeof StandardFonts[keyof typeof StandardFonts] {
  const normalized = family.toLowerCase();

  if (normalized.includes("times")) {
    return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  }

  if (normalized.includes("courier")) {
    return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  }

  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

function parseColor(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex)
    ? hex.slice(1)
    : "000000";

  return rgb(
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255
  );
}

function formatEventDates(startDate: Date, endDate: Date) {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  const start = new Date(startDate).toLocaleDateString("en-IN", options);
  const end = new Date(endDate).toLocaleDateString("en-IN", options);

  return start === end ? start : `${start} - ${end}`;
}

function getFieldText(
  field: TemplateField,
  participant: ParticipantData,
  event: {
    name: string;
    startDate: Date;
    endDate: Date;
    venue: string;
    city: string;
  }
) {
  const data = participant.data || {};

  switch (field.type) {
    case "participantName":
      return participant.participantName;

    case "eventName":
      return event.name;

    case "eventDates":
      return formatEventDates(event.startDate, event.endDate);

    case "venue":
      return [event.venue, event.city].filter(Boolean).join(", ");

    case "workshopTitle": {
      const direct = data[field.key];

      if (direct !== undefined && direct !== null && String(direct).trim()) {
        return String(direct);
      }

      const candidates = [
        "workshop_title",
        "workshopTitle",
        "title",
        "topic",
        "presentation_title",
        "presentationTitle",
      ];

      for (const key of candidates) {
        const value = data[key];

        if (value !== undefined && value !== null && String(value).trim()) {
          return String(value);
        }
      }

      return "";
    }

    case "custom": {
      const value = data[field.key];

      return value === undefined || value === null
        ? ""
        : String(value);
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
) {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine
        ? `${currentLine} ${word}`
        : word;

      if (
        font.widthOfTextAtSize(candidate, fontSize) <= maxWidth ||
        !currentLine
      ) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

async function createCertificatePDF(
  templateBuffer: Buffer,
  mimeType: string,
  fields: TemplateField[],
  participant: ParticipantData,
  event: {
    name: string;
    startDate: Date;
    endDate: Date;
    venue: string;
    city: string;
  }
) {
  const pdfDoc = await PDFDocument.create();

  let pageWidth = 0;
  let pageHeight = 0;

  if (mimeType === "application/pdf") {
    const sourcePdf = await PDFDocument.load(templateBuffer, {
      ignoreEncryption: false,
    });

    const sourcePages = sourcePdf.getPages();

    if (sourcePages.length === 0) {
      throw new Error("The uploaded PDF has no pages.");
    }

    const firstPage = sourcePages[0];
    const dimensions = firstPage.getSize();

    pageWidth = dimensions.width;
    pageHeight = dimensions.height;

    const embeddedPages = await pdfDoc.embedPdf(
      templateBuffer,
      [0]
    );

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawPage(embeddedPages[0], {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else if (mimeType === "image/png" || mimeType === "image/jpeg") {
    const image =
      mimeType === "image/png"
        ? await pdfDoc.embedPng(templateBuffer)
        : await pdfDoc.embedJpg(templateBuffer);

    pageWidth = image.width;
    pageHeight = image.height;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else {
    throw new Error("Unsupported certificate template format.");
  }

  const page = pdfDoc.getPages()[0];

  for (const field of fields) {
    const text = getFieldText(field, participant, event);

    if (!text.trim()) continue;

    const fontName = getFont(
      field.fontFamily,
      field.fontWeight === "bold"
    );

    const font = await pdfDoc.embedFont(fontName);

    const fontSize = Math.max(6, Math.min(200, field.fontSize));

    const boxX = (field.x / 100) * pageWidth;
    const boxWidth = (field.width / 100) * pageWidth;
    const boxHeight = (field.height / 100) * pageHeight;

    // Designer Y is measured from the top; PDF Y is measured from the bottom.
    const boxTop = (field.y / 100) * pageHeight;

    const padding = 2;
    const textWidth = Math.max(1, boxWidth - padding * 2);

    const lines = wrapText(text, font, fontSize, textWidth);
    const lineHeight = fontSize * 1.2;

    const maxLines = Math.max(
      1,
      Math.floor((boxHeight - padding * 2) / lineHeight)
    );

    const visibleLines = lines.slice(0, maxLines);
    const totalTextHeight = visibleLines.length * lineHeight;

    const verticalOffset = Math.max(
      0,
      (boxHeight - totalTextHeight) / 2
    );

    for (let index = 0; index < visibleLines.length; index++) {
      const line = visibleLines[index];

      const lineWidth = font.widthOfTextAtSize(line, fontSize);

      let drawX = boxX + padding;

      if (field.align === "center") {
        drawX = boxX + (boxWidth - lineWidth) / 2;
      } else if (field.align === "right") {
        drawX = boxX + boxWidth - padding - lineWidth;
      }

      const drawY =
        pageHeight -
        boxTop -
        verticalOffset -
        fontSize -
        index * lineHeight;

      page.drawText(line, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: parseColor(field.color),
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

export async function POST(
  request: NextRequest,
  context: RouteParams
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

    await connectDB();

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
    const participantIds: string[] = Array.isArray(body.participantIds)
      ? body.participantIds.map(String)
      : body.participantId
        ? [String(body.participantId)]
        : [];

    if (!mongoose.isValidObjectId(templateId)) {
      return NextResponse.json(
        { success: false, message: "A valid template ID is required." },
        { status: 400 }
      );
    }

    if (
      participantIds.length === 0 ||
      participantIds.length > MAX_PARTICIPANTS ||
      participantIds.some((participantId) =>
        !mongoose.isValidObjectId(participantId)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Select between 1 and ${MAX_PARTICIPANTS} valid participants.`,
        },
        { status: 400 }
      );
    }

    const [event, category, template, participants] = await Promise.all([
      Event.findById(id).lean(),
      Category.findOne({ _id: categoryId, eventId: id }).lean(),
      CertificateTemplate.findOne({
        _id: templateId,
        eventId: id,
        categoryId,
      }).lean(),
      Participant.find({
        _id: { $in: participantIds },
        eventId: id,
        categoryId,
        status: "active",
      }).lean(),
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

    if (participants.length !== participantIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more selected participants were not found or are inactive.",
        },
        { status: 400 }
      );
    }

    if (!template.fields?.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Add and save at least one dynamic field in the template designer.",
        },
        { status: 400 }
      );
    }

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB connection is unavailable.");
    }

    const templateBucket = new GridFSBucket(db, {
      bucketName: TEMPLATE_BUCKET,
    });

    const certificateBucket = new GridFSBucket(db, {
      bucketName: CERTIFICATE_BUCKET,
    });

    const templateBuffer = await readGridFSFile(
      templateBucket,
      template.fileId
    );

    const zip = new JSZip();
    const generated: {
      certificateId: string;
      participantName: string;
      fileName: string;
    }[] = [];

    for (const rawParticipant of participants) {
      const participant = rawParticipant as unknown as ParticipantData;

      const pdfBuffer = await createCertificatePDF(
        templateBuffer,
        template.mimeType,
        template.fields as TemplateField[],
        participant,
        {
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          venue: event.venue,
          city: event.city,
        }
      );

      const safeName = participant.participantName
        .replace(/[^a-z0-9-_ ]/gi, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 80) || "Participant";

      const fileName = `${safeName}_${participant.certificateId}.pdf`;

      const fileId = await uploadGridFSFile(
        certificateBucket,
        pdfBuffer,
        fileName,
        {
          eventId: id,
          categoryId,
          participantId: participant._id.toString(),
          templateId,
          certificateId: participant.certificateId,
          generatedBy: admin.adminId,
        }
      );

      uploadedFileIds.push(fileId);

      // One current certificate record per participant.
      // Regeneration replaces the previous PDF while preserving the ID.
      const previous = await GeneratedCertificate.findOne({
        certificateId: participant.certificateId,
      }).lean();

      await GeneratedCertificate.findOneAndUpdate(
        { certificateId: participant.certificateId },
        {
          $set: {
            eventId: id,
            categoryId,
            participantId: participant._id,
            templateId,
            fileId: new mongoose.Types.ObjectId(fileId.toString()),
            fileName,
            fileSize: pdfBuffer.length,
            status: "generated",
            generatedBy: admin.adminId,
            generatedAt: new Date(),
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Delete the previous PDF after the new record is saved.
      if (previous?.fileId) {
        try {
          await certificateBucket.delete(
            new ObjectId(previous.fileId.toString())
          );
        } catch (deleteError) {
          console.error("Old certificate file cleanup error:", deleteError);
        }
      }

      uploadedFileIds.splice(uploadedFileIds.indexOf(fileId), 1);

      zip.file(fileName, pdfBuffer);

      generated.push({
        certificateId: participant.certificateId,
        participantName: participant.participantName,
        fileName,
      });
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const zipName = `${event.slug}_${category.slug}_certificates.zip`;

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "private, no-store",
        "X-Certificates-Generated": String(generated.length),
      },
    });
  } catch (error) {
    console.error("Certificate generation error:", error);

    // Clean up newly uploaded files if generation fails.
    const db = mongoose.connection.db;

    if (db && uploadedFileIds.length > 0) {
      const bucket = new GridFSBucket(db, {
        bucketName: CERTIFICATE_BUCKET,
      });

      await Promise.allSettled(
        uploadedFileIds.map((fileId) => bucket.delete(fileId))
      );
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
