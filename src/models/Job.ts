import { Schema, model, type InferSchemaType } from "mongoose";
import type { JobPriority, JobStatus } from "../types";

const ActivityLogEntrySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "status_changed",
        "note_added",
        "cover_letter_generated",
        "created",
        "edited",
      ],
      required: true,
    },
    description: { type: String, required: true },
    previousValue: { type: String },
    newValue: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
);

const InterviewQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    category: {
      type: String,
      enum: ["technical", "behavioral", "company", "roleSpecific"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    hint: { type: String },
    userAnswer: { type: String, default: "" },
    isAnswered: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ["ai_generated", "user_added"],
      default: "ai_generated",
    },
  },
  { _id: false },
);

const OfferDetailsSchema = new Schema(
  {
    offeredSalary: { type: String },
    negotiatedSalary: { type: String },
    offerDeadline: { type: Date },
    negotiationNotes: { type: String },
    decision: {
      type: String,
      enum: ["pending", "accepted", "declined", "negotiating"],
      default: "pending",
    },
  },
  { _id: false },
);

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
    notes: { type: String },
    appliedDate: { type: Date },
    deadline: { type: Date },
    tags: [{ type: String }],
    order: { type: Number, default: 0 },
    activityLog: [ActivityLogEntrySchema],
    interviewQuestions: { type: [InterviewQuestionSchema], default: [] },
    offerDetails: { type: OfferDetailsSchema },
  },
  { timestamps: true },
);

JobSchema.index({ userId: 1, status: 1, order: 1 });

export type ActivityLogEntry = InferSchemaType<typeof ActivityLogEntrySchema>;
export type JobDoc = InferSchemaType<typeof JobSchema> & { _id: string };

export const JobModel = model("Job", JobSchema);
