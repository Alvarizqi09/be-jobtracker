import type { Response } from "express";
import type { AuthenticatedRequest } from "../types";
import { HttpError } from "../types";
import {
  getJobStats,
  getFunnelData,
  getTimelineEvents,
  getJobActivity,
} from "../services/analyticsService";

function requireUserId(req: AuthenticatedRequest): string {
  const uid = req.user?.uid;
  if (!uid) throw new HttpError(401, "Unauthorized");
  return uid;
}

export async function summaryHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const stats = await getJobStats(userId);
  res.json(stats);
}

export async function funnelHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const funnel = await getFunnelData(userId);
  res.json({ funnel });
}

export async function timelineHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const events = await getTimelineEvents(userId, year, month);
  res.json({ events });
}

export async function jobActivityHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const jobId = req.params.jobId;
  if (!jobId) throw new HttpError(400, "Missing job id");
  const events = await getJobActivity(userId, jobId);
  res.json({ events });
}
