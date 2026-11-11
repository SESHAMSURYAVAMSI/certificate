import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Participant from "@/models/Participant";
import GeneratedCertificate from "@/models/GeneratedCertificate";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const lookupSchemaMessage = "Enter a valid registered email address.";

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: lookupSchemaMessage },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { success: false, message: lookupSchemaMessage },
        { status: 400 },
      );
    }

    await connectDB();

    const event = await Event.findOne({
      slug: slug.toLowerCase(),
      status: "published",
    })
      .select("_id")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "This event is not available." },
        { status: 404 },
      );
    }

    const participants = await Participant.find({
      eventId: event._id,
      status: "active",
      $or: [
        { normalizedEmail: email },
        { email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } },
      ],
    })
      .select("_id participantName")
      .lean();

    if (!participants.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No participant record was found for this email address in this event.",
        },
        { status: 404 },
      );
    }

    const participantIds = participants.map((participant) => participant._id);
    const participantNames = new Map(
      participants.map((participant) => [
        String(participant._id),
        participant.participantName,
      ]),
    );

    const certificates = await GeneratedCertificate.find({
      eventId: event._id,
      participantId: { $in: participantIds },
      status: "generated",
    })
      .select("_id certificateId fileName generatedAt categoryId participantId")
      .sort({ generatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      participantName:
        participants.length === 1 ? participants[0].participantName : "",
      certificates: certificates.map((certificate) => ({
        id: String(certificate._id),
        certificateId: certificate.certificateId,
        fileName: certificate.fileName,
        generatedAt: certificate.generatedAt,
        categoryId: String(certificate.categoryId),
        participantName:
          participantNames.get(String(certificate.participantId)) || "",
      })),
      message: certificates.length
        ? undefined
        : "No generated certificates are available for this email address yet.",
    });
  } catch (error) {
    console.error("Public certificate search error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to search certificates right now." },
      { status: 500 },
    );
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
