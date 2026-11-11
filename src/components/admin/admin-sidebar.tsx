
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  ChevronRight,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  // { label: "Categories", href: "/admin/categories", icon: Tags },
  // { label: "Templates", href: "/admin/templates", icon: Palette },
  // { label: "Participants", href: "/admin/participants", icon: Users },
  // { label: "Certificates", href: "/admin/certificates", icon: Award },
  // { label: "Download History", href: "/admin/downloads", icon: History },
  // { label: "Settings", href: "/admin/settings", icon: Settings },
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
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      router.replace("/admin-login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-[64px] items-center justify-between border-b border-orange-100/80 bg-white/95 px-4 backdrop-blur-xl md:hidden">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-[#EA580C] text-white shadow-md shadow-orange-500/20">
            <Award size={20} strokeWidth={2.2} />
          </span>

          <span className="text-[15px] font-bold tracking-tight text-[#241000]">
            Certificate Studio
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((previous) => !previous)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-600 transition hover:bg-orange-50 hover:text-[#EA580C]"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#241000]/35 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[270px] flex-col border-r border-orange-100/80 bg-white shadow-[8px_0_30px_rgba(36,16,0,0.04)] transition-transform duration-300 ease-in-out md:sticky md:top-0 md:z-30 md:translate-x-0 md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-stone-100 px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-orange-500 to-[#EA580C] text-white shadow-lg shadow-orange-500/20">
            <Award size={25} strokeWidth={2.1} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-extrabold tracking-tight text-[#241000]">
              Certificate Studio
            </h2>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[2.2px] text-orange-600">
              Administration
            </p>
          </div>
        </div>

        {/* Navigation Label */}
        <div className="px-5 pb-3 pt-7">
          <p className="text-[10px] font-bold uppercase tracking-[1.7px] text-stone-400">
            Workspace
          </p>
        </div>

        {/* Navigation Links */}
        <nav
          aria-label="Admin navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 pb-4"
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-[44px] items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-[13px] transition-all duration-200 ${
                  active
                    ? "bg-orange-50 font-semibold text-[#EA580C]"
                    : "font-medium text-stone-500 hover:bg-[#fffaf7] hover:text-[#241000]"
                }`}
              >
                {active && (
                  <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#EA580C]" />
                )}

                <Icon
                  size={18}
                  strokeWidth={active ? 2.3 : 1.9}
                  className={`shrink-0 transition-colors ${
                    active
                      ? "text-[#EA580C]"
                      : "text-stone-400 group-hover:text-[#EA580C]"
                  }`}
                />

                <span className="flex-1 truncate">{item.label}</span>

                {active && (
                  <ChevronRight
                    size={15}
                    strokeWidth={2.3}
                    className="shrink-0 text-orange-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile and Logout */}
        <div className="shrink-0 border-t border-stone-100 bg-white p-4">
          <div className="mb-3 rounded-xl border border-orange-100/80 bg-[#fffaf7] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#EA580C]">
                <ShieldCheck size={19} strokeWidth={2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#241000]">
                  {adminEmail}
                </p>
                <p className="mt-1 text-[10px] font-medium capitalize text-stone-500">
                  {adminRole}
                </p>
              </div>

              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            </div>
          </div>

          {logoutError && (
            <p role="alert" className="mb-2 px-1 text-[11px] text-red-500">
              {logoutError}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-semibold text-red-500 transition-all duration-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} strokeWidth={2} />
            <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
          </button>

          <p className="mt-3 text-center text-[9px] font-medium tracking-wide text-stone-400">
            CERTIFICATE STUDIO · ADMIN PANEL
          </p>
        </div>
      </aside>
    </>
  );
}
