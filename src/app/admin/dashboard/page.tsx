"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  CalendarDays,
  Users,
  Download,
  ArrowUpRight,
  Plus,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock3,
  MapPin,
} from "lucide-react";

interface EventItem {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  city?: string;
  status?: "draft" | "published" | "archived";
  createdAt?: string;
}

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

interface DashboardStats {
  totalEvents: number;
  categories: number;
  participants: number;
  certificates: number;
}

interface RecentEvent extends EventItem {
  categoryCount: number;
  participantCount: number;
  certificateCount: number;
}

const EMPTY_STATS: DashboardStats = {
  totalEvents: 0,
  categories: 0,
  participants: 0,
  certificates: 0,
};

const POLL_INTERVAL = 30_000;

async function readJson(response: Response) {
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      result && typeof result === "object" && "message" in result
        ? String(result.message)
        : "Unable to load dashboard data.";
    throw new Error(message);
  }
  return result as Record<string, unknown>;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getEventStatus(event: EventItem) {
  if (event.status) return event.status;
  return "draft";
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError("");

      const eventsResponse = await fetch("/api/events", {
        cache: "no-store",
      });
      const eventsResult = await readJson(eventsResponse);
      const events = asArray<EventItem>(eventsResult.events);

      const eventDetails = await Promise.all(
        events.map(async (event) => {
          try {
            const categoriesResponse = await fetch(
              `/api/events/${event._id}/categories`,
              { cache: "no-store" }
            );
            const categoriesResult = await readJson(categoriesResponse);
            const categories = asArray<CategoryItem>(
              categoriesResult.categories
            );

            const categoryDetails = await Promise.all(
              categories.map(async (category) => {
                const [participantsResult, certificatesResult] =
                  await Promise.all([
                    fetch(
                      `/api/events/${event._id}/categories/${category._id}/participants?page=1&limit=1&status=all`,
                      { cache: "no-store" }
                    ).then(readJson),
                    fetch(
                      `/api/events/${event._id}/categories/${category._id}/certificates/generate`,
                      { cache: "no-store" }
                    ).then(readJson),
                  ]);

                const pagination =
                  participantsResult.pagination &&
                  typeof participantsResult.pagination === "object"
                    ? (participantsResult.pagination as Record<string, unknown>)
                    : {};

                return {
                  participantCount: asNumber(pagination.total),
                  certificateCount: asNumber(certificatesResult.generatedCount),
                };
              })
            );

            return {
              ...event,
              categoryCount: categories.length,
              participantCount: categoryDetails.reduce(
                (total, item) => total + item.participantCount,
                0
              ),
              certificateCount: categoryDetails.reduce(
                (total, item) => total + item.certificateCount,
                0
              ),
            } satisfies RecentEvent;
          } catch {
            return {
              ...event,
              categoryCount: 0,
              participantCount: 0,
              certificateCount: 0,
            } satisfies RecentEvent;
          }
        })
      );

      const nextStats: DashboardStats = {
        totalEvents: events.length,
        categories: eventDetails.reduce(
          (total, event) => total + event.categoryCount,
          0
        ),
        participants: eventDetails.reduce(
          (total, event) => total + event.participantCount,
          0
        ),
        certificates: eventDetails.reduce(
          (total, event) => total + event.certificateCount,
          0
        ),
      };

      eventDetails.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
        return dateB - dateA;
      });

      setStats(nextStats);
      setRecentEvents(eventDetails.slice(0, 5));
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchDashboard(true);
      }
    }, POLL_INTERVAL);

    const handleFocus = () => {
      void fetchDashboard(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchDashboard]);

  const statCards = useMemo(
    () => [
      {
        label: "Total Events",
        value: stats.totalEvents,
        description: "Events created",
        icon: CalendarDays,
      },
      {
        label: "Categories",
        value: stats.categories,
        description: "Across all events",
        icon: Award,
      },
      {
        label: "Participants",
        value: stats.participants,
        description: "Registered participants",
        icon: Users,
      },
      {
        label: "Certificates",
        value: stats.certificates,
        description: "Generated certificates",
        icon: Download,
      },
    ],
    [stats]
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-10">
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
          <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-400">
            <Clock3 size={13} />
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })} · Auto-refreshes every 30 seconds`
              : "Loading latest dashboard data..."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchDashboard(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#c94b09]"
          >
            <Plus size={18} />
            Create New Event
          </Link>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => void fetchDashboard(true)}
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
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

              <p className="mt-5 text-3xl font-bold tabular-nums text-[#241000]">
                {loading ? (
                  <span className="inline-block h-9 w-12 animate-pulse rounded-lg bg-orange-50" />
                ) : (
                  stat.value.toLocaleString("en-IN")
                )}
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-700">
                {stat.label}
              </p>
              <p className="mt-1 text-xs text-stone-400">{stat.description}</p>
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
              {stats.totalEvents > 0
                ? "Keep your events moving forward."
                : "Your next event starts here."}
            </h2>

            <p className="mt-3 text-sm leading-6 text-orange-100/70">
              Create events, organize certificate categories, upload designs
              and generate professional certificates from one place.
            </p>
          </div>

          <Link
            href="/admin/events/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Create New Event
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-orange-100/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-orange-50 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#241000]">Recent Events</h2>
            <p className="mt-1 text-xs text-stone-400">
              Your latest event activity
            </p>
          </div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA580C] hover:underline"
          >
            View all events <ArrowUpRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl bg-orange-50/70"
              />
            ))}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
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
        ) : (
          <div className="divide-y divide-orange-50">
            {recentEvents.map((event) => {
              const status = getEventStatus(event);

              return (
                <Link
                  key={event._id}
                  href={`/admin/events/${event._id}`}
                  className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-[#fffaf7] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-[#241000] group-hover:text-orange-700">
                        {event.name}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          status === "published"
                            ? "bg-emerald-50 text-emerald-700"
                            : status === "archived"
                              ? "bg-stone-100 text-stone-500"
                              : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={13} />
                        {formatDate(event.startDate)}
                        {event.endDate
                          ? ` – ${formatDate(event.endDate)}`
                          : ""}
                      </span>
                      {(event.venue || event.city) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} />
                          {[event.venue, event.city].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:min-w-[330px]">
                    <div className="rounded-xl bg-orange-50/70 px-3 py-2 text-center">
                      <p className="text-lg font-bold tabular-nums text-[#241000]">
                        {event.categoryCount}
                      </p>
                      <p className="text-[10px] font-medium text-stone-500">
                        Categories
                      </p>
                    </div>
                    <div className="rounded-xl bg-orange-50/70 px-3 py-2 text-center">
                      <p className="text-lg font-bold tabular-nums text-[#241000]">
                        {event.participantCount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] font-medium text-stone-500">
                        Participants
                      </p>
                    </div>
                    <div className="rounded-xl bg-orange-50/70 px-3 py-2 text-center">
                      <p className="text-lg font-bold tabular-nums text-[#241000]">
                        {event.certificateCount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] font-medium text-stone-500">
                        Certificates
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
