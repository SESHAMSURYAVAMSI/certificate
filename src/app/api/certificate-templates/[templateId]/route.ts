import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/mongodb";
import CertificateTemplate from "@/models/CertificateTemplate";

const fieldSchema = z.object({
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(150),
  type: z.enum([
    "participantName",
    "workshopTitle",
    "eventName",
    "eventDates",
    "venue",
    "custom",
  ]),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
  fontSize: z.number().min(6).max(200),
  fontFamily: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  align: z.enum(["left", "center", "right"]),
  fontWeight: z.enum(["normal", "bold"]),
});

const updateSchema = z.object({
  fields: z.array(fieldSchema).max(30),
  status: z.enum(["draft", "published"]).optional(),
});

type RouteContext = {
  params: Promise<{ templateId: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
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

    const body: unknown = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid template settings.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const keys = validation.data.fields.map((field) => field.key);

    if (new Set(keys).size !== keys.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Each certificate field must have a unique key.",
        },
        { status: 400 }
      );
    }

    if (
      validation.data.status === "published" &&
      validation.data.fields.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Add at least one dynamic field before publishing.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const template = await CertificateTemplate.findById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, message: "Template not found." },
        { status: 404 }
      );
    }

    template.fields = validation.data.fields;

    if (validation.data.status) {
      template.status = validation.data.status;
    }

    await template.save();

    return NextResponse.json({
      success: true,
      message:
        template.status === "published"
          ? "Certificate design saved and published successfully."
          : "Certificate design saved successfully.",
      template: {
        _id: template._id.toString(),
        name: template.name,
        fields: template.fields,
        status: template.status,
      },
    });
  } catch (error) {
    console.error("Certificate template PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save certificate design.",
      },
      { status: 500 }
    );
  }
}