import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  createJobHandler,
  deleteJobHandler,
  generateInterviewPrepHandler,
  getJobHandler,
  listJobsHandler,
  saveInterviewQuestionsHandler,
  statsSummaryHandler,
  updateInterviewAnswerHandler,
  updateJobHandler,
  updateJobStatusHandler,
} from "../controllers/jobController";

export const jobRoutes = Router();

jobRoutes.use(requireAuth);

jobRoutes.get("/stats/summary", statsSummaryHandler);
jobRoutes.get("/", listJobsHandler);
jobRoutes.post("/", createJobHandler);
jobRoutes.get("/:id", getJobHandler);
jobRoutes.put("/:id", updateJobHandler);
jobRoutes.patch("/:id/status", updateJobStatusHandler);
jobRoutes.delete("/:id", deleteJobHandler);

// Interview prep
jobRoutes.post("/:id/interview-prep/generate", generateInterviewPrepHandler);
jobRoutes.put("/:id/interview-prep", saveInterviewQuestionsHandler);
jobRoutes.patch("/:id/interview-prep/:qId", updateInterviewAnswerHandler);
