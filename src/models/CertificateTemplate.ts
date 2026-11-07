
import mongoose, { Schema, type Model } from "mongoose";

export type CertificateFieldType =
  | "participantName"
  | "workshopTitle"
  | "eventName"
  | "eventDates"
  | "venue"
  | "custom";

export interface ICertificateField {
  key: string;
  label: string;
  type: CertificateFieldType;
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

export interface ICertificateTemplate {
  eventId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  fileId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fields: ICertificateField[];
  status: "draft" | "published";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateFieldSchema = new Schema<ICertificateField>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "participantName",
        "workshopTitle",
        "eventName",
        "eventDates",
        "venue",
        "custom",
      ],
      required: true,
    },
    x: { type: Number, default: 50, min: 0, max: 100 },
    y: { type: Number, default: 50, min: 0, max: 100 },
    width: { type: Number, default: 30, min: 1, max: 100 },
    height: { type: Number, default: 8, min: 1, max: 100 },
    fontSize: { type: Number, default: 24, min: 6, max: 200 },
    fontFamily: { type: String, default: "Helvetica" },
    color: { type: String, default: "#000000" },
    align: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center",
    },
    fontWeight: {
      type: String,
      enum: ["normal", "bold"],
      default: "normal",
    },
  },
  { _id: false }
);

const CertificateTemplateSchema = new Schema<ICertificateTemplate>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ["application/pdf", "image/png", "image/jpeg"],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fields: {
      type: [CertificateFieldSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

CertificateTemplateSchema.index({
  eventId: 1,
  categoryId: 1,
  createdAt: -1,
});

const CertificateTemplate: Model<ICertificateTemplate> =
  mongoose.models.CertificateTemplate ||
  mongoose.model<ICertificateTemplate>(
    "CertificateTemplate",
    CertificateTemplateSchema
  );

export default CertificateTemplate;
