
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
            value: "Manage categories",
            icon: Layers3,
            href: categoriesUrl,
          },
          {
            label: "Participants",
            value: "Coming next",
            icon: Users,
          },
          {
            label: "Certificates",
            value: "Coming next",
            icon: Award,
          },
        ].map((item) => {
          const Icon = item.icon;

          const content = (
            <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm transition hover:border-orange-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#927e72]">{item.label}</span>
                <Icon size={20} className="text-orange-600" />
              </div>
              <p className="mt-4 text-lg font-bold text-[#241000]">
                {item.value}
              </p>
            </div>
          );

          return item.href ? (
            <Link key={item.label} href={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.label}>{content}</div>
          );
        })}
      </div>

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
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <Layers3 size={20} className="text-orange-600" />
              </div>

              <div>
                <h2 className="font-bold text-[#241000]">
                  Event Categories
                </h2>
                <p className="mt-1 text-xs text-[#927e72]">
                  Configure participant fields and certificate designs.
                </p>
              </div>
            </div>
          </div>

          <Link
            href={categoriesUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
          >
            <Plus size={17} />
            Manage Categories
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-[#eadbd1] bg-[#fffaf7] px-5 py-9 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Settings2 size={23} className="text-orange-500" />
          </div>

          <p className="mt-4 text-sm font-semibold text-[#49372c]">
            Configure your event categories
          </p>

          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#927e72]">
            Create separate categories for participants, speakers, faculty,
            awardees and other certificate types. Each category can have its
            own custom fields.
          </p>

          <Link
            href={categoriesUrl}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700"
          >
            Open Category Management
            <ExternalLink size={14} />
          </Link>
        </div>
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
