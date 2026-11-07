
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  Settings2,
} from "lucide-react";

type FieldType = "text" | "email" | "number" | "date" | "textarea" | "select";

interface ParticipantField {
  label: string;
  key: string;
  type: FieldType;
  required: boolean;
  options: string[];
  placeholder: string;
}

interface CategoryData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  fields: ParticipantField[];
  isActive: boolean;
}

interface CategoryFormProps {
  eventId: string;
  categoryId?: string;
}

const createDefaultField = (): ParticipantField => ({
  label: "",
  key: "",
  type: "text",
  required: false,
  options: [],
  placeholder: "",
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 text-sm text-[#241000] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const labelClass = "text-sm font-semibold text-[#604a3d]";

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
  const [fields, setFields] = useState<ParticipantField[]>([
    {
      label: "Name",
      key: "name",
      type: "text",
      required: true,
      options: [],
      placeholder: "Enter participant name",
    },
  ]);

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCategory = useCallback(async () => {
    if (!categoryId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/categories`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load categories.");
      }

      const category = (result.categories as CategoryData[]).find(
        (item) => item._id === categoryId
      );

      if (!category) {
        throw new Error("Category not found.");
      }

      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || "");
      setIsActive(category.isActive);

      setFields(
        category.fields?.length
          ? category.fields.map((field) => ({
              ...field,
              options: field.options || [],
              placeholder: field.placeholder || "",
            }))
          : []
      );

      setSlugManuallyEdited(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load category."
      );
    } finally {
      setLoading(false);
    }
  }, [categoryId, eventId]);

  useEffect(() => {
    if (categoryId) {
      void loadCategory();
    }
  }, [categoryId, loadCategory]);

  const updateField = (
    index: number,
    key: keyof ParticipantField,
    value: string | boolean | string[]
  ) => {
    setFields((previous) =>
      previous.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      )
    );
  };

  const addField = () => {
    setFields((previous) => [...previous, createDefaultField()]);
  };

  const removeField = (index: number) => {
    setFields((previous) =>
      previous.filter((_, fieldIndex) => fieldIndex !== index)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    if (!slug.trim()) {
      setError("Please enter a category slug.");
      return;
    }

    if (fields.length === 0) {
      setError("Please add at least one participant field.");
      return;
    }

    const fieldKeys = fields.map((field) => field.key.trim());

    if (fieldKeys.some((key) => !key)) {
      setError("Every participant field must have a field key.");
      return;
    }

    if (new Set(fieldKeys).size !== fieldKeys.length) {
      setError("Participant field keys must be unique.");
      return;
    }

    for (const field of fields) {
      if (!field.label.trim()) {
        setError("Every participant field must have a label.");
        return;
      }

      if (
        field.type === "select" &&
        (!field.options || field.options.length === 0)
      ) {
        setError(`Please add dropdown options for "${field.label}".`);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      slug: slugify(slug),
      description: description.trim(),
      isActive,
      fields: fields.map((field) => ({
        ...field,
        label: field.label.trim(),
        key: slugify(field.key).replace(/-/g, "_"),
        options: field.type === "select" ? field.options : [],
      })),
    };

    try {
      setSaving(true);

      const response = await fetch(
        categoryId
          ? `/api/events/${eventId}/categories/${categoryId}`
          : `/api/events/${eventId}/categories`,
        {
          method: categoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save category.");
      }

      router.push(`/admin/events/${eventId}/categories`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save category."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={30} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      <Link
        href={`/admin/events/${eventId}/categories`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#927e72] transition hover:text-orange-600"
      >
        <ArrowLeft size={17} />
        Back to Categories
      </Link>

      <div>
        <p className="mb-2 text-sm font-semibold text-orange-600">
          Category Configuration
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#241000]">
          {isEditing ? "Edit Category" : "Create Category"}
        </h1>
        <p className="mt-2 text-sm text-[#927e72]">
          Configure the category and the information collected from each
          participant.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic information */}
        <section className="rounded-2xl border border-[#f1e6df] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Settings2 size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#241000]">Basic Information</h2>
              <p className="mt-1 text-xs text-[#927e72]">
                Set up the category details.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass}>Category Name *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Speakers, Delegates, Faculty"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  if (!slugManuallyEdited) setSlug(slugify(value));
                }}
              />
            </div>

            <div>
              <label className={labelClass}>Category Slug *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. speakers"
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                maxLength={1000}
                className="mt-2 w-full rounded-xl border border-[#eee2da] bg-[#fffdfb] px-4 py-3 text-sm text-[#241000] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                placeholder="Describe this certificate category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#fffaf7] p-4 md:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-orange-600"
              />
              <span>
                <span className="block text-sm font-semibold text-[#241000]">
                  Active Category
                </span>
                <span className="mt-1 block text-xs text-[#927e72]">
                  Allow this category to be used for participant management.
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* Participant fields */}
        <section className="rounded-2xl border border-[#f1e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-[#241000]">
                Participant Fields
              </h2>
              <p className="mt-1 text-xs text-[#927e72]">
                Define what information you need from each participant.
              </p>
            </div>

            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c94b08]"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {fields.map((field, index) => (
              <div
                key={index}
                className="rounded-xl border border-[#eee2da] bg-[#fffdfb] p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical size={17} className="text-[#b5a49a]" />
                    <span className="text-sm font-bold text-[#49372c]">
                      Field {index + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Field Label *</label>
                    <input
                      required
                      className={inputClass}
                      placeholder="e.g. Institution Name"
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, "label", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Field Key *</label>
                    <input
                      required
                      className={inputClass}
                      placeholder="e.g. institution_name"
                      value={field.key}
                      onChange={(e) =>
                        updateField(
                          index,
                          "key",
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "_")
                        )
                      }
                    />
                    <p className="mt-1 text-[11px] text-[#a18d81]">
                      Used internally to identify participant data.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Field Type *</label>
                    <select
                      className={inputClass}
                      value={field.type}
                      onChange={(e) =>
                        updateField(
                          index,
                          "type",
                          e.target.value as FieldType
                        )
                      }
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="textarea">Long Text</option>
                      <option value="select">Dropdown</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Placeholder</label>
                    <input
                      className={inputClass}
                      placeholder="Enter placeholder text"
                      value={field.placeholder}
                      onChange={(e) =>
                        updateField(index, "placeholder", e.target.value)
                      }
                    />
                  </div>

                  {field.type === "select" && (
                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Dropdown Options *
                      </label>
                      <input
                        className={inputClass}
                        placeholder="Student, Faculty, Speaker"
                        value={field.options.join(", ")}
                        onChange={(e) =>
                          updateField(
                            index,
                            "options",
                            e.target.value
                              .split(",")
                              .map((option) => option.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                      <p className="mt-1 text-[11px] text-[#a18d81]">
                        Separate each option with a comma.
                      </p>
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-orange-50/70 p-3 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        updateField(index, "required", e.target.checked)
                      }
                      className="h-4 w-4 accent-orange-600"
                    />
                    <span className="text-sm font-semibold text-[#604a3d]">
                      This field is required
                    </span>
                  </label>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#eadbd1] bg-[#fffaf7] px-5 py-10 text-center">
                <p className="text-sm font-semibold text-[#49372c]">
                  No participant fields added
                </p>
                <p className="mt-1 text-xs text-[#927e72]">
                  Add at least one field to collect participant information.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link
            href={`/admin/events/${eventId}/categories`}
            className="inline-flex items-center justify-center rounded-xl border border-[#eee2da] px-5 py-3 text-sm font-semibold text-[#604a3d] transition hover:bg-white"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c94b08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
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
  );
}
