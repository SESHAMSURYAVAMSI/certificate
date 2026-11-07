
import mongoose, { Schema, type Model } from "mongoose";

export type ParticipantFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select";

export interface IParticipantField {
  label: string;
  key: string;
  type: ParticipantFieldType;
  required: boolean;
  options: string[];
  placeholder: string;
}

export interface ICategory {
  eventId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  fields: IParticipantField[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantFieldSchema = new Schema<IParticipantField>(
  {
    label: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    type: {
      type: String,
      enum: ["text", "email", "number", "date", "textarea", "select"],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    placeholder: { type: String, default: "" },
  },
  { _id: true }
);

const CategorySchema = new Schema<ICategory>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    fields: { type: [ParticipantFieldSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CategorySchema.index({ eventId: 1, slug: 1 }, { unique: true });

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
