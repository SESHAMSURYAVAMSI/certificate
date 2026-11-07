
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
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

type GenerationMode = "single" | "selected" | "all";

const MAX_PARTICIPANTS = 500;

export default function CertificatesPage() {
  const params = useParams<{
    id: string;
    categoryId: string;
  }>();

  const eventId = params.id;
  const categoryId = params.categoryId;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generationMode, setGenerationMode] =
    useState<GenerationMode | null>(null);
  const [generatingParticipantId, setGeneratingParticipantId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [
        eventResponse,
        categoryResponse,
        templatesResponse,
        participantsResponse,
      ] = await Promise.all([
        fetch(`/api/events/${eventId}`, { cache: "no-store" }),
        fetch(`/api/events/${eventId}/categories/${categoryId}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/events/${eventId}/categories/${categoryId}/templates`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/events/${eventId}/categories/${categoryId}/participants?page=1&limit=${MAX_PARTICIPANTS}&status=active`,
          { cache: "no-store" }
        ),
      ]);

      const [
        eventResult,
        categoryResult,
        templatesResult,
        participantsResult,
      ] = await Promise.all([
        eventResponse.json(),
        categoryResponse.json(),
        templatesResponse.json(),
        participantsResponse.json(),
      ]);

      if (!eventResponse.ok || !eventResult.success) {
        throw new Error(eventResult.message || "Unable to load event.");
      }

      if (!categoryResponse.ok || !categoryResult.success) {
        throw new Error(categoryResult.message || "Unable to load category.");
      }

      if (!templatesResponse.ok || !templatesResult.success) {
        throw new Error(
          templatesResult.message || "Unable to load certificate templates."
        );
      }

      if (!participantsResponse.ok || !participantsResult.success) {
        throw new Error(
          participantsResult.message || "Unable to load participants."
        );
      }

      const templateList: TemplateItem[] = templatesResult.templates || [];
      const participantList: ParticipantItem[] =
        participantsResult.participants || [];

      setEvent(eventResult.event);
      setCategory(categoryResult.category);
      setTemplates(templateList);
      setParticipants(participantList);

      setSelectedTemplate((current) => {
        if (current && templateList.some((item) => item._id === current)) {
          return current;
        }

        return templateList[0]?._id || "";
      });

      setSelectedParticipants([]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load certificate management."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, categoryId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return participants;

    return participants.filter((participant) => {
      return (
        participant.participantName.toLowerCase().includes(query) ||
        participant.certificateId.toLowerCase().includes(query) ||
        participant.email?.toLowerCase().includes(query)
      );
    });
  }, [participants, search]);

  const selectedTemplateItem = templates.find(
    (template) => template._id === selectedTemplate
  );

  const allFilteredSelected =
    filteredParticipants.length > 0 &&
    filteredParticipants.every((participant) =>
      selectedParticipants.includes(participant._id)
    );

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants((previous) =>
      previous.includes(participantId)
        ? previous.filter((id) => id !== participantId)
        : [...previous, participantId]
    );
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(
        filteredParticipants.map((participant) => participant._id)
      );

      setSelectedParticipants((previous) =>
        previous.filter((id) => !filteredIds.has(id))
      );
      return;
    }

    setSelectedParticipants((previous) => {
      const combined = new Set(previous);

      filteredParticipants.forEach((participant) => {
        combined.add(participant._id);
      });

      return Array.from(combined).slice(0, MAX_PARTICIPANTS);
    });
  };

  const downloadZip = (blob: Blob, fallbackName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const generateCertificates = async (
    mode: GenerationMode,
    participantId?: string
  ) => {
    if (!selectedTemplate) {
      setError("Please select a certificate template first.");
      return;
    }

    let participantIds: string[] = [];

    if (mode === "single" && participantId) {
      participantIds = [participantId];
    } else if (mode === "selected") {
      participantIds = selectedParticipants;
    } else if (mode === "all") {
      participantIds = participants.map((participant) => participant._id);
    }

    if (participantIds.length === 0) {
      setError("Please select at least one participant.");
      return;
    }

    if (participantIds.length > MAX_PARTICIPANTS) {
      setError(`You can generate a maximum of ${MAX_PARTICIPANTS} at a time.`);
      return;
    }

    const confirmed = window.confirm(
      `Generate ${participantIds.length} certificate${
        participantIds.length === 1 ? "" : "s"
      } using "${selectedTemplateItem?.name}"?`
    );

    if (!confirmed) return;

    try {
      setGenerating(true);
      setGenerationMode(mode);
      setGeneratingParticipantId(participantId || "");
      setError("");
      setSuccess("");

      const requestBody =
        mode === "single"
          ? {
              templateId: selectedTemplate,
              participantId: participantIds[0],
            }
          : {
              templateId: selectedTemplate,
              participantIds,
            };

      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/certificates/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        let message = "Unable to generate certificates.";

        try {
          const result = await response.json();
          message = result.message || message;
        } catch {
          // Keep the fallback message if the response is not JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The generated ZIP file is empty.");
      }

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);

      const filename = filenameMatch?.[1]
        ? decodeURIComponent(filenameMatch[1])
        : `${category?.slug || "category"}_certificates.zip`;

      downloadZip(blob, filename);

      const generatedCount =
        response.headers.get("X-Certificates-Generated") ||
        String(participantIds.length);

      setSuccess(
        `Successfully generated ${generatedCount} certificate${
          Number(generatedCount) === 1 ? "" : "s"
        }. Your ZIP download has started.`
      );

      if (mode !== "single") {
        setSelectedParticipants([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating certificates."
      );
    } finally {
      setGenerating(false);
      setGenerationMode(null);
      setGeneratingParticipantId("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "Unknown size";

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-orange-600" />
      </div>
    );
  }

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
          disabled={generating}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">Active Participants</span>
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {participants.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">Available Templates</span>
            <FileImage size={20} className="text-orange-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {templates.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">Selected Participants</span>
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {selectedParticipants.length}
          </p>
        </div>
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
              Choose the design that will be used for certificate generation.
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
              No templates available
            </h3>
            <p className="mt-1 text-sm text-[#927e72]">
              Upload a certificate design and add dynamic fields before
              generating certificates.
            </p>
            <Link
              href={`/admin/events/${eventId}/categories/${categoryId}/templates`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c94b08]"
            >
              <PlusIcon />
              Upload Template
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
                  className={`relative rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-orange-400 bg-orange-50/70 ring-2 ring-orange-100"
                      : "border-[#eee2da] bg-white hover:border-orange-200 hover:bg-[#fffaf7]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                      <FileText size={20} />
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        template.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {template.status}
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
                Select participants and generate their certificates.
              </p>
            </div>

            <div className="relative w-full lg:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a18d81]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or ID..."
                className="w-full rounded-xl border border-[#eee2da] bg-[#fffaf7] py-2.5 pl-10 pr-4 text-sm text-[#241000] outline-none transition placeholder:text-[#b5a398] focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl bg-[#fffaf7] p-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleAllFiltered}
                disabled={filteredParticipants.length === 0 || generating}
                className="inline-flex items-center gap-2 rounded-lg border border-[#eadbd1] bg-white px-3 py-2 text-xs font-semibold text-[#604a3d] hover:border-orange-300 disabled:opacity-50"
              >
                {allFilteredSelected ? (
                  <CheckCircle2 size={15} className="text-orange-600" />
                ) : (
                  <span className="h-4 w-4 rounded border border-[#cdb9ab]" />
                )}
                {allFilteredSelected ? "Deselect Visible" : "Select Visible"}
              </button>

              <span className="text-xs text-[#927e72]">
                {selectedParticipants.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void generateCertificates("selected")
                }
                disabled={
                  generating ||
                  !selectedTemplate ||
                  selectedParticipants.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating && generationMode === "selected" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                Generate Selected
              </button>

              <button
                type="button"
                onClick={() => void generateCertificates("all")}
                disabled={
                  generating ||
                  !selectedTemplate ||
                  participants.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#c94b08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating && generationMode === "all" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                Generate All ({participants.length})
              </button>
            </div>
          </div>

          {participants.length >= MAX_PARTICIPANTS && (
            <p className="mt-3 text-xs text-amber-700">
              Showing up to {MAX_PARTICIPANTS} participants per batch. Use
              smaller batches if your category contains more participants.
            </p>
          )}
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
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#fffaf7]">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-[#927e72]">
                  <th className="w-12 px-5 py-4">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-4">Participant</th>
                  <th className="px-4 py-4">Certificate ID</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f3ebe6]">
                {filteredParticipants.map((participant) => {
                  const selected = selectedParticipants.includes(
                    participant._id
                  );

                  const isGeneratingThis =
                    generating &&
                    generationMode === "single" &&
                    generatingParticipantId === participant._id;

                  return (
                    <tr
                      key={participant._id}
                      className={`transition hover:bg-[#fffaf7] ${
                        selected ? "bg-orange-50/40" : ""
                      }`}
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
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                            selected
                              ? "border-orange-600 bg-orange-600 text-white"
                              : "border-[#d8c8bd] bg-white text-transparent hover:border-orange-400"
                          }`}
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
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            void generateCertificates(
                              "single",
                              participant._id
                            )
                          }
                          disabled={generating || !selectedTemplate}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isGeneratingThis ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Download size={14} />
                          )}
                          Generate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {participants.length > 0 && (
          <div className="flex flex-col justify-between gap-2 border-t border-[#f3ebe6] px-5 py-4 text-xs text-[#927e72] sm:flex-row sm:items-center">
            <span>
              Showing {filteredParticipants.length} of {participants.length}{" "}
              loaded participants
            </span>
            <span>
              Maximum {MAX_PARTICIPANTS} participants per generation request
            </span>
          </div>
        )}
      </section>

      {generating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#f1e6df] bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <Loader2 size={27} className="animate-spin text-orange-600" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-[#241000]">
              Generating Certificates
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#927e72]">
              Please wait while your PDF certificates are created and packaged
              into a ZIP file. Do not close this page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return <span className="text-lg leading-none">+</span>;
}
