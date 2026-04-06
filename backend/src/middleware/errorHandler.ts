import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { Prisma } from '@prisma/client'

/**
 * Global error handler — must be registered last in the Express middleware chain.
 * Converts AppError and Prisma errors into consistent JSON responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Prisma unique constraint violation
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const fields = (err.meta?.target as string[])?.join(', ') ?? 'field'
    res.status(409).json({ error: `A record with this ${fields} already exists` })
    return
  }

  // Prisma record not found
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2025'
  ) {
    res.status(404).json({ error: 'Record not found' })
    return
  }

  // Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ error: 'Invalid database input' })
    return
  }

  // Unknown — log internally, don't leak details to client
  console.error('[error]', err)
  res.status(500).json({
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
  })
}
