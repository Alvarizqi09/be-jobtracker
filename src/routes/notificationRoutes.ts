import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  listNotificationsHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  dismissNotificationHandler,
} from "../controllers/notificationController";

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

notificationRoutes.get("/", listNotificationsHandler);
notificationRoutes.patch("/:id/read", markAsReadHandler);
notificationRoutes.patch("/read-all", markAllAsReadHandler);
notificationRoutes.delete("/:id", dismissNotificationHandler);
