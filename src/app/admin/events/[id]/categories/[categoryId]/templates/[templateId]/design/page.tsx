
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Loader2,
  Type,
  UserRound,
  CalendarDays,
  MapPin,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Grip,
  RotateCcw,
} from "lucide-react";

type FieldType =
  | "participantName"
  | "workshopTitle"
  | "eventName"
  | "eventDates"
  | "venue"
  | "custom";

interface DesignField {
  key: string;
  label: string;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
}

interface TemplateData {
  _id: string;
  name: string;
  fileName: string;
  mimeType: string;
  status: "draft" | "published";
  fields: DesignField[];
}

const DEFAULT_FIELDS: {
  type: FieldType;
  label: string;
  key: string;
  sample: string;
  icon: typeof UserRound;
}[] = [
  {
    type: "participantName",
    label: "Participant Name",
    key: "participant_name",
    sample: "Dr. John Smith",
    icon: UserRound,
  },
  {
    type: "workshopTitle",
    label: "Workshop Title",
    key: "workshop_title",
    sample: "Advanced Live Laparoscopy Workshop",
    icon: Type,
  },
  {
    type: "eventName",
    label: "Event Name",
    key: "event_name",
    sample: "KSOGA 2026",
    icon: Type,
  },
  {
    type: "eventDates",
    label: "Event Dates",
    key: "event_dates",
    sample: "20–22 February 2026",
    icon: CalendarDays,
  },
  {
    type: "venue",
    label: "Venue",
    key: "venue",
    sample: "Hyderabad, India",
    icon: MapPin,
  },
];

const DEFAULT_FIELD_STYLE = {
  x: 25,
  y: 48,
  width: 50,
  height: 9,
  fontSize: 26,
  fontFamily: "Helvetica",
  color: "#241000",
  align: "center" as const,
  fontWeight: "normal" as const,
};

