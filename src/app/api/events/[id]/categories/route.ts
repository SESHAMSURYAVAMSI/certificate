
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

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).default(""),
  fields: z.array(fieldSchema).max(50).default([]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
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

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID." },
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

    const categories = await Category.find({ eventId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      categories: categories.map((category) => ({
        ...category,
        _id: category._id.toString(),
        eventId: category.eventId.toString(),
      })),
    });
  } catch (error) {
    console.error("Fetch categories error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch categories." },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID." },
        { status: 400 }
      );
    }

    const parsed = categorySchema.safeParse(await request.json());

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

    const fieldKeys = data.fields.map((field) => field.key);

    if (new Set(fieldKeys).size !== fieldKeys.length) {
      return NextResponse.json(
        { success: false, message: "Participant field keys must be unique." },
        { status: 400 }
      );
    }

    for (const field of data.fields) {
      if (field.type === "select" && field.options.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Please add options for the "${field.label}" field.`,
          },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const event = await Event.findById(id).select("_id").lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    const existing = await Category.findOne({
      eventId: id,
      slug: data.slug,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "This category already exists in the event." },
        { status: 409 }
      );
    }

    const category = await Category.create({
      ...data,
      eventId: id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully.",
        category: {
          ...category.toObject(),
          _id: category._id.toString(),
          eventId: category.eventId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create category." },
      { status: 500 }
    );
  }
}
