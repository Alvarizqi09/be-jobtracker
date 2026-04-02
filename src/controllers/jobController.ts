import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest, JobPriority, JobStatus, TestType } from "../types";
import {
  createJob,
  deleteJob,
  getJobById,
  getStatsSummary,
  listJobs,
  updateJob,
  updateJobStatus,
} from "../services/jobService";
import { HttpError } from "../types";
import { generateInterviewQuestions } from "../services/geminiService";
import { UserModel } from "../models/User";
import { JobModel } from "../models/Job";

const jobStatusSchema = z.enum([
  "wishlist",
  "applied",
  "online_test",
  "interview",
  "offer",
  "rejected",
]);
const jobPrioritySchema = z.enum(["low", "medium", "high"]);
const testTypeSchema = z.enum(["online_test", "psikotest", "intelligence", "technical", "assessment", "other"]);

const createJobSchema = z.object({
  company: z.string().min(1).max(120),
  position: z.string().min(1).max(120),
  status: jobStatusSchema,
  priority: jobPrioritySchema,
  testType: testTypeSchema.optional(),
  salary: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  jobUrl: z.string().url().optional(),
  description: z.string().max(5000).optional(),
  notes: z.string().max(10000).optional(),
  appliedDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional(),
});

const updateJobSchema = createJobSchema.partial().extend({
  status: jobStatusSchema.optional(),
  priority: jobPrioritySchema.optional(),
  offerDetails: z
    .object({
      offeredSalary: z.string().optional(),
      negotiatedSalary: z.string().optional(),
      offerDeadline: z.string().datetime().optional(),
      negotiationNotes: z.string().max(5000).optional(),
      decision: z
        .enum(["pending", "accepted", "declined", "negotiating"])
        .optional(),
    })
    .optional(),
});

const updateStatusSchema = z.object({
  status: jobStatusSchema,
  order: z.number().int().min(0),
});

function requireUserId(req: AuthenticatedRequest): string {
  const uid = req.user?.uid;
  if (!uid) throw new HttpError(401, "Unauthorized");
  return uid;
}

function requireJobId(req: AuthenticatedRequest): string {
  const id = req.params.id;
  if (!id) throw new HttpError(400, "Missing job id");
  return id;
}

function parseDateOrUndefined(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

function parseDateStrict(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

export async function listJobsHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const status = req.query.status as JobStatus | undefined;
  if (status && !jobStatusSchema.safeParse(status).success)
    throw new HttpError(400, "Invalid status filter");
  const jobs = await listJobs(userId, status);
  res.json({ jobs });
}

export async function createJobHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const input = createJobSchema.parse(req.body);
  const payload: {
    company: string;
    position: string;
    status: JobStatus;
    priority: JobPriority;
    salary?: string;
    location?: string;
    jobUrl?: string;
    description?: string;
    notes?: string;
    testType?: TestType;
    appliedDate?: Date;
    deadline?: Date;
    tags?: string[];
  } = {
    company: input.company,
    position: input.position,
    status: input.status,
    priority: input.priority,
  };
  if (input.salary) payload.salary = input.salary;
  if (input.location) payload.location = input.location;
  if (input.jobUrl) payload.jobUrl = input.jobUrl;
  if (input.description) payload.description = input.description;
  if (input.notes) payload.notes = input.notes;
  if (input.testType) payload.testType = input.testType as TestType;
  const appliedDate = parseDateOrUndefined(input.appliedDate);
  if (appliedDate) payload.appliedDate = appliedDate;
  const deadline = parseDateOrUndefined(input.deadline);
  if (deadline) payload.deadline = deadline;
  if (input.tags && input.tags.length > 0) payload.tags = input.tags;

  const created = await createJob(userId, payload);
  res.status(201).json({ job: created });
}

export async function getJobHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const job = await getJobById(userId, requireJobId(req));
  res.json({ job });
}

export async function updateJobHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const input = updateJobSchema.parse(req.body);
  const jobId = requireJobId(req);
  const patch: Record<string, any> = {};
  if (typeof input.company === "string") patch.company = input.company;
  if (typeof input.position === "string") patch.position = input.position;
  if (input.status) patch.status = input.status;
  if (input.priority) patch.priority = input.priority;
  if (typeof input.salary === "string") patch.salary = input.salary;
  if (typeof input.location === "string") patch.location = input.location;
  if (typeof input.jobUrl === "string") patch.jobUrl = input.jobUrl;
  if (typeof input.description === "string")
    patch.description = input.description;
  if (typeof input.notes === "string") patch.notes = input.notes;
  if (input.testType) patch.testType = input.testType;
  if (input.appliedDate) patch.appliedDate = parseDateStrict(input.appliedDate);
  if (input.deadline) patch.deadline = parseDateStrict(input.deadline);
  if (input.tags) patch.tags = input.tags;
  if (input.offerDetails) patch.offerDetails = input.offerDetails;

  const updated = await updateJob(userId, jobId, patch);
  res.json({ job: updated });
}

export async function updateJobStatusHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const input = updateStatusSchema.parse(req.body);
  const updated = await updateJobStatus(userId, requireJobId(req), input);
  res.json({ job: updated });
}

export async function deleteJobHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  await deleteJob(userId, requireJobId(req));
  res.status(204).send();
}

export async function statsSummaryHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const summary = await getStatsSummary(userId);
  res.json(summary);
}

/* ──── Interview Prep Handlers ──── */

export async function generateInterviewPrepHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const jobId = requireJobId(req);
  const job = await getJobById(userId, jobId);

  const user = await UserModel.findOne({ firebaseUid: userId }).lean();
  const skills: string[] = user?.profile?.skills ?? [];

  const questions = await generateInterviewQuestions(
    job.position,
    job.description ?? "",
    job.company,
    skills,
  );

  await JobModel.findOneAndUpdate(
    { _id: jobId, userId },
    { $push: { interviewQuestions: { $each: questions } } },
  );

  res.json({ questions });
}

export async function saveInterviewQuestionsHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const jobId = requireJobId(req);

  const schema = z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      category: z.enum(["technical", "behavioral", "company", "roleSpecific"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      hint: z.string().optional(),
      userAnswer: z.string().optional(),
      isAnswered: z.boolean().optional(),
      source: z.enum(["ai_generated", "user_added"]).optional(),
    }),
  );

  const questions = schema.parse(req.body);
  await JobModel.findOneAndUpdate(
    { _id: jobId, userId },
    { $set: { interviewQuestions: questions } },
  );
  res.json({ ok: true });
}

export async function updateInterviewAnswerHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const jobId = requireJobId(req);
  const questionId = req.params.qId;
  if (!questionId) throw new HttpError(400, "Missing question id");

  const schema = z.object({
    userAnswer: z.string().optional(),
    isAnswered: z.boolean().optional(),
  });
  const input = schema.parse(req.body);

  const update: Record<string, any> = {};
  if (typeof input.userAnswer === "string")
    update["interviewQuestions.$.userAnswer"] = input.userAnswer;
  if (typeof input.isAnswered === "boolean")
    update["interviewQuestions.$.isAnswered"] = input.isAnswered;

  await JobModel.findOneAndUpdate(
    { _id: jobId, userId, "interviewQuestions.id": questionId },
    { $set: update },
  );
  res.json({ ok: true });
}
