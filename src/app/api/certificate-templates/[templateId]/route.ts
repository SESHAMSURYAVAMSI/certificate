
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
  fontFamily: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  align: z.enum(["left", "center", "right"]),
  fontWeight: z.enum(["normal", "bold"]),
});

const updateSchema = z.object({
  fields: z.array(fieldSchema).max(30),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
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
      message: "Certificate design saved successfully.",
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
      { success: false, message: "Unable to save certificate design." },
      { status: 500 }
    );
  }
}
