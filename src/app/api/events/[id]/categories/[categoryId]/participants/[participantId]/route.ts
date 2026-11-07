
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Category from "@/models/Category";
import Participant from "@/models/Participant";

type RouteParams = {
  params: Promise<{
    id: string;
    categoryId: string;
    participantId: string;
  }>;
};

type CategoryField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

function getFieldValue(
  data: Record<string, unknown>,
  field: CategoryField
): string {
  const value = data[field.key];

  return value === undefined || value === null
    ? ""
    : String(value).trim();
}

function findNameField(fields: CategoryField[]) {
  return (
    fields.find((field) =>
      ["name", "fullname", "participantname"].includes(
        field.key.toLowerCase().replace(/[_\s-]/g, "")
      )
    ) ||
    fields.find((field) => field.label.toLowerCase().includes("name"))
  );
}

function findEmailField(fields: CategoryField[]) {
  return (
    fields.find((field) => field.type === "email") ||
    fields.find(
      (field) =>
        field.key.toLowerCase().includes("email") ||
        field.label.toLowerCase().includes("email")
    )
  );
}

function validateParticipantData(
  rawData: unknown,
  fields: CategoryField[]
) {
  if (
    !rawData ||
    typeof rawData !== "object" ||
    Array.isArray(rawData)
  ) {
    return {
      success: false as const,
      message: "Invalid participant data.",
    };
  }

  const data = rawData as Record<string, unknown>;

  for (const field of fields) {
    const value = getFieldValue(data, field);

    if (field.required && !value) {
      return {
        success: false as const,
        message: `${field.label} is required.`,
      };
    }

    if (field.type === "email" && value) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      if (!validEmail) {
        return {
          success: false as const,
          message: `Enter a valid ${field.label}.`,
        };
      }
    }

    if (field.type === "select" && value && field.options?.length) {
      if (!field.options.includes(value)) {
        return {
          success: false as const,
          message: `Invalid option for ${field.label}.`,
        };
      }
    }
  }

  const nameField = findNameField(fields);

  if (!nameField || !getFieldValue(data, nameField)) {
    return {
      success: false as const,
      message: "Participant name is required. Please configure a name field in this category.",
    };
  }

  const participantName = getFieldValue(data, nameField);
  const emailField = findEmailField(fields);
  const email = emailField ? getFieldValue(data, emailField) : "";

  return {
    success: true as const,
    data,
    participantName,
    email: email || undefined,
    normalizedEmail: email ? email.toLowerCase() : undefined,
  };
}

export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const { id, categoryId, participantId } = await context.params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(categoryId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event, category, or participant ID." },
        { status: 400 }
      );
    }

    const category = await Category.findOne({
      _id: categoryId,
      eventId: id,
    }).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    const participant = await Participant.findOne({
      _id: participantId,
      eventId: id,
      categoryId,
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Participant not found." },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Update participant's custom field data
    if (body.data !== undefined) {
      const fields = (category.fields || []) as CategoryField[];
      const result = validateParticipantData(body.data, fields);

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }

      if (result.normalizedEmail) {
        const duplicate = await Participant.findOne({
          _id: { $ne: participantId },
          eventId: id,
          categoryId,
          normalizedEmail: result.normalizedEmail,
        }).lean();

        if (duplicate) {
          return NextResponse.json(
            {
              success: false,
              message: "Another participant with this email already exists.",
            },
            { status: 409 }
          );
        }
      }

      participant.data = result.data;
      participant.participantName = result.participantName;
      participant.email = result.email;
      participant.normalizedEmail = result.normalizedEmail;
    }

    // Update participant status
    if (body.status !== undefined) {
      if (!["active", "inactive"].includes(body.status)) {
        return NextResponse.json(
          { success: false, message: "Invalid participant status." },
          { status: 400 }
        );
      }

      participant.status = body.status;
    }

    await participant.save();

    return NextResponse.json({
      success: true,
      message: "Participant updated successfully.",
      participant,
    });
  } catch (error) {
    console.error("Update participant error:", error);

    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A participant with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update participant." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const { id, categoryId, participantId } = await context.params;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(categoryId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid event, category, or participant ID." },
        { status: 400 }
      );
    }

    const participant = await Participant.findOneAndDelete({
      _id: participantId,
      eventId: id,
      categoryId,
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Participant not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Participant deleted successfully.",
    });
  } catch (error) {
    console.error("Delete participant error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete participant." },
      { status: 500 }
    );
  }
}
