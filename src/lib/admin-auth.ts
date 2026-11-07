
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";

export async function getAuthenticatedAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (!token) return null;

    const session = await verifySessionToken(token);

    if (!session) return null;

    await connectDB();

    const admin = await Admin.findById(session.adminId)
      .select("_id email role isActive")
      .lean();

    if (!admin || !admin.isActive) return null;

    return {
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    };
  } catch (error) {
    console.error("Admin authorization error:", error);
    return null;
  }
}
