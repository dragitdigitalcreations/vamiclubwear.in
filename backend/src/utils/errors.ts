// Custom error hierarchy — gives controllers clean error types to check

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message)
  }
}

export class InsufficientStockError extends AppError {
  constructor(sku: string, available: number, requested: number) {
    super(
      409,
      `Insufficient stock for SKU ${sku}: ${available} available, ${requested} requested`
    )
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message)
  }
}
