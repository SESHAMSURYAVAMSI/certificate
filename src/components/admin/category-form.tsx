
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Presentation,
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  Settings2,
  ChevronDown,
} from "lucide-react";

type FieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select";

type ParticipantField = {
  label: string;
  key: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

type CategoryFormProps = {
  eventId: string;
  categoryId?: string;
};

type CategoryResponse = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  fields: ParticipantField[];
};

const DEFAULT_FIELDS: ParticipantField[] = [
  {
    label: "Participant Name",
    key: "participant_name",
    type: "text",
    required: true,
    placeholder: "Enter participant name",
  },
  {
    label: "Email",
    key: "email",
    type: "email",
    required: true,
    placeholder: "Enter email address",
  },
  {
    label: "Presentation Title",
    key: "presentation_title",
    type: "text",
    required: false,
    placeholder: "Enter presentation title",
  },
  {
    label: "Institution",
    key: "institution",
    type: "text",
    required: false,
    placeholder: "Enter institution",
  },
  {
    label: "Designation",
    key: "designation",
    type: "text",
    required: false,
    placeholder: "Enter designation",
  },
];

const FIELD_TYPES: { label: string; value: FieldType }[] = [
  { label: "Text", value: "text" },
  { label: "Email", value: "email" },
  { label: "Number", value: "number" },
  { label: "Date", value: "date" },
  { label: "Long Text", value: "textarea" },
  { label: "Dropdown", value: "select" },
];

const STANDARD_FIELD_KEYS = [
  "participant_name",
  "email",
  "presentation_title",
  "institution",
  "designation",
];

