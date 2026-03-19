import { Schema, model, type InferSchemaType } from "mongoose";

const ContactSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    phone: { type: String, trim: true },
    linkedJobIds: { type: [String], default: [] },
    notes: { type: String },
    lastContactDate: { type: Date },
    followUpDate: { type: Date },
    relationship: {
      type: String,
      enum: ["recruiter", "interviewer", "referral", "connection", "other"],
      default: "other",
    },
  },
  { timestamps: true },
);

ContactSchema.index({ userId: 1, company: 1 });

export type ContactDoc = InferSchemaType<typeof ContactSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const ContactModel = model("Contact", ContactSchema);
