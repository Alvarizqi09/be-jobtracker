import { JobModel } from "../models/Job";
import type { JobStatus } from "../types";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from "date-fns";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ──────────────────────────────────────────────────────────────
export interface MonthlyData {
  month: string;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface SalaryRange {
  range: string;
  count: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface JobStatsResult {
  total: number;
  byStatus: Record<string, number>;
  monthlyApplications: MonthlyData[];
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgDaysToResponse: number;
  mostAppliedTags: TagCount[];
  salaryDistribution: SalaryRange[];
}

export interface TimelineEventResult {
  _id: string;
  jobId: string;
  company: string;
  position: string;
  type: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────
const STATUS_ORDER: JobStatus[] = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
];

function parseSalaryToNumber(salary: string): number {
  const cleaned = salary.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function getSalaryBucket(salary: string): string {
  const val = parseSalaryToNumber(salary);
  if (val === 0) return "Not specified";
  if (val < 5_000_000) return "< 5M";
  if (val < 10_000_000) return "5–10M";
  if (val < 15_000_000) return "10–15M";
  if (val < 25_000_000) return "15–25M";
  return "> 25M";
}

// ── Service Functions ─────────────────────────────────────────────────

export async function getJobStats(userId: string): Promise<JobStatsResult> {
  const jobs = await JobModel.find({ userId }).lean<any[]>();

  // By status
  const byStatus: Record<string, number> = {};
  for (const s of STATUS_ORDER) byStatus[s] = 0;
  for (const j of jobs) {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
  }

  // Applied = not wishlist
  const appliedJobs = jobs.filter((j) => j.status !== "wishlist");
  const respondedJobs = jobs.filter(
    (j) => !["wishlist", "applied"].includes(j.status),
  );
  const interviewJobs = jobs.filter((j) => j.status === "interview" || j.status === "offer");
  const offerJobs = jobs.filter((j) => j.status === "offer");

  const appliedCount = Math.max(appliedJobs.length, 1);
  const responseRate = Math.round((respondedJobs.length / appliedCount) * 100);
  const interviewRate = Math.round((interviewJobs.length / appliedCount) * 100);
  const offerRate = Math.round((offerJobs.length / appliedCount) * 100);

  // Average days to response
  let totalDays = 0;
  let respCount = 0;
  for (const j of respondedJobs) {
    if (j.appliedDate) {
      const applied = new Date(j.appliedDate);
      // Use the first status_changed activity or updatedAt
      const firstResponse = j.activityLog?.find(
        (a: any) => a.type === "status_changed" && a.newValue !== "applied",
      );
      const responseDate = firstResponse
        ? new Date(firstResponse.timestamp)
        : new Date(j.updatedAt);
      const days = differenceInDays(responseDate, applied);
      if (days >= 0) {
        totalDays += days;
        respCount++;
      }
    }
  }
  const avgDaysToResponse = respCount > 0 ? Math.round(totalDays / respCount) : 0;

  // Monthly applications (last 6 months)
  const now = new Date();
  const monthlyApplications: MonthlyData[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const label = format(monthDate, "MMM yyyy");

    const monthJobs = jobs.filter((j) => {
      const created = new Date(j.createdAt);
      return created >= monthStart && created <= monthEnd;
    });

    monthlyApplications.push({
      month: label,
      applied: monthJobs.filter((j) => j.status === "applied").length,
      interview: monthJobs.filter(
        (j) => j.status === "interview" || j.status === "offer",
      ).length,
      offer: monthJobs.filter((j) => j.status === "offer").length,
      rejected: monthJobs.filter((j) => j.status === "rejected").length,
    });
  }

  // Most applied tags
  const tagMap: Record<string, number> = {};
  for (const j of jobs) {
    if (j.tags) {
      for (const t of j.tags) {
        tagMap[t] = (tagMap[t] || 0) + 1;
      }
    }
  }
  const mostAppliedTags: TagCount[] = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  // Salary distribution
  const salaryBuckets: Record<string, number> = {};
  for (const j of jobs) {
    if (j.salary) {
      const bucket = getSalaryBucket(j.salary);
      salaryBuckets[bucket] = (salaryBuckets[bucket] || 0) + 1;
    }
  }
  const salaryOrder = ["< 5M", "5–10M", "10–15M", "15–25M", "> 25M", "Not specified"];
  const salaryDistribution: SalaryRange[] = salaryOrder
    .filter((r) => salaryBuckets[r])
    .map((range) => ({ range, count: salaryBuckets[range] || 0 }));

  return {
    total: jobs.length,
    byStatus,
    monthlyApplications,
    responseRate,
    interviewRate,
    offerRate,
    avgDaysToResponse,
    mostAppliedTags,
    salaryDistribution,
  };
}

export async function getFunnelData(
  userId: string,
): Promise<FunnelStage[]> {
  const jobs = await JobModel.find({ userId }).lean<any[]>();
  const total = jobs.length;
  if (total === 0) return [];

  const applied = jobs.filter((j) => j.status !== "wishlist").length;
  const responded = jobs.filter(
    (j) => !["wishlist", "applied"].includes(j.status),
  ).length;
  const interviewed = jobs.filter(
    (j) => j.status === "interview" || j.status === "offer",
  ).length;
  const offered = jobs.filter((j) => j.status === "offer").length;

  return [
    { stage: "Applied", count: applied, percentage: Math.round((applied / Math.max(total, 1)) * 100) },
    { stage: "Response", count: responded, percentage: Math.round((responded / Math.max(applied, 1)) * 100) },
    { stage: "Interview", count: interviewed, percentage: Math.round((interviewed / Math.max(applied, 1)) * 100) },
    { stage: "Offer", count: offered, percentage: Math.round((offered / Math.max(applied, 1)) * 100) },
  ];
}

export async function getTimelineEvents(
  userId: string,
  year: number,
  month: number,
): Promise<TimelineEventResult[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const jobs = await JobModel.find({ userId }).lean<any[]>();

  const events: TimelineEventResult[] = [];

  for (const job of jobs) {
    // Add creation event if in range
    const createdAt = new Date(job.createdAt);
    if (createdAt >= start && createdAt <= end) {
      // Check if there's already a "created" entry in activityLog
      const hasCreatedLog = job.activityLog?.some((a: any) => a.type === "created");
      if (!hasCreatedLog) {
        events.push({
          _id: `${job._id}-created`,
          jobId: String(job._id),
          company: job.company,
          position: job.position,
          type: "created",
          description: `Applied to ${job.position} at ${job.company}`,
          timestamp: createdAt.toISOString(),
          status: job.status,
        });
      }
    }

    // Add activity log events in range
    if (job.activityLog) {
      for (const entry of job.activityLog) {
        const ts = new Date(entry.timestamp);
        if (ts >= start && ts <= end) {
          events.push({
            _id: String(entry._id),
            jobId: String(job._id),
            company: job.company,
            position: job.position,
            type: entry.type,
            description: entry.description,
            previousValue: entry.previousValue,
            newValue: entry.newValue,
            timestamp: ts.toISOString(),
            status: job.status,
          });
        }
      }
    }
  }

  // Sort by timestamp descending
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return events;
}

export async function getJobActivity(
  userId: string,
  jobId: string,
): Promise<TimelineEventResult[]> {
  const job = await JobModel.findOne({ _id: jobId, userId }).lean<any>();
  if (!job) return [];

  const events: TimelineEventResult[] = [];
  if (job.activityLog) {
    for (const entry of job.activityLog) {
      events.push({
        _id: String(entry._id),
        jobId: String(job._id),
        company: job.company,
        position: job.position,
        type: entry.type,
        description: entry.description,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        timestamp: new Date(entry.timestamp).toISOString(),
        status: job.status,
      });
    }
  }

  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return events;
}
