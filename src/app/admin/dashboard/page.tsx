
import {
  Award,
  CalendarDays,
  Users,
  Download,
  ArrowUpRight,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Total Events",
    value: "0",
    description: "Events created",
    icon: CalendarDays,
  },
  {
    label: "Categories",
    value: "0",
    description: "Across all events",
    icon: Award,
  },
  {
    label: "Participants",
    value: "0",
    description: "Registered participants",
    icon: Users,
  },
  {
    label: "Certificates",
    value: "0",
    description: "Generated certificates",
    icon: Download,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-orange-600">
            Administration / Overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Manage your events, participants and certificates from one place.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#c94b09]"
        >
          <Plus size={18} />
          Create New Event
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-orange-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                  <Icon size={21} />
                </div>
                <ArrowUpRight size={17} className="text-stone-300" />
              </div>

              <p className="mt-5 text-3xl font-bold text-[#241000]">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-700">
                {stat.label}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#241000] via-[#51220c] to-[#8e370b] p-7 text-white shadow-lg sm:p-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[2px] text-orange-300">
              <Sparkles size={15} />
              Get started
            </div>

            <h2 className="text-2xl font-bold sm:text-3xl">
              Your next event starts here.
            </h2>

            <p className="mt-3 text-sm leading-6 text-orange-100/70">
              Create your first event, organize certificate categories,
              upload designs and start generating professional certificates.
            </p>
          </div>

          <Link
            href="/admin/events/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Create your first event
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-100/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#241000]">
              Recent Events
            </h2>
            <p className="mt-1 text-xs text-stone-400">
              Your latest event activity
            </p>
          </div>
        </div>

        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
            <CalendarDays size={29} />
          </div>
          <h3 className="font-semibold text-[#241000]">
            No events created yet
          </h3>
          <p className="mt-2 max-w-sm text-sm text-stone-400">
            Your events will appear here once you create your first event.
          </p>
          <Link
            href="/admin/events/new"
            className="mt-5 text-sm font-semibold text-[#EA580C] hover:underline"
          >
            Create an event →
          </Link>
        </div>
      </section>
    </div>
  );
}
