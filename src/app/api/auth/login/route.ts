
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import { createSessionToken } from "@/lib/auth";
import Admin from "@/models/Admin";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { password } = parsed.data;

    await connectDB();

    const admin = await Admin.findOne({ email })
      .select("+passwordHash");

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
    });

    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
