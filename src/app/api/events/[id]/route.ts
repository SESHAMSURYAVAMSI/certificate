
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Event from "@/models/Event";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  venue: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  organizer: z.string().trim().min(2).max(150),
  status: z.enum(["draft", "published", "archived"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
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

    const event = await Event.findById(id).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        _id: event._id.toString(),
        createdBy: event.createdBy.toString(),
      },
    });
  } catch (error) {
    console.error("Get event error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load event." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

    const parsed = updateSchema.safeParse(await request.json());

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
        { success: false, message: "Please provide valid event dates." },
        { status: 400 }
      );
    }

    await connectDB();

    const duplicate = await Event.findOne({
      slug: data.slug,
      _id: { $ne: id },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "This event URL is already in use." },
        { status: 409 }
      );
    }

    const event = await Event.findByIdAndUpdate(
      id,
      { ...data, startDate, endDate },
      { new: true, runValidators: true }
    ).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event updated successfully.",
      event: {
        ...event,
        _id: event._id.toString(),
        createdBy: event.createdBy.toString(),
      },
    });
  } catch (error) {
    console.error("Update event error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update event." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
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
        { success: false, message: "Only a superadmin can delete events." },
        { status: 403 }
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

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully.",
    });
  } catch (error) {
    console.error("Delete event error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to delete event." },
      { status: 500 }
    );
  }
}
