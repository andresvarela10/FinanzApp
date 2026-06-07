import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../config/database'
import { signToken } from '../utils/jwt'
import { AppError } from '../middleware/error'
import { AuthRequest } from '../middleware/auth'

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = registerSchema.parse(req.body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new AppError('Ya existe una cuenta con este email', 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    // Create default categories
    const defaultCategories = [
      { name: 'Salario', type: 'income', color: '#00c896', icon: '💼' },
      { name: 'Freelance', type: 'income', color: '#00d4aa', icon: '💻' },
      { name: 'Inversiones', type: 'income', color: '#6366f1', icon: '📈' },
      { name: 'Otros ingresos', type: 'income', color: '#94a3b8', icon: '✨' },
      { name: 'Vivienda', type: 'expense', color: '#ef4444', icon: '🏡' },
      { name: 'Alimentación', type: 'expense', color: '#f97316', icon: '🛒' },
      { name: 'Transporte', type: 'expense', color: '#eab308', icon: '🚗' },
      { name: 'Salud', type: 'expense', color: '#ec4899', icon: '❤️' },
      { name: 'Ocio', type: 'expense', color: '#8b5cf6', icon: '🎮' },
      { name: 'Restaurantes', type: 'expense', color: '#f59e0b', icon: '🍽️' },
      { name: 'Suscripciones', type: 'expense', color: '#6366f1', icon: '📺' },
      { name: 'Inversiones', type: 'expense', color: '#10b981', icon: '📊' },
      { name: 'Otros gastos', type: 'expense', color: '#94a3b8', icon: '📦' },
    ]

    await prisma.category.createMany({
      data: defaultCategories.map((cat) => ({
        ...cat,
        userId: user.id,
        isDefault: true,
      })),
    })

    const token = signToken({ userId: user.id, email: user.email })
    res.status(201).json({ user, token })
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true, createdAt: true },
    })

    if (!user) {
      throw new AppError('Email o contraseña incorrectos', 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new AppError('Email o contraseña incorrectos', 401)
    }

    const token = signToken({ userId: user.id, email: user.email })
    const { passwordHash, ...userWithoutPassword } = user

    res.json({ user: userWithoutPassword, token })
  } catch (error) {
    next(error)
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    if (!user) throw new AppError('Usuario no encontrado', 404)
    res.json(user)
  } catch (error) {
    next(error)
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).optional(),
    })

    const { name, currentPassword, newPassword } = schema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) throw new AppError('Usuario no encontrado', 404)

    // Handle password change
    if (newPassword && currentPassword) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) throw new AppError('Contraseña actual incorrecta', 400)
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(newPassword && { passwordHash: await bcrypt.hash(newPassword, 12) }),
      },
      select: { id: true, name: true, email: true, updatedAt: true },
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
}
