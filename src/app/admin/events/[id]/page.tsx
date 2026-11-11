
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Building2,
  Pencil,
  Save,
  X,
  Trash2,
  Loader2,
  Layers3,
  Users,
  Award,
  Settings2,
  Plus,
  ExternalLink,
  RefreshCw,
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

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  fields?: unknown[];
}

interface CategorySummary extends CategoryItem {
  participantCount: number;
  generatedCount: number;
  downloadedCount: number;
  totalDownloads: number;
}

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);

  const categoriesUrl = `/admin/events/${id}/categories`;

  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const fetchOverview = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setOverviewLoading(true);
        setOverviewError("");
      }

      const categoriesResponse = await fetch(`/api/events/${id}/categories`, {
        cache: "no-store",
      });
      const categoriesResult = await categoriesResponse.json();

      if (!categoriesResponse.ok || !categoriesResult.success) {
        throw new Error(categoriesResult.message || "Unable to load event categories.");
      }

      const categories: CategoryItem[] = Array.isArray(categoriesResult.categories)
        ? categoriesResult.categories
        : [];

      const summaries = await Promise.all(
        categories.map(async (category): Promise<CategorySummary> => {
          const [participantsResult, certificatesResult] = await Promise.all([
            fetch(
              `/api/events/${id}/categories/${category._id}/participants?page=1&limit=1&status=active`,
              { cache: "no-store" }
            )
              .then(async (response) => ({
                ok: response.ok,
                data: await response.json(),
              }))
              .catch(() => ({ ok: false, data: null })),
            fetch(
              `/api/events/${id}/categories/${category._id}/certificates/generate`,
              { cache: "no-store" }
            )
              .then(async (response) => ({
                ok: response.ok,
                data: await response.json(),
              }))
              .catch(() => ({ ok: false, data: null })),
          ]);

          const pagination = participantsResult.data?.pagination;
          const participantCount = Number(
            pagination?.total ??
              pagination?.totalItems ??
              pagination?.totalCount ??
              participantsResult.data?.total ??
              0
          );

          const certificateStats =
            certificatesResult.data?.stats ?? certificatesResult.data ?? {};

          return {
            ...category,
            participantCount: Number.isFinite(participantCount) ? participantCount : 0,
            generatedCount: Number(certificateStats.generatedCount ?? 0),
            downloadedCount: Number(certificateStats.downloadedCount ?? 0),
            totalDownloads: Number(certificateStats.totalDownloads ?? 0),
          };
        })
      );

      setCategorySummaries(summaries);
    } catch (err) {
      setOverviewError(
        err instanceof Error ? err.message : "Unable to load event overview."
      );
    } finally {
      if (!silent) {
        setOverviewLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void fetchOverview();

    // Keep certificate and participant statistics current while this page is open.
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchOverview(true);
      }
    }, 15_000);

    const handleFocus = () => {
      void fetchOverview(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchOverview(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchOverview]);

  const totalParticipants = categorySummaries.reduce(
    (total, category) => total + category.participantCount,
    0
  );
  const totalGenerated = categorySummaries.reduce(
    (total, category) => total + category.generatedCount,
    0
  );
  const totalDownloaded = categorySummaries.reduce(
    (total, category) => total + category.downloadedCount,
    0
  );

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/events/${id}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load event.");
      }

      setEvent(result.event);
      setForm({
        ...result.event,
        startDate: result.event.startDate.slice(0, 10),
        endDate: result.event.endDate.slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load event.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const updateField = (key: keyof EventItem, value: string) => {
    setForm((previous) =>
      previous ? { ...previous, [key]: value } : previous
    );
  };

  const saveChanges = async () => {
    if (!form) return;

    setError("");
    setSuccess("");

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update event.");
      }

      setEvent(result.event);
      setForm({
        ...result.event,
        startDate: result.event.startDate.slice(0, 10),
        endDate: result.event.endDate.slice(0, 10),
      });

      setEditing(false);
      setSuccess("Event updated successfully.");
      void fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update event.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    if (!event) return;

    setEditing(false);
    setError("");
    setSuccess("");

    setForm({
      ...event,
      startDate: event.startDate.slice(0, 10),
      endDate: event.endDate.slice(0, 10),
    });
  };

  const deleteEvent = async () => {
    if (!event) return;

    const confirmed = window.confirm(
      `Delete "${event.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete event.");
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete event.");
      setDeleting(false);
    }
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 text-sm text-[#241000] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  const labelClass = "text-sm font-semibold text-[#604a3d]";

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={30} />
      </div>
    );
  }

  if (!event || !form) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
        <p className="font-semibold text-red-700">
          {error || "Event not found."}
        </p>
        <Link
          href="/admin/events"
          className="mt-4 inline-block text-sm font-semibold text-orange-600"
        >
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#927e72] transition hover:text-orange-600"
      >
        <ArrowLeft size={17} />
        Back to Events
      </Link>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-semibold text-orange-600">
            Event Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            {event.name}
          </h1>
          <p className="mt-2 text-sm text-[#927e72]">
            Manage event information, categories and certificate settings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <button
              onClick={() => {
                setEditing(true);
                setSuccess("");
                setError("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
            >
              <Pencil size={16} />
              Edit Event
            </button>
          ) : (
            <>
              <button
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 rounded-xl border border-[#eee2da] px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7]"
              >
                <X size={16} />
                Cancel
              </button>

              <button
                onClick={() => void saveChanges()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Event summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Categories",
            value: overviewLoading ? "…" : String(categorySummaries.length),
            description: "Configured for this event",
            icon: Layers3,
            href: categoriesUrl,
          },
          {
            label: "Participants",
            value: overviewLoading ? "…" : totalParticipants.toLocaleString("en-IN"),
            description: "Active participants across categories",
            icon: Users,
            href: categoriesUrl,
          },
          {
            label: "Certificates",
            value: overviewLoading ? "…" : totalGenerated.toLocaleString("en-IN"),
            description: `${totalDownloaded.toLocaleString("en-IN")} downloaded certificates`,
            icon: Award,
            href: categoriesUrl,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.label} href={item.href}>
              <div className="h-full rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#927e72]">{item.label}</span>
                  <Icon size={20} className="text-orange-600" />
                </div>
                <p className="mt-4 text-2xl font-bold tabular-nums text-[#241000]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[#927e72]">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {overviewError && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {overviewError}
        </div>
      )}

      {/* Event Information */}
      <section className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f3ebe6] px-6 py-5">
          <div>
            <h2 className="font-bold text-[#241000]">Event Information</h2>
            <p className="mt-1 text-xs text-[#927e72]">
              {editing
                ? "Update your event details."
                : "Your saved event details."}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              event.status === "published"
                ? "bg-emerald-50 text-emerald-700"
                : event.status === "draft"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {event.status}
          </span>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Event Name</label>
            {editing ? (
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            ) : (
              <p className="mt-2 text-sm font-medium text-[#241000]">
                {event.name}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Event URL Slug</label>
            {editing ? (
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) =>
                  updateField(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                  )
                }
              />
            ) : (
              <p className="mt-2 text-sm text-[#806e63]">
                /events/{event.slug}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            {editing ? (
              <textarea
                rows={4}
                maxLength={2000}
                className="mt-2 w-full rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 py-3 text-sm text-[#241000] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#806e63]">
                {event.description || "No description added."}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Start Date</label>
            {editing ? (
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
              />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#604a3d]">
                <CalendarDays size={16} className="text-orange-600" />
                {formatDate(event.startDate)}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>End Date</label>
            {editing ? (
              <input
                type="date"
                min={form.startDate}
                className={inputClass}
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
              />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#604a3d]">
                <CalendarDays size={16} className="text-orange-600" />
                {formatDate(event.endDate)}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Venue</label>
            {editing ? (
              <input
                className={inputClass}
                value={form.venue}
                onChange={(e) => updateField("venue", e.target.value)}
              />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#604a3d]">
                <MapPin size={16} className="text-orange-600" />
                {event.venue}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>City</label>
            {editing ? (
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            ) : (
              <p className="mt-2 text-sm text-[#604a3d]">{event.city}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Organizer</label>
            {editing ? (
              <input
                className={inputClass}
                value={form.organizer}
                onChange={(e) => updateField("organizer", e.target.value)}
              />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#604a3d]">
                <Building2 size={16} className="text-orange-600" />
                {event.organizer}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Status</label>
            {editing ? (
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value as EventStatus)
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <p className="mt-2 text-sm capitalize text-[#604a3d]">
                {event.status}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Layers3 size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#241000]">Event Categories</h2>
              <p className="mt-1 text-xs text-[#927e72]">
                Categories, participant records and certificate progress for this event.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchOverview()}
              disabled={overviewLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7] disabled:opacity-60"
            >
              <RefreshCw size={16} className={overviewLoading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href={categoriesUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
            >
              <Plus size={17} />
              Manage Categories
            </Link>
          </div>
        </div>

        {overviewLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-[#927e72]">
            <Loader2 size={19} className="animate-spin text-orange-600" />
            Loading categories and event statistics…
          </div>
        ) : categorySummaries.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#eadbd1] bg-[#fffaf7] px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Settings2 size={23} className="text-orange-500" />
            </div>
            <p className="mt-4 text-sm font-semibold text-[#49372c]">
              No categories created yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#927e72]">
              Create categories for participants, speakers, faculty, awardees and other certificate types.
            </p>
            <Link
              href={categoriesUrl}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
            >
              Create your first category
              <ExternalLink size={14} />
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {categorySummaries.map((category) => (
              <article
                key={category._id}
                className="rounded-xl border border-[#f1e6df] bg-[#fffdfb] p-5 transition hover:border-orange-200"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[#241000]">{category.name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          category.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#927e72]">
                      /{category.slug}
                    </p>
                    {category.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#806e63]">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-[#927e72]">Participants</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-[#241000]">
                      {category.participantCount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-[#927e72]">Generated</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-[#241000]">
                      {category.generatedCount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-[#927e72]">Downloaded</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-[#241000]">
                      {category.downloadedCount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f1e6df] pt-4">
                  <Link
                    href={`${categoriesUrl}/${category._id}/participants`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#eee2da] bg-white px-3 py-2 text-xs font-semibold text-[#604a3d] transition hover:border-orange-200 hover:text-orange-700"
                  >
                    <Users size={14} /> Participants
                  </Link>
                  <Link
                    href={`${categoriesUrl}/${category._id}/certificates`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#eee2da] bg-white px-3 py-2 text-xs font-semibold text-[#604a3d] transition hover:border-orange-200 hover:text-orange-700"
                  >
                    <Award size={14} /> Certificates
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Delete Event */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-red-100 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-red-700">
            Delete this event
          </h3>
          <p className="mt-1 text-xs text-[#927e72]">
            Only a superadmin can permanently delete an event.
          </p>
        </div>

        <button
          onClick={() => void deleteEvent()}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          Delete Event
        </button>
      </div>
    </div>
  );
}
