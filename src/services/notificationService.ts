import { NotificationModel } from "../models/Notification";
import { HttpError } from "../types";

export async function listNotifications(userId: string) {
  return NotificationModel.find({ userId, isDismissed: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function markAsRead(userId: string, notificationId: string) {
  const notif = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true },
  ).lean();
  if (!notif) throw new HttpError(404, "Notification not found");
  return notif;
}

export async function markAllAsRead(userId: string) {
  await NotificationModel.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } },
  );
}

export async function dismissNotification(
  userId: string,
  notificationId: string,
) {
  const notif = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isDismissed: true } },
    { new: true },
  ).lean();
  if (!notif) throw new HttpError(404, "Notification not found");
  return notif;
}

export async function createNotification(
  userId: string,
  data: {
    type: string;
    title: string;
    message: string;
    jobId?: string;
    contactId?: string;
    triggerDate: Date;
  },
) {
  const notif = await NotificationModel.create({ userId, ...data });
  return notif.toObject();
}

export async function deleteAllUserNotifications(userId: string) {
  await NotificationModel.deleteMany({ userId });
}
