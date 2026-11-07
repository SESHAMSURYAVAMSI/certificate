
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Plus,
  Users,
  Search,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Award,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";

interface CategoryField {
  label: string;
  key: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  fields: CategoryField[];
  isActive: boolean;
}

interface ParticipantItem {
  _id: string;
  certificateId: string;
  participantName: string;
  email?: string;
  data: Record<string, unknown>;
  status: "active" | "inactive";
  createdAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ImportRow {
  data: Record<string, string>;
  rowNumber: number;
  errors: string[];
}

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getDisplayValue(value: unknown) {
  if (value === undefined || value === null) return "—";
  return String(value).trim() || "—";
}

function getFieldInputValue(
  data: Record<string, unknown> | undefined,
  key: string
) {
  const value = data?.[key];

  if (value === undefined || value === null) return "";

  return String(value);
}

export default function ParticipantsPage() {
  const params = useParams<{
    id: string;
    categoryId: string;
  }>();

  const eventId = params.id;
  const categoryId = params.categoryId;

  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(EMPTY_PAGINATION);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] =
    useState<ParticipantItem | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    details: Array<{
      row: number;
      name: string;
      reason: string;
    }>;
  } | null>(null);

  const [showImport, setShowImport] = useState(false);

  const fields = useMemo(
    () => category?.fields || [],
    [category]
  );

  const fetchCategory = useCallback(async () => {
    const response = await fetch(
      `/api/events/${eventId}/categories`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load category.");
    }

    const found = (result.categories || []).find(
      (item: CategoryItem) => item._id === categoryId
    );

    if (!found) {
      throw new Error("Category not found.");
    }

    setCategory(found);
  }, [eventId, categoryId]);

  const fetchParticipants = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams({
          page: String(page),
          limit: "10",
          search,
          status: statusFilter === "all" ? "" : statusFilter,
        });

        const response = await fetch(
          `/api/events/${eventId}/categories/${categoryId}/participants?${query}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load participants."
          );
        }

        setParticipants(result.participants || []);
        setPagination(result.pagination || EMPTY_PAGINATION);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load participants."
        );
      } finally {
        setLoading(false);
      }
    },
    [eventId, categoryId, search, statusFilter]
  );

  useEffect(() => {
    void fetchCategory().catch((err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Unable to load category."
      );
      setLoading(false);
    });
  }, [fetchCategory]);

  useEffect(() => {
    if (category) {
      void fetchParticipants(1);
    }
  }, [category, fetchParticipants]);

  const resetForm = () => {
    setFormData({});
    setEditingParticipant(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingParticipant(null);
    setFormData({});
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (participant: ParticipantItem) => {
    setEditingParticipant(participant);

    const values: Record<string, string> = {};

    fields.forEach((field) => {
      values[field.key] = getFieldInputValue(
        participant.data,
        field.key
      );
    });

    setFormData(values);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingParticipant);

      const url = isEditing
        ? `/api/events/${eventId}/categories/${categoryId}/participants/${editingParticipant?._id}`
        : `/api/events/${eventId}/categories/${categoryId}/participants`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditing
            ? { data: formData }
            : { data: formData }
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save participant."
        );
      }

      resetForm();

      setSuccess(
        isEditing
          ? "Participant updated successfully."
          : "Participant added successfully."
      );

      await fetchParticipants(isEditing ? pagination.page : 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save participant."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteParticipant = async (participant: ParticipantItem) => {
    const confirmed = window.confirm(
      `Delete participant "${participant.participantName}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(participant._id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/participants/${participant._id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to delete participant."
        );
      }

      setSuccess("Participant deleted successfully.");

      const nextPage =
        participants.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await fetchParticipants(nextPage);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete participant."
      );
    } finally {
      setDeletingId("");
    }
  };

  const handleFileImport = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setSuccess("");
      setImportResult(null);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error("The selected file does not contain a worksheet.");
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "" }
      );

      if (!rawRows.length) {
        throw new Error("No participant records found in this file.");
      }

      const mappedRows: ImportRow[] = rawRows.map((row, index) => {
        const mappedData: Record<string, string> = {};
        const errors: string[] = [];

        for (const field of fields) {
          const matchingKey = Object.keys(row).find(
            (header) =>
              normalizeHeader(header) === normalizeHeader(field.key) ||
              normalizeHeader(header) === normalizeHeader(field.label)
          );

          if (matchingKey !== undefined) {
            mappedData[field.key] = String(
              row[matchingKey] ?? ""
            ).trim();
          } else {
            mappedData[field.key] = "";
          }

          if (field.required && !mappedData[field.key]) {
            errors.push(`${field.label} is missing`);
          }
        }

        const nameField = fields.find((field) => {
          const key = field.key.toLowerCase();
          const label = field.label.toLowerCase();

          return (
            key === "name" ||
            key === "fullname" ||
            key === "participantname" ||
            label.includes("name")
          );
        });

        if (
          !nameField &&
          !mappedData.participantName &&
          !mappedData.name
        ) {
          errors.push("Participant name is missing");
        }

        return {
          data: mappedData,
          rowNumber: index + 2,
          errors,
        };
      });

      setImportRows(mappedRows);
      setImportFileName(file.name);
      setShowImport(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to read import file."
      );
    } finally {
      event.target.value = "";
    }
  };

  const importParticipants = async () => {
    const validRows = importRows.filter(
      (row) => row.errors.length === 0
    );

    if (!validRows.length) {
      setError("There are no valid rows available to import.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/participants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participants: validRows.map((row) => row.data),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok && !result.summary) {
        throw new Error(
          result.message || "Unable to import participants."
        );
      }

      setImportResult({
        created: result.summary?.created || 0,
        skipped:
          (result.summary?.skipped || 0) +
          importRows.filter((row) => row.errors.length > 0).length,
        details: [
          ...(result.skipped || []).map(
            (item: {
              row: number;
              name: string;
              reason: string;
            }) => item
          ),
          ...importRows
            .filter((row) => row.errors.length > 0)
            .map((row) => ({
              row: row.rowNumber,
              name: "Unknown",
              reason: row.errors.join(", "),
            })),
        ],
      });

      setSuccess(
        `${result.summary?.created || 0} participants imported successfully.`
      );

      await fetchParticipants(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to import participants."
      );
    } finally {
      setImporting(false);
    }
  };

  const exportParticipants = async () => {
    try {
      setError("");

      const query = new URLSearchParams({
        page: "1",
        limit: "100",
        search,
        status: statusFilter === "all" ? "" : statusFilter,
      });

      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/participants?${query}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to export participants.");
      }

      const rows = (result.participants || []).map(
        (participant: ParticipantItem) => {
          const row: Record<string, unknown> = {
            "Participant Name": participant.participantName,
            Email: participant.email || "",
            "Certificate ID": participant.certificateId,
            Status: participant.status,
          };

          fields.forEach((field) => {
            row[field.label] = participant.data?.[field.key] ?? "";
          });

          return row;
        }
      );

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Participants"
      );

      XLSX.writeFile(
        workbook,
        `${category?.name || "participants"}-participants.xlsx`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to export participants."
      );
    }
  };

  const downloadSample = () => {
    const headers = fields.map((field) => field.label);

    const sample: Record<string, string>[] = [
      Object.fromEntries(
        fields.map((field) => [
          field.label,
          field.type === "email"
            ? "participant@example.com"
            : field.label.toLowerCase().includes("name")
              ? "Dr. Sample Participant"
              : "",
        ])
      ),
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample, {
      header: headers,
    });

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");

    XLSX.writeFile(
      workbook,
      `${category?.name || "category"}-import-template.xlsx`
    );
  };

  const closeImport = () => {
    setShowImport(false);
    setImportRows([]);
    setImportFileName("");
    setImportResult(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      {/* Back navigation */}
      <Link
        href={`/admin/events/${eventId}/categories`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#927e72] transition hover:text-orange-600"
      >
        <ArrowLeft size={17} />
        Back to Categories
      </Link>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-orange-600">
            Category Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
            Participants
          </h1>

          <p className="mt-2 text-sm text-[#927e72]">
            Manage registrations and certificate details for{" "}
            <span className="font-semibold text-[#604a3d]">
              {category?.name || "this category"}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchParticipants(pagination.page)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => void exportParticipants()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-[#fffaf7]"
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            onClick={() => {
              setShowImport(true);
              setImportRows([]);
              setImportResult(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            <Upload size={16} />
            Import Excel
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
          >
            <Plus size={17} />
            Add Participant
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">
              Total Participants
            </span>
            <Users size={20} className="text-orange-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">
              Active on This Page
            </span>
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {participants.filter((item) => item.status === "active").length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#927e72]">
              Custom Fields
            </span>
            <FileText size={20} className="text-orange-600" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#241000]">
            {fields.length}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#f1e6df] bg-white p-4 shadow-sm sm:flex-row">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
          }}
          className="flex min-w-0 flex-1 gap-2"
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a18d81]"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email or certificate ID..."
              className="w-full rounded-xl border border-[#eee2da] bg-[#fffaf7] py-3 pl-10 pr-4 text-sm text-[#241000] outline-none transition placeholder:text-[#b5a69c] focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-[#241000] px-5 text-sm font-semibold text-white transition hover:bg-[#43230c]"
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-[#eee2da] bg-white px-4 py-3 text-sm text-[#604a3d] outline-none focus:border-orange-300"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Participants table */}
      <div className="overflow-hidden rounded-2xl border border-[#f1e6df] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-[#f3ebe6] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-[#241000]">
              Participant Directory
            </h2>
            <p className="mt-1 text-xs text-[#927e72]">
              {pagination.total} participant records found
            </p>
          </div>

          <span className="rounded-lg bg-[#fffaf7] px-3 py-1.5 text-xs font-medium text-[#806e63]">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-orange-600" />
          </div>
        ) : participants.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <Users size={25} className="text-orange-600" />
            </div>
            <h3 className="mt-4 font-bold text-[#241000]">
              No participants found
            </h3>
            <p className="mt-2 text-sm text-[#927e72]">
              Add participants manually or import them using an Excel file.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c94b08]"
            >
              <Plus size={16} />
              Add First Participant
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#fffaf7]">
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-[#927e72]">
                    <th className="px-5 py-4">Participant</th>
                    <th className="px-5 py-4">Certificate ID</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f3ebe6]">
                  {participants.map((participant) => (
                    <tr
                      key={participant._id}
                      className="transition hover:bg-[#fffdfb]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-700">
                            {participant.participantName
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#241000]">
                              {participant.participantName}
                            </p>
                            <p className="mt-1 text-xs text-[#a18d81]">
                              Added{" "}
                              {participant.createdAt
                                ? new Date(
                                    participant.createdAt
                                  ).toLocaleDateString()
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-[#fffaf7] px-2.5 py-1.5 font-mono text-xs font-semibold text-[#604a3d]">
                          {participant.certificateId}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#806e63]">
                          <Mail size={14} className="shrink-0 text-[#b5a69c]" />
                          {participant.email || "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                            participant.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              participant.status === "active"
                                ? "bg-emerald-500"
                                : "bg-stone-400"
                            }`}
                          />
                          {participant.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(participant)}
                            className="rounded-lg border border-[#eee2da] p-2 text-[#806e63] transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                            title="Edit participant"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteParticipant(participant)}
                            disabled={deletingId === participant._id}
                            className="rounded-lg border border-red-100 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            title="Delete participant"
                          >
                            {deletingId === participant._id ? (
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col justify-between gap-3 border-t border-[#f3ebe6] px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-xs text-[#927e72]">
                Showing{" "}
                {pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1}
                {" – "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total} participants
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    void fetchParticipants(pagination.page - 1)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#eee2da] px-3 py-2 text-xs font-semibold text-[#604a3d] hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                <span className="px-2 text-xs font-semibold text-[#604a3d]">
                  {pagination.page}
                </span>

                <button
                  type="button"
                  disabled={
                    pagination.page >= pagination.totalPages
                  }
                  onClick={() =>
                    void fetchParticipants(pagination.page + 1)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#eee2da] px-3 py-2 text-xs font-semibold text-[#604a3d] hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual participant form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#241000]/45 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f3ebe6] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#241000]">
                  {editingParticipant
                    ? "Edit Participant"
                    : "Add Participant"}
                </h2>
                <p className="mt-1 text-xs text-[#927e72]">
                  {category?.name} · Fill in the participant details
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-2 text-[#927e72] hover:bg-[#fffaf7] hover:text-[#241000]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="grid max-h-[65vh] gap-5 overflow-y-auto p-6 sm:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.type === "textarea"
                        ? "sm:col-span-2"
                        : ""
                    }
                  >
                    <label className="mb-2 block text-sm font-semibold text-[#604a3d]">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        value={formData[field.key] || ""}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={
                          field.placeholder || `Enter ${field.label}`
                        }
                        rows={3}
                        className="w-full rounded-xl border border-[#eee2da] bg-[#fffaf7] px-4 py-3 text-sm text-[#241000] outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    ) : field.type === "select" ? (
                      <select
                        required={field.required}
                        value={formData[field.key] || ""}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-[#eee2da] bg-[#fffaf7] px-4 py-3 text-sm text-[#241000] outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Select {field.label}</option>
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          ["text", "email", "number", "date"].includes(
                            field.type
                          )
                            ? field.type
                            : "text"
                        }
                        required={field.required}
                        value={formData[field.key] || ""}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={
                          field.placeholder || `Enter ${field.label}`
                        }
                        className="w-full rounded-xl border border-[#eee2da] bg-[#fffaf7] px-4 py-3 text-sm text-[#241000] outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                      />
                    )}
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="sm:col-span-2 rounded-xl border border-dashed border-[#eadbd1] bg-[#fffaf7] p-6 text-center">
                    <AlertCircle
                      size={25}
                      className="mx-auto text-orange-600"
                    />
                    <p className="mt-3 text-sm font-semibold text-[#241000]">
                      No participant fields configured
                    </p>
                    <p className="mt-1 text-xs text-[#927e72]">
                      Add participant fields in the category settings first.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#f3ebe6] bg-[#fffdfb] px-6 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-[#eee2da] px-5 py-3 text-sm font-semibold text-[#604a3d] hover:bg-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || fields.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {editingParticipant ? "Save Changes" : "Add Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#241000]/45 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f3ebe6] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#241000]">
                  Import Participants
                </h2>
                <p className="mt-1 text-xs text-[#927e72]">
                  Upload an Excel or CSV file for {category?.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeImport}
                className="rounded-lg p-2 text-[#927e72] hover:bg-[#fffaf7]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {!importResult && (
                <>
                  <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                      <FileSpreadsheet size={24} />
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-[#241000]">
                      Upload participant spreadsheet
                    </h3>

                    <p className="mt-1 text-xs text-[#927e72]">
                      Supports .xlsx, .xls and .csv files
                    </p>

                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08]">
                      <Upload size={16} />
                      Choose File
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(event) => void handleFileImport(event)}
                        className="hidden"
                      />
                    </label>

                    {importFileName && (
                      <p className="mt-3 text-xs font-medium text-[#604a3d]">
                        {importFileName}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#f1e6df] p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#241000]">
                        Need an import template?
                      </p>
                      <p className="mt-1 text-xs text-[#927e72]">
                        Download a spreadsheet with this category&apos;s field
                        names.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={downloadSample}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#eee2da] px-4 py-2.5 text-xs font-semibold text-[#604a3d] hover:bg-[#fffaf7]"
                    >
                      <Download size={15} />
                      Download Template
                    </button>
                  </div>
                </>
              )}

              {importRows.length > 0 && !importResult && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#241000]">
                        Import Preview
                      </h3>
                      <p className="mt-1 text-xs text-[#927e72]">
                        {importRows.length} records ·{" "}
                        {importRows.filter((row) => !row.errors.length).length}{" "}
                        valid ·{" "}
                        {importRows.filter((row) => row.errors.length).length}{" "}
                        with errors
                      </p>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-auto rounded-xl border border-[#f1e6df]">
                    <table className="w-full min-w-[600px] text-left">
                      <thead className="sticky top-0 bg-[#fffaf7]">
                        <tr className="text-xs font-semibold text-[#927e72]">
                          <th className="px-4 py-3">Row</th>
                          <th className="px-4 py-3">Participant</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Validation</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#f3ebe6]">
                        {importRows.slice(0, 100).map((row) => {
                          const nameField = fields.find((field) => {
                            const key = field.key.toLowerCase();
                            const label = field.label.toLowerCase();

                            return (
                              key === "name" ||
                              key === "fullname" ||
                              key === "participantname" ||
                              label.includes("name")
                            );
                          });

                          const emailField = fields.find(
                            (field) =>
                              field.type === "email" ||
                              field.key.toLowerCase().includes("email")
                          );

                          const name = nameField
                            ? row.data[nameField.key]
                            : row.data.participantName || row.data.name;

                          const email = emailField
                            ? row.data[emailField.key]
                            : row.data.email;

                          return (
                            <tr key={row.rowNumber}>
                              <td className="px-4 py-3 text-xs text-[#927e72]">
                                {row.rowNumber}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-[#604a3d]">
                                {name || "—"}
                              </td>
                              <td className="px-4 py-3 text-xs text-[#806e63]">
                                {email || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {row.errors.length ? (
                                  <span
                                    className="text-xs font-medium text-red-600"
                                    title={row.errors.join(", ")}
                                  >
                                    <AlertCircle
                                      size={14}
                                      className="mr-1 inline"
                                    />
                                    {row.errors.length} issue(s)
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-emerald-700">
                                    <CheckCircle2
                                      size={14}
                                      className="mr-1 inline"
                                    />
                                    Valid
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {importRows.length > 100 && (
                    <p className="mt-2 text-xs text-[#927e72]">
                      Preview shows the first 100 records. All valid records
                      will be processed.
                    </p>
                  )}

                  <div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setImportRows([]);
                        setImportFileName("");
                      }}
                      className="rounded-xl border border-[#eee2da] px-5 py-3 text-sm font-semibold text-[#604a3d] hover:bg-[#fffaf7]"
                    >
                      Choose Another File
                    </button>

                    <button
                      type="button"
                      onClick={() => void importParticipants()}
                      disabled={
                        importing ||
                        !importRows.some((row) => !row.errors.length)
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c94b08] disabled:opacity-50"
                    >
                      {importing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Import Valid Records
                    </button>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                      <CheckCircle2
                        size={22}
                        className="text-emerald-600"
                      />
                      <p className="mt-3 text-2xl font-bold text-emerald-800">
                        {importResult.created}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Successfully imported
                      </p>
                    </div>

                    <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                      <AlertCircle size={22} className="text-red-600" />
                      <p className="mt-3 text-2xl font-bold text-red-800">
                        {importResult.skipped}
                      </p>
                      <p className="mt-1 text-xs text-red-700">
                        Skipped records
                      </p>
                    </div>
                  </div>

                  {importResult.details.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-[#241000]">
                        Skipped record details
                      </h3>

                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {importResult.details.map((item, index) => (
                          <div
                            key={`${item.row}-${index}`}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                          >
                            <span className="font-semibold">
                              Row {item.row}:
                            </span>{" "}
                            {item.name} — {item.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeImport}
                      className="rounded-xl bg-[#241000] px-6 py-3 text-sm font-semibold text-white hover:bg-[#43230c]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
