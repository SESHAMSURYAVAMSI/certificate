
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Building2,
  FileText,
  Globe,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    startDate: "",
    endDate: "",
    venue: "",
    city: "",
    organizer: "",
    status: "draft",
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (name: string, value: string) => {
    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      if (name === "name" && !slugManuallyEdited) {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      return updated;
    });
  };

  const handleSubmit = async (status: "draft" | "published") => {
    setError("");

    if (
      !form.name.trim() ||
      !form.slug.trim() ||
      !form.startDate ||
      !form.endDate ||
      !form.venue.trim() ||
      !form.city.trim() ||
      !form.organizer.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create event.");
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "mt-2 h-12 w-full rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 text-sm text-[#241000] outline-none transition placeholder:text-[#b5a49a] focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  const labelClass = "text-sm font-semibold text-[#49372c]";

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      {/* Header */}
      <div>
        <Link
          href="/admin/events"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#927e72] transition hover:text-orange-600"
        >
          <ArrowLeft size={17} />
          Back to Events
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-600">
              <Sparkles size={16} />
              Event Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
              Create New Event
            </h1>

            <p className="mt-2 text-sm text-[#927e72]">
              Add your event information to get started.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-700">
            <Globe size={16} />
            Unique event URL will be generated
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white shadow-sm">
        <div className="border-b border-[#f3ebe6] px-6 py-5">
          <h2 className="font-bold text-[#241000]">Event Information</h2>
          <p className="mt-1 text-xs text-[#9a877c]">
            Fields marked with * are required.
          </p>
        </div>

        <div className="space-y-8 p-6">
          {/* Basic details */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <FileText size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#241000]">
                  Basic Details
                </h3>
                <p className="text-xs text-[#9a877c]">
                  General information about your event
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Event Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. International Medical Conference 2026"
                  className={inputClass}
                  maxLength={150}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Event URL Slug *
                </label>
                <div className="mt-2 flex overflow-hidden rounded-xl border border-[#eee2da] bg-[#fffdfb] focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                  <span className="flex items-center border-r border-[#eee2da] bg-[#faf4f0] px-3 text-xs text-[#927e72]">
                    /events/
                  </span>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      updateField(
                        "slug",
                        e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "")
                      );
                    }}
                    placeholder="international-conference-2026"
                    className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-[#241000] outline-none"
                  />
                </div>
                <p className="mt-2 text-xs text-[#a18d81]">
                  Automatically generated from the event name. You can edit it.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Event Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  placeholder="Describe your event..."
                  rows={4}
                  maxLength={2000}
                  className="mt-2 w-full resize-y rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 py-3 text-sm text-[#241000] outline-none transition placeholder:text-[#b5a49a] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-[#f3ebe6]" />

          {/* Dates */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <CalendarDays size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#241000]">
                  Event Schedule
                </h3>
                <p className="text-xs text-[#9a877c]">
                  Select your event dates
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    updateField("startDate", e.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  End Date *
                </label>
                <input
                  type="date"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) =>
                    updateField("endDate", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="border-t border-[#f3ebe6]" />

          {/* Venue */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                <MapPin size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#241000]">
                  Location & Organizer
                </h3>
                <p className="text-xs text-[#9a877c]">
                  Where the event takes place and who organizes it
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Venue *
                </label>
                <input
                  value={form.venue}
                  onChange={(e) => updateField("venue", e.target.value)}
                  placeholder="Convention Center"
                  className={inputClass}
                  maxLength={200}
                />
              </div>

              <div>
                <label className={labelClass}>
                  City *
                </label>
                <input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Hyderabad"
                  className={inputClass}
                  maxLength={100}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Organizer Name *
                </label>
                <div className="relative">
                  <Building2
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a18d81]"
                  />
                  <input
                    value={form.organizer}
                    onChange={(e) =>
                      updateField("organizer", e.target.value)
                    }
                    placeholder="Organization or institution name"
                    className={`${inputClass} pl-11`}
                    maxLength={150}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-[#f3ebe6]" />

          {/* Status */}
          <section>
            <h3 className="text-sm font-bold text-[#241000]">
              Publication Status
            </h3>
            <p className="mt-1 text-xs text-[#9a877c]">
              Choose whether to save as a draft or publish immediately.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, status: "draft" }))
                }
                className={`rounded-xl border p-4 text-left transition ${
                  form.status === "draft"
                    ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                    : "border-[#eee2da] hover:bg-[#fffaf7]"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-[#49372c]">
                  <Save size={17} className="text-orange-600" />
                  Save as Draft
                </div>
                <p className="mt-2 text-xs leading-5 text-[#927e72]">
                  Keep the event private while you prepare its categories and certificates.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, status: "published" }))
                }
                className={`rounded-xl border p-4 text-left transition ${
                  form.status === "published"
                    ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                    : "border-[#eee2da] hover:bg-[#fffaf7]"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-[#49372c]">
                  <Send size={17} className="text-orange-600" />
                  Publish Event
                </div>
                <p className="mt-2 text-xs leading-5 text-[#927e72]">
                  Mark the event as published. You can still manage its details.
                </p>
              </button>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#f3ebe6] pt-6 sm:flex-row">
            <Link
              href="/admin/events"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#eee2da] px-6 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7]"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                handleSubmit(form.status as "draft" | "published")
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-7 text-sm font-semibold text-white shadow-lg shadow-orange-100 transition hover:bg-[#c94b08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Creating Event...
                </>
              ) : form.status === "published" ? (
                <>
                  <Send size={17} />
                  Create & Publish Event
                </>
              ) : (
                <>
                  <Save size={17} />
                  Create Event
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
