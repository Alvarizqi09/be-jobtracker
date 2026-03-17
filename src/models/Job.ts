import { Schema, model, type InferSchemaType } from "mongoose";
import type { JobPriority, JobStatus } from "../types";

const JobSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    company: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [
        "wishlist",
        "applied",
        "interview",
        "offer",
        "rejected",
      ] satisfies JobStatus[],
      default: "wishlist",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"] satisfies JobPriority[],
      default: "medium",
    },
    salary: { type: String },
    location: { type: String },
    jobUrl: { type: String },
    description: { type: String },
    appliedDate: { type: Date },
    deadline: { type: Date },
    tags: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

JobSchema.index({ userId: 1, status: 1, order: 1 });

export type JobDoc = InferSchemaType<typeof JobSchema> & { _id: string };

export const JobModel = model("Job", JobSchema);
