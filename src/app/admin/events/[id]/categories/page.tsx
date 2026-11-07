
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Layers3,
  Users,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  FileText,
  FileImage,
  CheckCircle2,
  Circle,
  UserRound,
  Award,
} from "lucide-react";

interface CategoryField {
  label: string;
  key: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  fields: CategoryField[];
  isActive: boolean;
  createdAt?: string;
}

interface EventItem {
  name: string;
}

export default function EventCategoriesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [eventResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/events/${eventId}`, { cache: "no-store" }),
        fetch(`/api/events/${eventId}/categories`, {
          cache: "no-store",
        }),
      ]);

      const eventResult = await eventResponse.json();
      const categoriesResult = await categoriesResponse.json();

      if (!eventResponse.ok || !eventResult.success) {
        throw new Error(eventResult.message || "Unable to load event.");
      }

      if (!categoriesResponse.ok || !categoriesResult.success) {
        throw new Error(
          categoriesResult.message || "Unable to load categories."
        );
      }

      setEvent(eventResult.event);
      setCategories(categoriesResult.categories || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load categories."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const deleteCategory = async (category: CategoryItem) => {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(category._id);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/categories/${category._id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete category.");
      }

      setCategories((previous) =>
        previous.filter((item) => item._id !== category._id)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete category."
      );
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <Link
        href={`/admin/events/${eventId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#927e72] transition hover:text-orange-600"
      >
        <ArrowLeft size={17} />
        Back to Event
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-orange-600">
            Event Configuration
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            Categories
          </h1>
          <p className="mt-2 text-sm text-[#927e72]">
            {event?.name || "Manage your event"} · Configure participant
            categories, templates and certificates.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link
            href={`/admin/events/${eventId}/categories/new`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
          >
            <Plus size={17} />
            Add Category
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">Total Categories</span>
            <Layers3 size={20} className="text-orange-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {categories.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">Active Categories</span>
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {categories.filter((item) => item.isActive).length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">Participant Fields</span>
            <Users size={20} className="text-orange-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {categories.reduce(
              (total, item) => total + (item.fields?.length || 0),
              0
            )}
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#eadbd1] bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
            <Layers3 size={30} className="text-orange-600" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-[#241000]">
            No categories yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#927e72]">
            Create categories such as Speakers, Delegates, Faculty or Awardees.
            Each category can have its own participant fields and certificate
            design.
          </p>
          <Link
            href={`/admin/events/${eventId}/categories/new`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
          >
            <Plus size={17} />
            Create First Category
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article
              key={category._id}
              className="flex flex-col rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                  <Layers3 size={21} className="text-orange-600" />
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                    category.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {category.isActive ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Circle size={12} />
                  )}
                  {category.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold text-[#241000]">
                {category.name}
              </h3>

              <p className="mt-1 text-xs text-[#a18d81]">
                /{category.slug}
              </p>

              <p className="mt-3 min-h-10 text-sm leading-5 text-[#806e63]">
                {category.description || "No description provided."}
              </p>

              <div className="mt-5 flex items-center gap-4 border-y border-[#f3ebe6] py-4">
                <div className="flex items-center gap-2 text-sm text-[#604a3d]">
                  <FileText size={16} className="text-orange-500" />
                  <span className="font-semibold">
                    {category.fields?.length || 0}
                  </span>
                  <span className="text-xs text-[#927e72]">Fields</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#927e72]">
                  <Users size={15} />
                  Participant data
                </div>
              </div>

              {category.fields?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {category.fields.slice(0, 4).map((field) => (
                    <span
                      key={field.key}
                      className="rounded-lg bg-[#fffaf7] px-2.5 py-1.5 text-[11px] font-medium text-[#806e63]"
                    >
                      {field.label}
                    </span>
                  ))}
                  {category.fields.length > 4 && (
                    <span className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-[11px] font-semibold text-orange-700">
                      +{category.fields.length - 4} more
                    </span>
                  )}
                </div>
              )}

              <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                <Link
                  href={`/admin/events/${eventId}/categories/${category._id}/templates`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                >
                  <FileImage size={15} />
                  Templates
                </Link>

                <Link
                  href={`/admin/events/${eventId}/categories/${category._id}/participants`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <UserRound size={15} />
                  Participants
                </Link>

                <Link
                  href={`/admin/events/${eventId}/categories/${category._id}/certificates`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Award size={15} />
                  Certificates
                </Link>

                <Link
                  href={`/admin/events/${eventId}/categories/${category._id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eee2da] px-3 py-2.5 text-xs font-semibold text-[#604a3d] transition hover:bg-[#fffaf7]"
                >
                  <Pencil size={15} />
                  Edit
                </Link>

                <button
                  type="button"
                  onClick={() => void deleteCategory(category)}
                  disabled={deletingId === category._id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Delete category"
                >
                  {deletingId === category._id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
