
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  CalendarDays,
  MapPin,
  Users,
  Award,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  CalendarCheck,
  Clock3,
  Archive,
} from "lucide-react";

type EventStatus = "draft" | "published" | "archived";

interface EventItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  organizer: string;
  status: EventStatus;
}

type FilterType = "all" | EventStatus;

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/events", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load events.");
      }

      setEvents(result.events);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const query = search.toLowerCase();

      const matchesSearch =
        event.name.toLowerCase().includes(query) ||
        event.slug.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" || event.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [events, search, filter]);

  const stats = [
    {
      label: "Total Events",
      value: events.length,
      icon: CalendarDays,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Published",
      value: events.filter((event) => event.status === "published").length,
      icon: CalendarCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Drafts",
      value: events.filter((event) => event.status === "draft").length,
      icon: Clock3,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Archived",
      value: events.filter((event) => event.status === "archived").length,
      icon: Archive,
      color: "bg-stone-100 text-stone-600",
    },
  ];

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const statusStyles: Record<EventStatus, string> = {
    published: "bg-emerald-50 text-emerald-700",
    draft: "bg-amber-50 text-amber-700",
    archived: "bg-stone-100 text-stone-600",
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-600">
            <CalendarDays size={16} />
            Event Management
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            Your Events
          </h1>

          <p className="mt-2 text-sm text-[#8b776b]">
            Create and manage your events, categories and certificates.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c94b08]"
        >
          <Plus size={18} />
          Create Event
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#8b776b]">
                  {stat.label}
                </p>
                <div className={`rounded-xl p-2.5 ${stat.color}`}>
                  <Icon size={19} />
                </div>
              </div>

              <p className="mt-4 text-3xl font-bold text-[#241000]">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Events section */}
      <section className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#f3ebe6] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#241000]">
              All Events
            </h2>
            <p className="mt-1 text-sm text-[#9a877c]">
              {filteredEvents.length} events found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a28e82]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="h-11 w-full rounded-xl border border-[#eee2da] bg-[#fffaf7] pl-10 pr-4 text-sm text-[#241000] outline-none transition placeholder:text-[#b4a399] focus:border-orange-400 focus:ring-2 focus:ring-orange-100 sm:w-64"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="h-11 rounded-xl border border-[#eee2da] bg-[#fffaf7] px-4 text-sm text-[#49372c] outline-none focus:border-orange-400"
            >
              <option value="all">All Events</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>

            <button
              onClick={() => void fetchEvents()}
              disabled={loading}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#eee2da] px-4 text-sm font-medium text-[#604a3d] transition hover:bg-[#fff5ef] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
            {error}
            <button
              onClick={() => void fetchEvents()}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-[#fff5ef]"
              />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <CalendarDays size={30} />
            </div>

            <h3 className="text-lg font-bold text-[#241000]">
              {search || filter !== "all"
                ? "No matching events"
                : "No events created yet"}
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-[#9a877c]">
              {search || filter !== "all"
                ? "Try changing your search or filter."
                : "Create your first event to start managing categories, participants and certificates."}
            </p>

            {!search && filter === "all" && (
              <Link
                href="/admin/events/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
              >
                <Plus size={17} />
                Create Your First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#f5ede8]">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className="flex flex-col gap-5 p-5 transition hover:bg-[#fffdfb] lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600">
                    <CalendarDays size={25} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-[#241000]">
                        {event.name}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[event.status]}`}
                      >
                        {event.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[#a18d81]">
                      /{event.slug}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#806e63]">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-orange-500" />
                        {formatDate(event.startDate)} – {formatDate(event.endDate)}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-orange-500" />
                        {event.venue}, {event.city}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#a18d81]">
                      Organizer: {event.organizer}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 lg:shrink-0">
                  <Link
                    href={`/admin/events/${event._id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#eee2da] px-3 py-2.5 text-xs font-semibold text-[#604a3d] transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <Eye size={15} />
                    View
                  </Link>

                  <Link
                    href={`/admin/events/${event._id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#eee2da] px-3 py-2.5 text-xs font-semibold text-[#604a3d] transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <Pencil size={15} />
                    Manage
                  </Link>

                  <button
                    type="button"
                    disabled
                    title="Event deletion will be enabled after the event management API is added."
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#eee2da] text-[#b7a79e] opacity-60"
                  >
                    <Trash2 size={15} />
                  </button>

                  <button
                    type="button"
                    title="More actions coming soon"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#eee2da] text-[#806e63] transition hover:bg-[#fff5ef]"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer note */}
      <div className="flex items-center gap-2 px-1 text-xs text-[#a18d81]">
        <Users size={14} />
        Categories, participants and certificate management will be available inside each event.
        <Award size={14} />
      </div>
    </div>
  );
}
