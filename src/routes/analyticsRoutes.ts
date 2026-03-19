import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  summaryHandler,
  funnelHandler,
  timelineHandler,
  jobActivityHandler,
} from "../controllers/analyticsController";

export const analyticsRoutes = Router();

analyticsRoutes.use(requireAuth);

analyticsRoutes.get("/summary", summaryHandler);
analyticsRoutes.get("/funnel", funnelHandler);
analyticsRoutes.get("/timeline", timelineHandler);
analyticsRoutes.get("/jobs/:jobId/activity", jobActivityHandler);
