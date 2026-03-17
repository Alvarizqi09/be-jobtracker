import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { HttpError } from '../types'

interface ErrorResponse {
  message: string
  code?: string
  details?: unknown
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      message: err.message,
      code: 'HTTP_ERROR',
      details: err.details,
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.flatten(),
    })
    return
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: 'Invalid id', code: 'CAST_ERROR' })
    return
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: 'Database validation error',
      code: 'MONGOOSE_VALIDATION_ERROR',
      details: err.errors,
    })
    return
  }

  // eslint-disable-next-line no-console
  console.error(err)
  res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' })
}

