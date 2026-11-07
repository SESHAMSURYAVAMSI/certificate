
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  Layers3,
  Pencil,
  CheckCircle2,
  Clock3,
} from "lucide-react";

interface TemplateItem {
  _id: string;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fields: unknown[];
  status: "draft" | "published";
  createdAt: string;
}

interface CategoryItem {
  name: string;
}

export default function CertificateTemplatesPage() {
  const params = useParams<{
    id: string;
    categoryId: string;
  }>();

  const eventId = params.id;
  const categoryId = params.categoryId;

  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = `/api/events/${eventId}/categories/${categoryId}/templates`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [categoryResponse, templatesResponse] = await Promise.all([
        fetch(`/api/events/${eventId}/categories`, {
          cache: "no-store",
        }),
        fetch(apiUrl, { cache: "no-store" }),
      ]);

      const categoryResult = await categoryResponse.json();
      const templatesResult = await templatesResponse.json();

      if (!categoryResponse.ok || !categoryResult.success) {
        throw new Error(
          categoryResult.message || "Unable to load category."
        );
      }

      if (!templatesResponse.ok || !templatesResult.success) {
        throw new Error(
          templatesResult.message || "Unable to load templates."
        );
      }

      const foundCategory = categoryResult.categories.find(
        (item: CategoryItem & { _id: string }) =>
          item._id === categoryId
      );

      if (!foundCategory) {
        throw new Error("Category not found.");
      }

      setCategory(foundCategory);
      setTemplates(templatesResult.templates || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load templates."
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl, categoryId, eventId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const uploadTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !file) {
      setError("Enter a template name and select a certificate file.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("file", file);

    try {
      setUploading(true);

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Upload failed.");
      }

      setName("");
      setFile(null);

      const fileInput = document.getElementById(
        "certificate-file"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      setSuccess("Certificate template uploaded successfully.");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
        href={`/admin/events/${eventId}/categories`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#927e72] hover:text-orange-600"
      >
        <ArrowLeft size={17} />
        Back to Categories
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-orange-600">
            Certificate Configuration
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            Certificate Templates
          </h1>
          <p className="mt-2 text-sm text-[#927e72]">
            {category?.name} · Upload and design certificate templates.
          </p>
        </div>

        <button
          onClick={() => void fetchData()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] hover:bg-[#fffaf7]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

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

      {/* Upload */}
      <section className="rounded-2xl border border-[#f1e6df] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
            <Upload size={21} className="text-orange-600" />
          </div>
          <div>
            <h2 className="font-bold text-[#241000]">
              Upload Certificate Design
            </h2>
            <p className="mt-1 text-xs text-[#927e72]">
              Upload your original certificate background.
            </p>
          </div>
        </div>

        <form onSubmit={uploadTemplate} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-[#604a3d]">
              Template Name *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. KSOGA 2026 Workshop Certificate"
              className="mt-2 h-11 w-full rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 text-sm text-[#241000] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#604a3d]">
              Certificate File *
            </label>

            <label
              htmlFor="certificate-file"
              className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#eadbd1] bg-[#fffaf7] px-5 py-9 text-center transition hover:border-orange-300"
            >
              <Upload size={27} className="text-orange-600" />
              <span className="mt-3 text-sm font-semibold text-[#49372c]">
                {file ? file.name : "Choose a certificate file"}
              </span>
              <span className="mt-1 text-xs text-[#927e72]">
                PDF, PNG or JPEG · Maximum 20 MB
              </span>
              <input
                id="certificate-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08] disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Upload size={17} />
              )}
              {uploading ? "Uploading..." : "Upload Template"}
            </button>
          </div>
        </form>
      </section>

      {/* Templates */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#241000]">
              Uploaded Templates
            </h2>
            <p className="mt-1 text-xs text-[#927e72]">
              {templates.length} template{templates.length === 1 ? "" : "s"}{" "}
              uploaded
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#eadbd1] bg-white px-6 py-14 text-center">
            <Layers3 size={32} className="mx-auto text-orange-500" />
            <h3 className="mt-4 font-bold text-[#241000]">
              No templates uploaded
            </h3>
            <p className="mt-1 text-sm text-[#927e72]">
              Upload your first certificate design above.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template._id}
                className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white shadow-sm"
              >
                <div className="flex aspect-[16/9] items-center justify-center bg-[#fffaf7]">
                  {template.mimeType === "application/pdf" ? (
                    <FileText size={48} className="text-orange-500" />
                  ) : (
                    <FileImage size={48} className="text-orange-500" />
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-[#241000]">
                      {template.name}
                    </h3>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                        template.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>

                  <p className="mt-2 truncate text-xs text-[#927e72]">
                    {template.fileName}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs text-[#927e72]">
                    <span>{formatSize(template.fileSize)}</span>
                    <span className="inline-flex items-center gap-1">
                      {template.status === "published" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Clock3 size={13} />
                      )}
                      {template.fields?.length || 0} fields
                    </span>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/admin/events/${eventId}/categories/${categoryId}/templates/${template._id}/design`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
                    >
                      <Pencil size={15} />
                      Open Designer
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
