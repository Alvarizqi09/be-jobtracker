import { Schema, model, type InferSchemaType } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "deadline_approaching",
        "follow_up_reminder",
        "interview_today",
        "stale_application",
        "offer_expiring",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    jobId: { type: String },
    contactId: { type: String },
    isRead: { type: Boolean, default: false },
    isDismissed: { type: Boolean, default: false },
    triggerDate: { type: Date, required: true },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const NotificationModel = model("Notification", NotificationSchema);
