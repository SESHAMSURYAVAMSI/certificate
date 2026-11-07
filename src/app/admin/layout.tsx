
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { verifySessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import AdminSidebar from "@/components/admin/admin-sidebar";

// Admin pages require runtime authentication.
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!token) {
    redirect("/admin-login");
  }

  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/admin-login");
  }

  await connectDB();

  const admin = await Admin.findById(session.adminId)
    .select("_id isActive")
    .lean();

  if (!admin || !admin.isActive) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] md:flex">
      <AdminSidebar
        adminEmail={session.email}
        adminRole={session.role}
      />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-9">
        {children}
      </main>
    </div>
  );
}
