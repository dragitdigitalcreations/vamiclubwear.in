import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

type Target = 'body' | 'query' | 'params'

/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/', validate(createProductSchema), controller.create)
 *   router.get('/', validate(listQuerySchema, 'query'), controller.list)
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])

    if (!result.success) {
      const errors = result.error.errors.map((e: ZodError['errors'][number]) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      res.status(400).json({ error: 'Validation failed', details: errors })
      return
    }

    // Express 5 made req.query a getter-only property — use defineProperty to override it.
    Object.defineProperty(req, target, {
      value: result.data,
      writable: true,
      configurable: true,
    })
    next()
  }
}
