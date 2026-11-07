
import mongoose, { Schema, type Model } from "mongoose";

export type EventStatus = "draft" | "published" | "archived";

export interface IEvent {
  name: string;
  slug: string;
  description: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  city: string;
  organizer: string;
  status: EventStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    organizer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Event: Model<IEvent> =
  mongoose.models.Event ||
  mongoose.model<IEvent>("Event", EventSchema);

export default Event;
