"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

interface TemplateItem {
  _id: string;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: "draft" | "published";
  fields: unknown[];
  createdAt?: string;
}
interface ParticipantItem {
  _id: string;
  certificateId: string;
  participantName: string;
  email?: string;
  status: "active" | "inactive";
  data?: Record<string, unknown>;
}
interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
}
interface EventItem {
  _id: string;
  name: string;
}
interface CertificateStats {
  generatedCount: number;
  downloadedCount: number;
  totalDownloads: number;
  generatedParticipantIds: string[];
}
type GenerationMode = "single" | "selected" | "all";
const MAX_PARTICIPANTS = 500;
const PAGE_SIZE = 10;

export default function CertificatesPage() {
  const params = useParams<{ id: string; categoryId: string }>();
  const eventId = params.id;
  const categoryId = params.categoryId;
  const [event, setEvent] = useState<EventItem | null>(null);
  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [stats, setStats] = useState<CertificateStats>({
    generatedCount: 0,
    downloadedCount: 0,
    totalDownloads: 0,
    generatedParticipantIds: [],
  });
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode | null>(
    null,
  );
  const [generatingParticipantId, setGeneratingParticipantId] = useState("");

  const fetchStats = useCallback(async () => {
    const response = await fetch(
      `/api/events/${eventId}/categories/${categoryId}/certificates/generate`,
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(
        result.message || "Unable to load certificate statistics.",
      );
    setStats(result.stats);
  }, [eventId, categoryId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [
        eventResponse,
        categoriesResponse,
        templatesResponse,
        participantsResponse,
      ] = await Promise.all([
        fetch(`/api/events/${eventId}`, { cache: "no-store" }),
        fetch(`/api/events/${eventId}/categories`, { cache: "no-store" }),
        fetch(`/api/events/${eventId}/categories/${categoryId}/templates`, {
          cache: "no-store",
        }),
        fetch(
          `/api/events/${eventId}/categories/${categoryId}/participants?page=1&limit=${MAX_PARTICIPANTS}&status=active`,
          { cache: "no-store" },
        ),
      ]);
      const [
        eventResult,
        categoriesResult,
        templatesResult,
        participantsResult,
      ] = await Promise.all([
        eventResponse.json(),
        categoriesResponse.json(),
        templatesResponse.json(),
        participantsResponse.json(),
      ]);
      if (!eventResponse.ok || !eventResult.success)
        throw new Error(eventResult.message || "Unable to load event.");
      if (!categoriesResponse.ok || !categoriesResult.success)
        throw new Error(
          categoriesResult.message || "Unable to load categories.",
        );
      if (!templatesResponse.ok || !templatesResult.success)
        throw new Error(templatesResult.message || "Unable to load templates.");
      if (!participantsResponse.ok || !participantsResult.success)
        throw new Error(
          participantsResult.message || "Unable to load participants.",
        );
      const foundCategory = (categoriesResult.categories || []).find(
        (item: CategoryItem) => item._id === categoryId,
      );
      if (!foundCategory) throw new Error("Category not found for this event.");
      const publishedTemplates: TemplateItem[] = (
        templatesResult.templates || []
      ).filter(
        (item: TemplateItem) =>
          item.status === "published" && item.fields?.length > 0,
      );
      setEvent(eventResult.event);
      setCategory(foundCategory);
      setTemplates(publishedTemplates);
      setParticipants(participantsResult.participants || []);
      setSelectedTemplate((current) =>
        publishedTemplates.some((item) => item._id === current)
          ? current
          : publishedTemplates[0]?._id || "",
      );
      setSelectedParticipants([]);
      setPage(1);
      await fetchStats();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load certificate management.",
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, categoryId, fetchStats]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter((p) =>
      [p.participantName, p.certificateId, p.email || ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [participants, search]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleParticipants = filteredParticipants.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedTemplateItem = templates.find(
    (template) => template._id === selectedTemplate,
  );
  const allVisibleSelected =
    visibleParticipants.length > 0 &&
    visibleParticipants.every((p) => selectedParticipants.includes(p._id));

  const toggleParticipant = (id: string) =>
    setSelectedParticipants((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : previous.length >= MAX_PARTICIPANTS
          ? previous
          : [...previous, id],
    );
  const toggleVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleParticipants.map((p) => p._id));
      setSelectedParticipants((previous) =>
        previous.filter((id) => !visibleIds.has(id)),
      );
    } else {
      setSelectedParticipants((previous) =>
        Array.from(
          new Set([...previous, ...visibleParticipants.map((p) => p._id)]),
        ).slice(0, MAX_PARTICIPANTS),
      );
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const generateCertificates = async (
    mode: GenerationMode,
    participantId?: string,
  ) => {
    if (!selectedTemplate) {
      setError("Please select a published certificate template first.");
      return;
    }
    const ids =
      mode === "single" && participantId
        ? [participantId]
        : mode === "selected"
          ? selectedParticipants
          : participants.map((p) => p._id);
    if (!ids.length) {
      setError("Please select at least one participant.");
      return;
    }
    if (ids.length > MAX_PARTICIPANTS) {
      setError(`You can generate a maximum of ${MAX_PARTICIPANTS} at a time.`);
      return;
    }
    if (
      !window.confirm(
        `Generate ${ids.length} certificate${ids.length === 1 ? "" : "s"} using "${selectedTemplateItem?.name}"?`,
      )
    )
      return;
    try {
      setGenerating(true);
      setGenerationMode(mode);
      setGeneratingParticipantId(participantId || "");
      setError("");
      setSuccess("");
      const body =
        mode === "single"
          ? { templateId: selectedTemplate, participantId: ids[0] }
          : { templateId: selectedTemplate, participantIds: ids };
      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/certificates/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Unable to generate certificates.");
      setSuccess(
        `${result.message} Certificates are saved. Use Download when you are ready to download them.`,
      );
      if (mode !== "single") setSelectedParticipants([]);
      await fetchStats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to generate certificates.",
      );
    } finally {
      setGenerating(false);
      setGenerationMode(null);
      setGeneratingParticipantId("");
    }
  };

  const downloadCertificates = async (participantIds?: string[]) => {
    if (downloading) return;
    try {
      setDownloading(true);
      setError("");
      setSuccess("");
      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/certificates/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            participantIds?.length ? { participantIds } : {},
          ),
        },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Unable to download certificates.");
      }
      const blob = await response.blob();
      if (!blob.size)
        throw new Error("The downloaded certificate file is empty.");
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/i);
      const isPdf = response.headers
        .get("Content-Type")
        ?.includes("application/pdf");
      const fallbackName =
        participantIds?.length === 1
          ? `certificate_${participantIds[0]}.pdf`
          : `${category?.slug || "category"}_certificates.zip`;
      downloadFile(blob, match?.[1] || fallbackName);
      const count = response.headers.get("X-Certificates-Downloaded") || "";
      setSuccess(
        isPdf
          ? "Individual certificate PDF downloaded successfully."
          : `ZIP download prepared for ${count || "the selected"} certificate${count === "1" ? "" : "s"}.`,
      );
      await fetchStats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to download certificates.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) =>
    bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "Unknown size";
  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-orange-600" />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <Link
        href={`/admin/events/${eventId}/categories`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#927e72] transition hover:text-orange-600"
      >
        <ArrowLeft size={17} />
        Back to Categories
      </Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-orange-600">
            Certificate Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            Generate Certificates
          </h1>
          <p className="mt-2 text-sm text-[#927e72]">
            {event?.name || "Event"} · {category?.name || "Category"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchData()}
          disabled={generating || downloading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7] disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <X size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Participants"
          value={participants.length}
          icon={<Users size={20} className="text-blue-600" />}
        />
        <StatCard
          label="Generated Badges"
          value={stats.generatedCount}
          icon={<Award size={20} className="text-orange-600" />}
        />
        <StatCard
          label="Downloaded Badges"
          value={stats.downloadedCount}
          icon={<Download size={20} className="text-emerald-600" />}
        />
        <StatCard
          label="Total Downloads"
          value={stats.totalDownloads}
          icon={<CheckCircle2 size={20} className="text-violet-600" />}
        />
      </div>

      <section className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <FileImage size={20} className="text-orange-600" />
              <h2 className="text-lg font-bold text-[#241000]">
                Select Certificate Template
              </h2>
            </div>
            <p className="mt-1 text-sm text-[#927e72]">
              Only published templates with configured fields can be used.
            </p>
          </div>
          <Link
            href={`/admin/events/${eventId}/categories/${categoryId}/templates`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            <FileText size={16} />
            Manage Templates
          </Link>
        </div>
        {templates.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#eadbd1] bg-[#fffaf7] px-5 py-10 text-center">
            <FileImage size={32} className="mx-auto text-orange-500" />
            <h3 className="mt-3 font-semibold text-[#241000]">
              No published templates available
            </h3>
            <p className="mt-1 text-sm text-[#927e72]">
              Open a template, add your dynamic fields, and save the design to
              publish it.
            </p>
            <Link
              href={`/admin/events/${eventId}/categories/${categoryId}/templates`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c94b08]"
            >
              <FileText size={16} />
              Open Templates
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const active = selectedTemplate === template._id;
              return (
                <button
                  type="button"
                  key={template._id}
                  onClick={() => setSelectedTemplate(template._id)}
                  disabled={generating}
                  className={`relative rounded-xl border p-4 text-left transition ${active ? "border-orange-400 bg-orange-50/70 ring-2 ring-orange-100" : "border-[#eee2da] bg-white hover:border-orange-200 hover:bg-[#fffaf7]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                      <FileText size={20} />
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      Published
                    </span>
                  </div>
                  <h3 className="mt-4 truncate text-sm font-bold text-[#241000]">
                    {template.name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-[#927e72]">
                    {template.fileName}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#927e72]">
                    <span>{formatFileSize(template.fileSize)}</span>
                    <span>{template.fields?.length || 0} fields</span>
                  </div>
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-white">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {selectedTemplateItem && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#fffaf7] px-4 py-3 text-xs text-[#806e63]">
            <CheckCircle2 size={15} className="text-emerald-600" />
            Selected:{" "}
            <span className="font-semibold text-[#241000]">
              {selectedTemplateItem.name}
            </span>
            <span>·</span>
            {selectedTemplateItem.fields?.length || 0} dynamic fields
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white shadow-sm">
        <div className="border-b border-[#f3ebe6] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Users size={20} className="text-orange-600" />
                <h2 className="text-lg font-bold text-[#241000]">
                  Participants
                </h2>
              </div>
              <p className="mt-1 text-sm text-[#927e72]">
                Showing 10 participants per page. Generate and download are
                separate actions.
              </p>
            </div>
            <div className="relative w-full lg:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a18d81]"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email or ID..."
                className="h-11 w-full rounded-xl border border-[#eee2da] bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl bg-[#fffaf7] p-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleVisible}
                disabled={!visibleParticipants.length || generating}
                className="inline-flex items-center gap-2 rounded-lg border border-[#eadbd1] bg-white px-3 py-2 text-xs font-semibold text-[#604a3d] hover:border-orange-300 disabled:opacity-50"
              >
                {allVisibleSelected ? (
                  <CheckCircle2 size={15} className="text-orange-600" />
                ) : (
                  <span className="h-4 w-4 rounded border border-[#cdb9ab]" />
                )}
                {allVisibleSelected ? "Deselect This Page" : "Select This Page"}
              </button>
              <span className="text-xs text-[#927e72]">
                {selectedParticipants.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void generateCertificates("selected")}
                disabled={
                  generating ||
                  !selectedTemplate ||
                  !selectedParticipants.length
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                {generating && generationMode === "selected" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                Generate Selected
              </button>
              <button
                type="button"
                onClick={() => void generateCertificates("all")}
                disabled={
                  generating || !selectedTemplate || !participants.length
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#c94b08] disabled:opacity-50"
              >
                {generating && generationMode === "all" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Award size={15} />
                )}
                Generate All
              </button>
              <button
                type="button"
                onClick={() => void downloadCertificates()}
                disabled={downloading || stats.generatedCount === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                Download All Generated
              </button>
              {selectedParticipants.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    void downloadCertificates(selectedParticipants)
                  }
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#eadbd1] bg-white px-4 py-2.5 text-xs font-bold text-[#604a3d] hover:bg-[#fffaf7] disabled:opacity-50"
                >
                  <Download size={15} />
                  Download Selected
                </button>
              )}
            </div>
          </div>
        </div>
        {participants.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Users size={34} className="mx-auto text-[#cdb9ab]" />
            <h3 className="mt-3 font-semibold text-[#241000]">
              No active participants
            </h3>
            <p className="mt-1 text-sm text-[#927e72]">
              Add participants to this category before generating certificates.
            </p>
            <Link
              href={`/admin/events/${eventId}/categories/${categoryId}/participants`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c94b08]"
            >
              <Users size={16} />
              Manage Participants
            </Link>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[#927e72]">
            No participants match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead className="bg-[#fffaf7]">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-[#927e72]">
                  <th className="w-12 px-5 py-4">Select</th>
                  <th className="px-4 py-4">Participant</th>
                  <th className="px-4 py-4">Certificate ID</th>
                  <th className="px-4 py-4">Certificate</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3ebe6]">
                {visibleParticipants.map((participant) => {
                  const selected = selectedParticipants.includes(
                    participant._id,
                  );
                  const generated = stats.generatedParticipantIds.includes(
                    participant._id,
                  );
                  const isGeneratingThis =
                    generating &&
                    generationMode === "single" &&
                    generatingParticipantId === participant._id;
                  return (
                    <tr
                      key={participant._id}
                      className={`transition hover:bg-[#fffaf7] ${selected ? "bg-orange-50/40" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          aria-label={
                            selected
                              ? "Deselect participant"
                              : "Select participant"
                          }
                          onClick={() => toggleParticipant(participant._id)}
                          disabled={generating}
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${selected ? "border-orange-600 bg-orange-600 text-white" : "border-[#d8c8bd] bg-white text-transparent hover:border-orange-400"}`}
                        >
                          <Check size={13} />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-[#241000]">
                          {participant.participantName}
                        </p>
                        <p className="mt-1 text-xs text-[#927e72]">
                          {participant.email || "No email"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-[#fffaf7] px-2.5 py-1.5 font-mono text-xs text-[#604a3d]">
                          {participant.certificateId}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {generated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={12} />
                            Generated
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Not generated
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void generateCertificates(
                                "single",
                                participant._id,
                              )
                            }
                            disabled={generating || !selectedTemplate}
                            className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                          >
                            {isGeneratingThis ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Award size={14} />
                            )}
                            Generate
                          </button>
                          {generated && (
                            <button
                              type="button"
                              onClick={() =>
                                void downloadCertificates([participant._id])
                              }
                              disabled={downloading}
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <Download size={14} />
                              Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {participants.length > 0 && (
          <div className="flex flex-col justify-between gap-3 border-t border-[#f3ebe6] px-5 py-4 sm:flex-row sm:items-center">
            <span className="text-xs text-[#927e72]">
              Showing{" "}
              {filteredParticipants.length
                ? (currentPage - 1) * PAGE_SIZE + 1
                : 0}
              –{Math.min(currentPage * PAGE_SIZE, filteredParticipants.length)}{" "}
              of {filteredParticipants.length} participants
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[#eadbd1] bg-white px-3 py-2 text-xs font-semibold text-[#604a3d] disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              <span className="min-w-20 text-center text-xs font-semibold text-[#604a3d]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-[#eadbd1] bg-white px-3 py-2 text-xs font-semibold text-[#604a3d] disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
      {(generating || downloading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#f1e6df] bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <Loader2 size={27} className="animate-spin text-orange-600" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-[#241000]">
              {generating ? "Generating Certificates" : "Preparing Download"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#927e72]">
              {generating
                ? "Certificates are being generated and saved to storage. No download will start automatically."
                : "Please wait while your saved certificates are packaged."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#927e72]">{label}</span>
        {icon}
      </div>
      <p className="mt-4 text-2xl font-bold text-[#241000]">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
