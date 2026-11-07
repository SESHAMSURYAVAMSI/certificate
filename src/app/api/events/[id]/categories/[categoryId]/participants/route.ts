
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import Category from "@/models/Category";
import Participant from "@/models/Participant";


type RouteParams = {
  params: Promise<{
    id: string;
    categoryId: string;
  }>;
};

type CategoryField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

function createCertificateId() {
  return `CERT-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function getFieldValue(
  data: Record<string, unknown>,
  field: CategoryField
) {
  const value = data[field.key];
  return value === undefined || value === null ? "" : String(value).trim();
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
      message:
        "A required participant name field is missing. Add a name field to this category first.",
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

export async function GET(request: NextRequest, context: RouteParams) {
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

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";

    const filter: Record<string, unknown> = {
      eventId: id,
      categoryId,
    };

    if (status === "active" || status === "inactive") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { participantName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { certificateId: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Participant.countDocuments(filter);

    const participants = await Participant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get participants error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load participants." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
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

    const category = await Category.findOne({
      _id: categoryId,
      eventId: id,
      isActive: true,
    }).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Active category not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const fields = (category.fields || []) as CategoryField[];

    if (!findNameField(fields)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please add a participant name field to this category before adding participants.",
        },
        { status: 400 }
      );
    }

    // Single participant
    if (body.data) {
      const result = validateParticipantData(body.data, fields);

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }

      if (result.normalizedEmail) {
        const existing = await Participant.findOne({
          eventId: id,
          categoryId,
          normalizedEmail: result.normalizedEmail,
        }).lean();

        if (existing) {
          return NextResponse.json(
            {
              success: false,
              message: "A participant with this email already exists.",
            },
            { status: 409 }
          );
        }
      }

      const participant = await Participant.create({
        eventId: id,
        categoryId,
        certificateId: createCertificateId(),
        participantName: result.participantName,
        email: result.email,
        normalizedEmail: result.normalizedEmail,
        data: result.data,
        createdBy: admin.adminId,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Participant added successfully.",
          participant,
        },
        { status: 201 }
      );
    }

    // Bulk import
    if (Array.isArray(body.participants)) {
      if (body.participants.length === 0) {
        return NextResponse.json(
          { success: false, message: "No participant rows provided." },
          { status: 400 }
        );
      }

      if (body.participants.length > 5000) {
        return NextResponse.json(
          {
            success: false,
            message: "Import is limited to 5,000 rows at a time.",
          },
          { status: 400 }
        );
      }

      const createdDocuments = [];
      const skipped: {
        row: number;
        name: string;
        reason: string;
      }[] = [];

      const seenEmails = new Set<string>();

      for (let index = 0; index < body.participants.length; index++) {
        const result = validateParticipantData(
          body.participants[index],
          fields
        );

        const row = index + 1;

        if (!result.success) {
          skipped.push({
            row,
            name: "",
            reason: result.message,
          });
          continue;
        }

        if (
          result.normalizedEmail &&
          seenEmails.has(result.normalizedEmail)
        ) {
          skipped.push({
            row,
            name: result.participantName,
            reason: "Duplicate email in this import file.",
          });
          continue;
        }

        if (result.normalizedEmail) {
          seenEmails.add(result.normalizedEmail);
        }

        createdDocuments.push({
          eventId: new mongoose.Types.ObjectId(id),
          categoryId: new mongoose.Types.ObjectId(categoryId),
          certificateId: createCertificateId(),
          participantName: result.participantName,
          email: result.email,
          normalizedEmail: result.normalizedEmail,
          data: result.data,
          createdBy: admin.adminId,
        });
      }

      let created = 0;

      if (createdDocuments.length > 0) {
        const emails = createdDocuments
          .map((item) => item.normalizedEmail)
          .filter((email): email is string => Boolean(email));

        const existing = emails.length
          ? await Participant.find({
              eventId: id,
              categoryId,
              normalizedEmail: { $in: emails },
            })
              .select("normalizedEmail")
              .lean()
          : [];

        const existingEmails = new Set(
          existing.map((item) => item.normalizedEmail)
        );

        const finalDocuments = createdDocuments.filter((item, index) => {
          if (
            item.normalizedEmail &&
            existingEmails.has(item.normalizedEmail)
          ) {
            skipped.push({
              row: index + 1,
              name: item.participantName,
              reason: "Email already exists in this category.",
            });
            return false;
          }

          return true;
        });

        if (finalDocuments.length > 0) {
          const inserted = await Participant.insertMany(finalDocuments, {
            ordered: false,
          });
          created = inserted.length;
        }
      }

      return NextResponse.json({
        success: true,
        message: "Participant import completed.",
        summary: {
          total: body.participants.length,
          created,
          skipped: skipped.length,
        },
        skipped,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Send either participant data or a participants array.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Create participants error:", error);

    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A participant with this email or certificate ID already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to save participants." },
      { status: 500 }
    );
  }
}
