import { Request, Response, NextFunction } from 'express'
import { extractToken, verifyToken } from '../utils/jwt'
import { prisma } from '../config/database'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization)

    if (!token) {
      res.status(401).json({ error: 'Token de autenticación requerido' })
      return
    }

    const payload = verifyToken(token)

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    })

    if (!user) {
      res.status(401).json({ error: 'Usuario no encontrado' })
      return
    }

    req.userId = user.id
    req.userEmail = user.email
    next()
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
