import { Schema, model, Types, type InferSchemaType } from "mongoose";

const CoverLetterSchema = new Schema(
  {
    userId: { type: String, required: true, index: true }, // reference to firebaseUid
    jobId: { type: Types.ObjectId, ref: "Job" }, // optional link to a job application
    companyName: { type: String, required: true },
    jobTitle: { type: String, required: true },
    jobDescription: { type: String },
    content: { type: String, required: true },
    style: {
      type: String,
      enum: ["formal", "conversational", "creative"],
      required: true,
    },
    language: {
      type: String,
      enum: ["english", "indonesian"],
      required: true,
      default: "english",
    },
    isEdited: { type: Boolean, required: true, default: false },
    wordCount: { type: Number, required: true },
  },
  { timestamps: true },
);

export type CoverLetterDoc = InferSchemaType<typeof CoverLetterSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const CoverLetterModel = model("CoverLetter", CoverLetterSchema);
