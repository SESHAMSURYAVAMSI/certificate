
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Event from "@/models/Event";
import Category from "@/models/Category";

const fieldSchema = z.object({
  label: z.string().trim().min(1).max(100),
  key: z.string().trim().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(["text", "email", "number", "date", "textarea", "select"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).default([]),
  placeholder: z.string().max(150).default(""),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000),
  fields: z.array(fieldSchema).max(50),
  isActive: z.boolean(),
});

type RouteContext = {
  params: Promise<{ id: string; categoryId: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id, categoryId } = await params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(categoryId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event or category ID." },
        { status: 400 }
      );
    }

    const parsed = updateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check the category details.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const keys = data.fields.map((field) => field.key);

    if (new Set(keys).size !== keys.length) {
      return NextResponse.json(
        { success: false, message: "Participant field keys must be unique." },
        { status: 400 }
      );
    }

    if (data.fields.some((field) => field.type === "select" && field.options.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Every dropdown field needs at least one option." },
        { status: 400 }
      );
    }

    await connectDB();

    const event = await Event.findById(id).select("_id").lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    const duplicate = await Category.findOne({
      eventId: id,
      slug: data.slug,
      _id: { $ne: categoryId },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "This category URL is already in use." },
        { status: 409 }
      );
    }

    const category = await Category.findOneAndUpdate(
      { _id: categoryId, eventId: id },
      data,
      { new: true, runValidators: true }
    ).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      category: {
        ...category,
        _id: category._id.toString(),
        eventId: category.eventId.toString(),
      },
    });
  } catch (error) {
    console.error("Update category error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update category." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    if (admin.role !== "superadmin") {
      return NextResponse.json(
        { success: false, message: "Only a superadmin can delete categories." },
        { status: 403 }
      );
    }

    const { id, categoryId } = await params;

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

    const category = await Category.findOneAndDelete({
      _id: categoryId,
      eventId: id,
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to delete category." },
      { status: 500 }
    );
  }
}
