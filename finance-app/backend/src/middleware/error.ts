import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Error de validación',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // App errors (expected)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
    return
  }

  // Prisma errors
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Recurso no encontrado' })
    return
  }

  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos' })
    return
  }

  // Unknown errors
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.isDev && { details: err.message, stack: err.stack }),
  })
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` })
}
