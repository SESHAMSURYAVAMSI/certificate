
import mongoose, { Schema, type Model } from "mongoose";

export interface IGeneratedCertificate {
  eventId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  participantId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  certificateId: string;
  fileId: mongoose.Types.ObjectId;
  fileName: string;
  fileSize: number;
  status: "generated" | "revoked";
  generatedBy: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedCertificateSchema =
  new Schema<IGeneratedCertificate>(
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
      participantId: {
        type: Schema.Types.ObjectId,
        ref: "Participant",
        required: true,
        index: true,
      },
      templateId: {
        type: Schema.Types.ObjectId,
        ref: "CertificateTemplate",
        required: true,
      },
      certificateId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      fileId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      fileName: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
        required: true,
        min: 0,
      },
      status: {
        type: String,
        enum: ["generated", "revoked"],
        default: "generated",
      },
      generatedBy: {
        type: String,
        required: true,
      },
      generatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { timestamps: true }
  );

GeneratedCertificateSchema.index({
  eventId: 1,
  categoryId: 1,
  participantId: 1,
  generatedAt: -1,
});

const GeneratedCertificate: Model<IGeneratedCertificate> =
  mongoose.models.GeneratedCertificate ||
  mongoose.model<IGeneratedCertificate>(
    "GeneratedCertificate",
    GeneratedCertificateSchema
  );

export default GeneratedCertificate;
