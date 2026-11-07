
import mongoose, { Schema, type Model } from "mongoose";

export interface ParticipantDocument extends mongoose.Document {
  eventId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  certificateId: string;
  participantName: string;
  email?: string;
  normalizedEmail?: string;
  data: Record<string, unknown>;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<ParticipantDocument>(
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
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    participantName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    normalizedEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

ParticipantSchema.index(
  { eventId: 1, categoryId: 1, normalizedEmail: 1 },
  {
    unique: true,
    partialFilterExpression: {
      normalizedEmail: { $type: "string" },
    },
  }
);

ParticipantSchema.index({
  eventId: 1,
  categoryId: 1,
  participantName: 1,
});

ParticipantSchema.index({
  eventId: 1,
  categoryId: 1,
  certificateId: 1,
});

const Participant: Model<ParticipantDocument> =
  mongoose.models.Participant ||
  mongoose.model<ParticipantDocument>("Participant", ParticipantSchema);

export default Participant;
