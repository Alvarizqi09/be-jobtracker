import mongoose from "mongoose";
import { JobModel } from "../models/Job";
import type { JobPriority, JobStatus, TestType } from "../types";
import { HttpError } from "../types";

export interface ActivityEventDTO {
  _id: string;
  type: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface JobDTO {
  _id: string;
  userId: string;
  company: string;
  position: string;
  status: JobStatus;
  priority: JobPriority;
  salary?: string;
  testType?: TestType;
  location?: string;
  jobUrl?: string;
  description?: string;
  notes?: string;
  appliedDate?: string;
  deadline?: string;
  tags?: string[];
  order: number;
  activityLog?: ActivityEventDTO[];
  interviewQuestions?: any[];
  offerDetails?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  company: string;
  position: string;
  status: JobStatus;
  priority: JobPriority;
  salary?: string;
  testType?: TestType;
  location?: string;
  jobUrl?: string;
  description?: string;
  notes?: string;
  appliedDate?: Date;
  deadline?: Date;
  tags?: string[];
}

export interface UpdateJobInput extends Partial<CreateJobInput> {}

export interface UpdateJobStatusInput {
  status: JobStatus;
  order: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toActivityEventDTO(entry: any): ActivityEventDTO {
  const dto: ActivityEventDTO = {
    _id: String(entry._id),
    type: entry.type,
    description: entry.description,
    timestamp: entry.timestamp
      ? new Date(entry.timestamp).toISOString()
      : new Date().toISOString(),
  };
  if (entry.previousValue) dto.previousValue = entry.previousValue;
  if (entry.newValue) dto.newValue = entry.newValue;
  return dto;
}

function toJobDTO(doc: {
  _id: unknown;
  userId: string;
  company: string;
  position: string;
  status: JobStatus;
  priority: JobPriority;
  salary?: string | null;
  testType?: string | null;
  location?: string | null;
  jobUrl?: string | null;
  description?: string | null;
  notes?: string | null;
  appliedDate?: Date | null;
  deadline?: Date | null;
  tags?: string[] | null;
  order: number;
  activityLog?: any[];
  interviewQuestions?: any[];
  offerDetails?: any;
  createdAt: Date;
  updatedAt: Date;
}): JobDTO {
  const dto: JobDTO = {
    _id: String(doc._id),
    userId: doc.userId,
    company: doc.company,
    position: doc.position,
    status: doc.status,
    priority: doc.priority,
    order: doc.order,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
  if (doc.salary) dto.salary = doc.salary;
  if (doc.testType) dto.testType = doc.testType as TestType;
  if (doc.location) dto.location = doc.location;
  if (doc.jobUrl) dto.jobUrl = doc.jobUrl;
  if (doc.description) dto.description = doc.description;
  if (doc.notes) dto.notes = doc.notes;
  if (doc.appliedDate) dto.appliedDate = doc.appliedDate.toISOString();
  if (doc.deadline) dto.deadline = doc.deadline.toISOString();
  if (doc.tags && doc.tags.length > 0) dto.tags = doc.tags;
  if (doc.activityLog && doc.activityLog.length > 0) {
    dto.activityLog = doc.activityLog.map(toActivityEventDTO);
  }
  if (doc.interviewQuestions) dto.interviewQuestions = doc.interviewQuestions;
  if (doc.offerDetails) dto.offerDetails = doc.offerDetails;
  return dto;
}

type JobLean = {
  _id: unknown;
  userId: string;
  company: string;
  position: string;
  status: JobStatus;
  priority: JobPriority;
  salary?: string | null;
  testType?: string | null;
  location?: string | null;
  jobUrl?: string | null;
  description?: string | null;
  notes?: string | null;
  appliedDate?: Date | null;
  deadline?: Date | null;
  tags?: string[] | null;
  order: number;
  activityLog?: any[];
  interviewQuestions?: any[];
  offerDetails?: any;
  createdAt: Date;
  updatedAt: Date;
};

export async function listJobs(
  userId: string,
  status?: JobStatus,
): Promise<JobDTO[]> {
  const filter: { userId: string; status?: JobStatus } = { userId };
  if (status) filter.status = status;

  const jobs = await JobModel.find(filter)
    .sort({ status: 1, order: 1, createdAt: -1 })
    .lean<JobLean[]>();

  return jobs.map(toJobDTO);
}

export async function getJobById(
  userId: string,
  jobId: string,
): Promise<JobDTO> {
  const job = await JobModel.findOne({ _id: jobId, userId }).lean<JobLean>();
  if (!job) throw new HttpError(404, "Job not found");
  return toJobDTO(job);
}

export async function createJob(
  userId: string,
  input: CreateJobInput,
): Promise<JobDTO> {
  const lastInColumn = await JobModel.findOne({ userId, status: input.status })
    .sort({ order: -1 })
    .select({ order: 1 })
    .lean<{ order?: number }>();
  const nextOrder = (lastInColumn?.order ?? -1) + 1;

  const created = await JobModel.create({
    userId,
    ...input,
    order: nextOrder,
    activityLog: [
      {
        type: "created",
        description: `Job created — ${input.position} at ${input.company}`,
        timestamp: new Date(),
      },
    ],
  });

  const lean = await JobModel.findById(created._id).lean<JobLean>();
  if (!lean) throw new Error("Failed to load created job");
  return toJobDTO(lean);
}

export async function updateJob(
  userId: string,
  jobId: string,
  input: UpdateJobInput,
): Promise<JobDTO> {
  // Build activity log entries for the changes
  const logEntries: any[] = [];
  const existing = await JobModel.findOne({ _id: jobId, userId }).lean<JobLean>();
  if (!existing) throw new HttpError(404, "Job not found");

  if (input.status && input.status !== existing.status) {
    logEntries.push({
      type: "status_changed",
      description: `Status changed from ${existing.status} → ${input.status}`,
      previousValue: existing.status,
      newValue: input.status,
      timestamp: new Date(),
    });
  }

  if (input.notes !== undefined && input.notes !== (existing.notes ?? "")) {
    logEntries.push({
      type: "note_added",
      description: "Notes updated",
      timestamp: new Date(),
    });
  }

  // Log generic edit for other field changes
  const editFields = ["company", "position", "salary", "location", "jobUrl", "description", "priority"];
  const hasOtherEdits = editFields.some((f) => {
    const key = f as keyof UpdateJobInput;
    return input[key] !== undefined && input[key] !== (existing as any)[key];
  });
  if (hasOtherEdits) {
    logEntries.push({
      type: "edited",
      description: "Job details updated",
      timestamp: new Date(),
    });
  }

  const updateOp: any = { $set: input };
  if (logEntries.length > 0) {
    updateOp.$push = { activityLog: { $each: logEntries } };
  }

  const updated = await JobModel.findOneAndUpdate(
    { _id: jobId, userId },
    updateOp,
    { new: true },
  ).lean<JobLean>();
  if (!updated) throw new HttpError(404, "Job not found");
  return toJobDTO(updated);
}

export async function updateJobStatus(
  userId: string,
  jobId: string,
  input: UpdateJobStatusInput,
): Promise<JobDTO> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const job = await JobModel.findOne({ _id: jobId, userId }).session(session);
    if (!job) throw new HttpError(404, "Job not found");

    const previousStatus = job.status;

    // If moving between columns, clamp order within target column range.
    const targetCount = await JobModel.countDocuments({
      userId,
      status: input.status,
    }).session(session);
    const clampedOrder = Math.max(
      0,
      Math.min(input.order, Math.max(0, targetCount)),
    );

    // Log status change activity
    if (previousStatus !== input.status) {
      job.activityLog.push({
        type: "status_changed",
        description: `Status changed from ${previousStatus} → ${input.status}`,
        previousValue: previousStatus,
        newValue: input.status,
        timestamp: new Date(),
      } as any);
    }

    job.status = input.status;
    job.order = clampedOrder;
    await job.save({ session });

    await session.commitTransaction();
    const lean = await JobModel.findById(job._id).lean<JobLean>();
    if (!lean) throw new Error("Failed to load updated job");
    return toJobDTO(lean);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function deleteJob(userId: string, jobId: string): Promise<void> {
  const deleted = await JobModel.findOneAndDelete({ _id: jobId, userId }).lean<{
    _id: unknown;
  }>();
  if (!deleted) throw new HttpError(404, "Job not found");
}

export async function addActivityLog(
  userId: string,
  jobId: string,
  entry: { type: string; description: string; previousValue?: string; newValue?: string },
): Promise<void> {
  const result = await JobModel.updateOne(
    { _id: jobId, userId },
    {
      $push: {
        activityLog: {
          ...entry,
          timestamp: new Date(),
        },
      },
    },
  );
  if (result.matchedCount === 0) throw new HttpError(404, "Job not found");
}

export interface JobStatsSummary {
  total: number;
  byStatus: Record<JobStatus, number>;
  monthlyApplications: { month: string; count: number }[];
}

const STATUSES: JobStatus[] = [
  "wishlist",
  "applied",
  "online_test",
  "interview",
  "offer",
  "rejected",
];

export async function getStatsSummary(
  userId: string,
): Promise<JobStatsSummary> {
  const [total, byStatusAgg, monthlyAgg] = await Promise.all([
    JobModel.countDocuments({ userId }),
    JobModel.aggregate<{ _id: JobStatus; count: number }>([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    JobModel.aggregate<{ _id: { y: number; m: number }; count: number }>([
      { $match: { userId } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
      { $limit: 12 },
    ]),
  ]);

  const byStatus: Record<JobStatus, number> = {
    wishlist: 0,
    applied: 0,
    online_test: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const row of byStatusAgg) {
    if (STATUSES.includes(row._id)) byStatus[row._id] = row.count;
  }

  const monthlyApplications = monthlyAgg.map((row) => {
    const month = `${row._id.y}-${String(row._id.m).padStart(2, "0")}`;
    return { month, count: row.count };
  });

  return { total, byStatus, monthlyApplications };
}
