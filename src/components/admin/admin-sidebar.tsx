
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Tags,
  Palette,
  Users,
  Award,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Templates", href: "/admin/templates", icon: Palette },
  { label: "Participants", href: "/admin/participants", icon: Users },
  { label: "Certificates", href: "/admin/certificates", icon: Award },
  { label: "Download History", href: "/admin/downloads", icon: History },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  adminEmail: string;
  adminRole: string;
}

export default function AdminSidebar({
  adminEmail,
  adminRole,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/admin-login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-orange-100 bg-white px-4 py-3 md:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold">
          <span className="rounded-lg bg-[#EA580C] p-2 text-white">
            <Award size={20} />
          </span>
          Certificate Studio
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 hover:bg-orange-50"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-orange-100 bg-white transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-stone-100 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-500/20">
            <Award size={25} />
          </div>

          <div>
            <h2 className="font-bold tracking-tight text-[#241000]">
              Certificate Studio
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-[2px] text-orange-600">
              Administration
            </p>
          </div>
        </div>

        <div className="px-4 pb-2 pt-7">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[1.8px] text-stone-400">
            Workspace
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                pathname.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${
                  active
                    ? "bg-orange-50 text-[#EA580C]"
                    : "text-stone-500 hover:bg-[#fffaf7] hover:text-[#241000]"
                }`}
              >
                <Icon size={18} />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#fffaf7] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#EA580C]">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#241000]">
                {adminEmail}
              </p>
              <p className="text-[10px] capitalize text-stone-400">
                {adminRole}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
