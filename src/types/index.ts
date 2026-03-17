import type { Request } from 'express'

export type JobStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected'
export type JobPriority = 'low' | 'medium' | 'high'

export interface AuthedUser {
  uid: string
  email: string
  name?: string
  picture?: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthedUser
}

export class HttpError extends Error {
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