function getFieldIcon(key: string) {
  switch (key) {
    case "participant_name":
      return UserRound;
    case "email":
      return Mail;
    case "presentation_title":
      return Presentation;
    case "institution":
      return Building2;
    case "designation":
      return BriefcaseBusiness;
    default:
      return Settings2;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createNewField(): ParticipantField {
  return {
    label: "",
    key: "",
    type: "text",
    required: false,
    placeholder: "",
  };
}

export default function CategoryForm({
  eventId,
  categoryId,
}: CategoryFormProps) {
  const router = useRouter();
  const isEditing = Boolean(categoryId);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] =
    useState<ParticipantField[]>(DEFAULT_FIELDS);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCategory() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/events/${eventId}/categories`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load category.");
        }

        const category = (result.categories as CategoryResponse[]).find(
          (item) => item._id === categoryId
        );

        if (!category) {
          throw new Error("Category not found.");
        }

        if (cancelled) return;

        setName(category.name);
        setSlug(category.slug);
        setDescription(category.description || "");
        setIsActive(category.isActive);
        setFields(category.fields || []);
        setSlugManuallyEdited(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load category."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategory();

    return () => {
      cancelled = true;
    };
  }, [categoryId, eventId]);

  function updateField(
    index: number,
    updates: Partial<ParticipantField>
  ) {
    setFields((current) =>
      current.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      )
    );
  }

  function handleFieldLabelChange(index: number, value: string) {
    setFields((current) =>
      current.map((field, i) => {
        if (i !== index) return field;

        const oldGeneratedKey = createKey(field.label);
        const key =
          !field.key || field.key === oldGeneratedKey
            ? createKey(value)
            : field.key;

        return { ...field, label: value, key };
      })
    );
  }

  function addField() {
    const nextIndex = fields.length;

    setFields((current) => [...current, createNewField()]);
    setEditingIndex(nextIndex);

    setTimeout(() => {
      document
        .getElementById(`participant-field-${nextIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function removeField(index: number) {
    setFields((current) =>
      current.filter((_, i) => i !== index)
    );

    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  }

  function validateFields() {
    if (fields.length === 0) {
      return "Please add at least one participant field.";
    }

    const keys = new Set<string>();

    for (const field of fields) {
      if (!field.label.trim()) {
        return "Please enter a label for every participant field.";
      }

      if (!field.key.trim()) {
        return `Please enter a field key for ${field.label}.`;
      }

      if (!/^[a-z][a-z0-9_]*$/.test(field.key)) {
        return `Invalid field key "${field.key}". Use lowercase letters, numbers and underscores.`;
      }

      if (keys.has(field.key)) {
        return `The field key "${field.key}" is duplicated.`;
      }

      keys.add(field.key);

      if (
        field.type === "select" &&
        (!field.options ||
          field.options.filter((option) => option.trim()).length === 0)
      ) {
        return `Please add at least one dropdown option for ${field.label}.`;
      }
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    if (!slug.trim()) {
      setError("Please enter a category slug.");
      return;
    }

    const validationError = validateFields();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        slug: slugify(slug),
        description: description.trim(),
        isActive,
        fields: fields.map((field) => ({
          ...field,
          label: field.label.trim(),
          key: field.key.trim(),
          placeholder: field.placeholder?.trim() || "",
          options:
            field.type === "select"
              ? (field.options || [])
                  .map((option) => option.trim())
                  .filter(Boolean)
              : undefined,
        })),
      };

      const response = await fetch(
        isEditing
          ? `/api/events/${eventId}/categories/${categoryId}`
          : `/api/events/${eventId}/categories`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save category.");
      }

      router.push(`/admin/events/${eventId}/categories`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#EA580C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] px-4 py-8 text-[#241000] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/admin/events/${eventId}/categories`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#8b6b59] transition hover:text-[#EA580C]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isEditing ? "Edit Category" : "Create Category"}
          </h1>
          <p className="mt-2 text-sm text-[#8b6b59]">
            Configure your category and participant registration fields.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category details */}
          <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Category Information</h2>
                <p className="text-xs text-[#9b8172]">
                  Basic category details
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Category Name *
                </label>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugManuallyEdited) {
                      setSlug(slugify(event.target.value));
                    }
                  }}
                  placeholder="e.g. Standard Participant"
                  className="w-full rounded-xl border border-orange-100 bg-[#fffaf7] px-4 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  URL Slug *
                </label>
                <input
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="standard-participant"
                  className="w-full rounded-xl border border-orange-100 bg-[#fffaf7] px-4 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Describe this category..."
                  className="w-full rounded-xl border border-orange-100 bg-[#fffaf7] px-4 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 accent-[#EA580C]"
                />
                Category is active
              </label>
            </div>
          </section>

          {/* Participant fields in screenshot-style cards */}
          <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                  <UserRound className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    Standard Participant Fields
                  </h2>
                  <p className="mt-1 text-sm text-[#9b8172]">
                    These five fields are automatically included in every
                    new category. You can edit them or add more fields.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addField}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field, index) => {
                const Icon = getFieldIcon(field.key);
                const isEditingField = editingIndex === index;
                const isStandard = STANDARD_FIELD_KEYS.includes(field.key);

                return (
                  <div
                    id={`participant-field-${index}`}
                    key={index}
                    className={`rounded-2xl border p-5 transition ${
                      isEditingField
                        ? "border-orange-300 bg-orange-50/40 shadow-sm sm:col-span-2"
                        : "border-[#f0ded3] bg-[#fffdfb] hover:border-orange-200"
                    }`}
                  >
                    {!isEditingField ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold">
                              {field.label}
                            </h3>
                            <p className="mt-1 text-sm text-[#9b8172]">
                              {field.required ? "Required" : "Optional"}
                              {" · "}
                              {FIELD_TYPES.find(
                                (type) => type.value === field.type
                              )?.label || "Text"}
                            </p>
                          </div>

                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-orange-100 pt-3">
                          <span className="max-w-[55%] truncate text-xs text-[#9b8172]">
                            Key: {field.key}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(index)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-[#EA580C] transition hover:bg-orange-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => removeField(index)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div className="mb-5 flex items-center justify-between">
                          <h3 className="font-semibold text-[#241000]">
                            Edit Participant Field
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="rounded-lg p-2 text-[#9b8172] transition hover:bg-orange-100 hover:text-[#EA580C]"
                            aria-label="Close field editor"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs font-semibold text-[#6f5141]">
                              Field Label *
                            </label>
                            <input
                              value={field.label}
                              onChange={(event) =>
                                handleFieldLabelChange(
                                  index,
                                  event.target.value
                                )
                              }
                              placeholder="e.g. Mobile Number"
                              className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-[#6f5141]">
                              Field Type
                            </label>
                            <div className="relative">
                              <select
                                value={field.type}
                                onChange={(event) =>
                                  updateField(index, {
                                    type: event.target.value as FieldType,
                                    options:
                                      event.target.value === "select"
                                        ? field.options?.length
                                          ? field.options
                                          : ["Option 1", "Option 2"]
                                        : undefined,
                                  })
                                }
                                className="w-full appearance-none rounded-xl border border-orange-100 bg-white px-3 py-3 pr-9 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                              >
                                {FIELD_TYPES.map((type) => (
                                  <option
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8172]" />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-[#6f5141]">
                              Field Key *
                            </label>
                            <input
                              value={field.key}
                              onChange={(event) =>
                                updateField(index, {
                                  key: event.target.value,
                                })
                              }
                              placeholder="mobile_number"
                              className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-[#6f5141]">
                              Placeholder
                            </label>
                            <input
                              value={field.placeholder || ""}
                              onChange={(event) =>
                                updateField(index, {
                                  placeholder: event.target.value,
                                })
                              }
                              placeholder="Enter placeholder"
                              className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                            />
                          </div>

                          {field.type === "select" && (
                            <div className="sm:col-span-2">
                              <label className="mb-2 block text-xs font-semibold text-[#6f5141]">
                                Dropdown Options
                              </label>
                              <textarea
                                rows={3}
                                value={(field.options || []).join("\n")}
                                onChange={(event) =>
                                  updateField(index, {
                                    options: event.target.value.split("\n"),
                                  })
                                }
                                placeholder={"Option 1\nOption 2\nOption 3"}
                                className="w-full rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-100"
                              />
                              <p className="mt-1 text-xs text-[#9b8172]">
                                Enter one option per line.
                              </p>
                            </div>
                          )}

                          <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) =>
                                updateField(index, {
                                  required: event.target.checked,
                                })
                              }
                              className="h-4 w-4 accent-[#EA580C]"
                            />
                            <span className="text-sm font-medium">
                              This field is required
                            </span>
                          </label>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#8b6b59] hover:bg-orange-50"
                          >
                            Close
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-orange-100 bg-[#fffaf7] p-5 text-sm leading-6 text-[#8b6b59]">
              <strong className="text-[#241000]">How this works:</strong>{" "}
              Once the category is created, every participant will use the
              configured fields. You can enter participants individually or
              import an Excel/CSV file using these field names.
            </div>
          </section>

          {/* Save actions */}
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Link
              href={`/admin/events/${eventId}/categories`}
              className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-[#6f5141] transition hover:bg-orange-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update Category"
                  : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
