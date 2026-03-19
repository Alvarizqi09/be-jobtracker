import type { Response } from "express";
import type { AuthenticatedRequest } from "../types";
import { HttpError } from "../types";
import * as notifService from "../services/notificationService";

function requireUserId(req: AuthenticatedRequest): string {
  const uid = req.user?.uid;
  if (!uid) throw new HttpError(401, "Unauthorized");
  return uid;
}

export async function listNotificationsHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const notifications = await notifService.listNotifications(userId);
  res.json({ notifications });
}

export async function markAsReadHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const notifId = req.params.id;
  if (!notifId) throw new HttpError(400, "Missing notification id");
  const notification = await notifService.markAsRead(userId, notifId);
  res.json({ notification });
}

export async function markAllAsReadHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  await notifService.markAllAsRead(userId);
  res.json({ ok: true });
}

export async function dismissNotificationHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const notifId = req.params.id;
  if (!notifId) throw new HttpError(400, "Missing notification id");
  await notifService.dismissNotification(userId, notifId);
  res.status(204).send();
}

import { generateDailyNotifications } from "../services/cronService";

export async function triggerCronHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  // We can restrict this to admins later, but allow for testing now
  await generateDailyNotifications();
  res.json({ message: "Cron triggered successfully" });
}
