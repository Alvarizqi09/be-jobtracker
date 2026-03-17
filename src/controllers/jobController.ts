import type { Response } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest, JobPriority, JobStatus } from '../types'
import {
  createJob,
  deleteJob,
  getJobById,
  getStatsSummary,
  listJobs,
  updateJob,
  updateJobStatus,
} from '../services/jobService'
import { HttpError } from '../types'

const jobStatusSchema = z.enum(['wishlist', 'applied', 'interview', 'offer', 'rejected'])
const jobPrioritySchema = z.enum(['low', 'medium', 'high'])

const createJobSchema = z.object({
  company: z.string().min(1).max(120),
  position: z.string().min(1).max(120),
  status: jobStatusSchema,
  priority: jobPrioritySchema,
  salary: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  jobUrl: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
  appliedDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  tags: z.array(z.string().min(1).max(32)).max(20).optional(),
})

const updateJobSchema = createJobSchema.partial().extend({
  status: jobStatusSchema.optional(),
  priority: jobPrioritySchema.optional(),
})

const updateStatusSchema = z.object({
  status: jobStatusSchema,
  order: z.number().int().min(0),
})

function requireUserId(req: AuthenticatedRequest): string {
  const uid = req.user?.uid
  if (!uid) throw new HttpError(401, 'Unauthorized')
  return uid
}

function requireJobId(req: AuthenticatedRequest): string {
  const id = req.params.id
  if (!id) throw new HttpError(400, 'Missing job id')
  return id
}

function parseDateOrUndefined(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date')
  return d
}

function parseDateStrict(value: string): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date')
  return d
}

export async function listJobsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  const status = req.query.status as JobStatus | undefined
  if (status && !jobStatusSchema.safeParse(status).success) throw new HttpError(400, 'Invalid status filter')
  const jobs = await listJobs(userId, status)
  res.json({ jobs })
}

export async function createJobHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  const input = createJobSchema.parse(req.body)
  const payload: {
    company: string
    position: string
    status: JobStatus
    priority: JobPriority
    salary?: string
    location?: string
    jobUrl?: string
    notes?: string
    appliedDate?: Date
    deadline?: Date
    tags?: string[]
  } = {
    company: input.company,
    position: input.position,
    status: input.status,
    priority: input.priority,
  }
  if (input.salary) payload.salary = input.salary
  if (input.location) payload.location = input.location
  if (input.jobUrl) payload.jobUrl = input.jobUrl
  if (input.notes) payload.notes = input.notes
  const appliedDate = parseDateOrUndefined(input.appliedDate)
  if (appliedDate) payload.appliedDate = appliedDate
  const deadline = parseDateOrUndefined(input.deadline)
  if (deadline) payload.deadline = deadline
  if (input.tags && input.tags.length > 0) payload.tags = input.tags

  const created = await createJob(userId, payload)
  res.status(201).json({ job: created })
}

export async function getJobHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  const job = await getJobById(userId, requireJobId(req))
  res.json({ job })
}

export async function updateJobHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  const input = updateJobSchema.parse(req.body)
  const jobId = requireJobId(req)
  const patch: {
    company?: string
    position?: string
    status?: JobStatus
    priority?: JobPriority
    salary?: string
    location?: string
    jobUrl?: string
    notes?: string
    appliedDate?: Date
    deadline?: Date
    tags?: string[]
  } = {}
  if (typeof input.company === 'string') patch.company = input.company
  if (typeof input.position === 'string') patch.position = input.position
  if (input.status) patch.status = input.status
  if (input.priority) patch.priority = input.priority
  if (typeof input.salary === 'string') patch.salary = input.salary
  if (typeof input.location === 'string') patch.location = input.location
  if (typeof input.jobUrl === 'string') patch.jobUrl = input.jobUrl
  if (typeof input.notes === 'string') patch.notes = input.notes
  if (input.appliedDate) patch.appliedDate = parseDateStrict(input.appliedDate)
  if (input.deadline) patch.deadline = parseDateStrict(input.deadline)
  if (input.tags) patch.tags = input.tags

  const updated = await updateJob(userId, jobId, patch)
  res.json({ job: updated })
}

export async function updateJobStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  const input = updateStatusSchema.parse(req.body)
  const updated = await updateJobStatus(userId, requireJobId(req), input)
  res.json({ job: updated })
}

export async function deleteJobHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  await deleteJob(userId, requireJobId(req))
  res.status(204).send()
}

export async function statsSummaryHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req)
  const summary = await getStatsSummary(userId)
  res.json(summary)
}

