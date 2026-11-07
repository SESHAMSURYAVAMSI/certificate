
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Event from "@/models/Event";

const createEventSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).default(""),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  venue: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  organizer: z.string().trim().min(2).max(150),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const events = await Event.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      events: events.map((event) => ({
        ...event,
        _id: event._id.toString(),
        createdBy: event.createdBy.toString(),
      })),
    });
  } catch (error) {
    console.error("Fetch events error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch events." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check the event details.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide valid event dates. End date cannot be before start date.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingEvent = await Event.findOne({ slug: data.slug });

    if (existingEvent) {
      return NextResponse.json(
        {
          success: false,
          message: "This event URL already exists. Please use another slug.",
        },
        { status: 409 }
      );
    }

    const event = await Event.create({
      ...data,
      startDate,
      endDate,
      createdBy: admin.adminId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully.",
        event: {
          ...event.toObject(),
          _id: event._id.toString(),
          createdBy: event.createdBy.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create event error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create event." },
      { status: 500 }
    );
  }
}