export default function CertificateDesignerPage() {
  const params = useParams<{
    id: string;
    categoryId: string;
    templateId: string;
  }>();

  const { id: eventId, categoryId, templateId } = params;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [fields, setFields] = useState<DesignField[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
    width: number;
    height: number;
  } | null>(null);

  const fileUrl = `/api/certificate-templates/${templateId}/file`;

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/categories/${categoryId}/templates`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load templates.");
      }

      const found = (result.templates as TemplateData[]).find(
        (item) => item._id === templateId
      );

      if (!found) {
        throw new Error("Certificate template not found.");
      }

      setTemplate(found);
      setFields(found.fields || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load template."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, categoryId, templateId]);

  useEffect(() => {
    void fetchTemplate();
  }, [fetchTemplate]);

  const addField = (item: (typeof DEFAULT_FIELDS)[number]) => {
    const existing = fields.filter((field) => field.type === item.type).length;

    const newField: DesignField = {
      ...DEFAULT_FIELD_STYLE,
      key:
        existing === 0
          ? item.key
          : `${item.key}_${existing + 1}`,
      label: item.label,
      type: item.type,
      x: 25,
      y: Math.min(20 + fields.length * 10, 85),
    };

    setFields((previous) => [...previous, newField]);
    setSelectedIndex(fields.length);
    setSuccess("");
  };

  const updateSelected = (
    key: keyof DesignField,
    value: string | number
  ) => {
    setFields((previous) =>
      previous.map((field, index) =>
        index === selectedIndex
          ? { ...field, [key]: value }
          : field
      )
    );
    setSuccess("");
  };

  const removeSelected = () => {
    setFields((previous) =>
      previous.filter((_, index) => index !== selectedIndex)
    );
    setSelectedIndex((previous) => Math.max(0, previous - 1));
    setSuccess("");
  };

  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (!stageRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = stageRef.current.getBoundingClientRect();
    const field = fields[index];

    dragRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      originalX: field.x,
      originalY: field.y,
      width: rect.width,
      height: rect.height,
    };

    setSelectedIndex(index);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveField = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag) return;

    const deltaX = ((e.clientX - drag.startX) / drag.width) * 100;
    const deltaY = ((e.clientY - drag.startY) / drag.height) * 100;

    setFields((previous) =>
      previous.map((field, index) => {
        if (index !== drag.index) return field;

        return {
          ...field,
          x: Math.max(
            0,
            Math.min(100 - field.width, drag.originalX + deltaX)
          ),
          y: Math.max(
            0,
            Math.min(100 - field.height, drag.originalY + deltaY)
          ),
        };
      })
    );
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  const saveDesign = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/certificate-templates/${templateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save design.");
      }

      setSuccess("Certificate design saved successfully.");
      setTemplate((previous) =>
        previous ? { ...previous, fields } : previous
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save design."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedField = fields[selectedIndex];

  const getSampleText = (field: DesignField) => {
    const item = DEFAULT_FIELDS.find(
      (defaultField) => defaultField.type === field.type
    );

    return item?.sample || field.label;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-orange-600" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center text-sm text-red-700">
        {error || "Template not found."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Link
            href={`/admin/events/${eventId}/categories/${categoryId}/templates`}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#927e72] hover:text-orange-600"
          >
            <ArrowLeft size={16} />
            Back to Templates
          </Link>

          <h1 className="text-2xl font-bold text-[#241000]">
            Certificate Designer
          </h1>
          <p className="mt-1 text-sm text-[#927e72]">{template.name}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFields(template.fields || []);
              setSelectedIndex(0);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#eee2da] bg-white px-4 py-2.5 text-sm font-semibold text-[#604a3d] hover:bg-[#fffaf7]"
          >
            <RotateCcw size={15} />
            Reset
          </button>

          <button
            onClick={() => void saveDesign()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c94b08] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Design
          </button>
        </div>
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

      <div className="grid items-start gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        {/* Left panel */}
        <aside className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#241000]">Dynamic Fields</h2>
          <p className="mt-1 text-xs leading-5 text-[#927e72]">
            Select a field to add it to your certificate.
          </p>

          <div className="mt-5 space-y-2">
            {DEFAULT_FIELDS.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.type}
                  onClick={() => addField(item)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#f1e6df] p-3 text-left transition hover:border-orange-200 hover:bg-[#fffaf7]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                    <Icon size={17} className="text-orange-600" />
                  </div>

                  <span className="flex-1 text-sm font-semibold text-[#49372c]">
                    {item.label}
                  </span>

                  <Plus size={15} className="text-orange-600" />
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl bg-[#fffaf7] p-3">
            <p className="text-xs font-semibold text-[#604a3d]">
              {fields.length} fields on certificate
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#927e72]">
              Drag fields on the certificate to position them. Select a field
              to edit its formatting.
            </p>
          </div>
        </aside>

        {/* Certificate preview */}
        <section className="min-w-0 rounded-2xl border border-[#f1e6df] bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-[#241000]">Live Preview</h2>
              <p className="mt-1 text-xs text-[#927e72]">
                Select and drag a field to position it.
              </p>
            </div>

            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700">
              Landscape · Preview
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e8ded7] bg-[#f3eee9] p-2 sm:p-4">
            <div
              ref={stageRef}
              className="relative mx-auto aspect-[1.414/1] w-full max-w-[1100px] overflow-hidden bg-white shadow-lg"
            >
              {template.mimeType === "application/pdf" ? (
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                  title="Certificate background"
                  className="pointer-events-none absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <img
                  src={fileUrl}
                  alt="Certificate background"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-fill"
                />
              )}

              {fields.map((field, index) => (
                <div
                  key={`${field.key}-${index}`}
                  onPointerDown={(e) => startDrag(e, index)}
                  onPointerMove={moveField}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                  onClick={() => setSelectedIndex(index)}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    minHeight: `${field.height}%`,
                    fontSize: `clamp(7px, ${field.fontSize / 10}cqw, ${field.fontSize}px)`,
                    fontFamily: field.fontFamily,
                    color: field.color,
                    textAlign: field.align,
                    fontWeight: field.fontWeight,
                  }}
                  className={`absolute z-10 flex cursor-move items-center justify-center overflow-hidden whitespace-normal break-words rounded-sm border-2 px-1 ${
                    selectedIndex === index
                      ? "border-orange-500 bg-orange-100/30"
                      : "border-dashed border-blue-400/70 bg-blue-100/10"
                  }`}
                >
                  <span className="pointer-events-none w-full leading-tight">
                    {getSampleText(field)}
                  </span>

                  <Grip
                    size={12}
                    className="pointer-events-none absolute right-0.5 top-0.5 text-orange-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[#a18d81]">
            The preview uses the uploaded file as its background. Position
            values are stored as percentages of the certificate area.
          </p>
        </section>

        {/* Right panel */}
        <aside className="rounded-2xl border border-[#f1e6df] bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#241000]">Field Properties</h2>
          <p className="mt-1 text-xs text-[#927e72]">
            Customize the selected field.
          </p>

          {!selectedField ? (
            <div className="mt-8 rounded-xl bg-[#fffaf7] p-5 text-center">
              <Type size={25} className="mx-auto text-orange-500" />
              <p className="mt-3 text-sm font-semibold text-[#604a3d]">
                No field selected
              </p>
              <p className="mt-1 text-xs text-[#927e72]">
                Add a field or select one on the certificate.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#604a3d]">
                  Field Label
                </label>
                <input
                  value={selectedField.label}
                  onChange={(e) =>
                    updateSelected("label", e.target.value)
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#604a3d]">
                  Field Key
                </label>
                <input
                  value={selectedField.key}
                  onChange={(e) =>
                    updateSelected(
                      "key",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "_")
                    )
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#604a3d]">
                  Font Family
                </label>
                <select
                  value={selectedField.fontFamily}
                  onChange={(e) =>
                    updateSelected("fontFamily", e.target.value)
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] bg-white px-3 text-sm outline-none focus:border-orange-400"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times New Roman</option>
                  <option value="Courier">Courier</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#604a3d]">
                    Font Size
                  </label>
                  <span className="text-xs font-bold text-orange-600">
                    {selectedField.fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="80"
                  value={selectedField.fontSize}
                  onChange={(e) =>
                    updateSelected("fontSize", Number(e.target.value))
                  }
                  className="mt-3 w-full accent-orange-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#604a3d]">
                  Text Color
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={selectedField.color}
                    onChange={(e) =>
                      updateSelected("color", e.target.value)
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border border-[#eee2da] bg-white p-1"
                  />
                  <span className="text-sm text-[#604a3d]">
                    {selectedField.color}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#604a3d]">
                  Text Alignment
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { value: "left", icon: AlignLeft },
                    { value: "center", icon: AlignCenter },
                    { value: "right", icon: AlignRight },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          updateSelected("align", item.value)
                        }
                        className={`flex h-10 items-center justify-center rounded-lg border ${
                          selectedField.align === item.value
                            ? "border-orange-400 bg-orange-50 text-orange-600"
                            : "border-[#eee2da] text-[#806e63]"
                        }`}
                      >
                        <Icon size={17} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSelected(
                    "fontWeight",
                    selectedField.fontWeight === "bold"
                      ? "normal"
                      : "bold"
                  )
                }
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${
                  selectedField.fontWeight === "bold"
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-[#eee2da] text-[#604a3d]"
                }`}
              >
                <Bold size={16} />
                Bold Text
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#604a3d]">
                    Width %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={selectedField.width}
                    onChange={(e) =>
                      updateSelected("width", Number(e.target.value))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#604a3d]">
                    Height %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={selectedField.height}
                    onChange={(e) =>
                      updateSelected("height", Number(e.target.value))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#604a3d]">
                    Position X
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={100 - selectedField.width}
                    value={Number(selectedField.x.toFixed(1))}
                    onChange={(e) =>
                      updateSelected("x", Number(e.target.value))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#604a3d]">
                    Position Y
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={100 - selectedField.height}
                    value={Number(selectedField.y.toFixed(1))}
                    onChange={(e) =>
                      updateSelected("y", Number(e.target.value))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-[#eee2da] px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={removeSelected}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-100 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} />
                Remove Field
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
