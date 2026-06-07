import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { startOfMonth, endOfMonth, subMonths, format } from '../utils/helpers'

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('El importe debe ser positivo'),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Fecha inválida'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

export async function getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { type, categoryId, startDate, endDate, page = '1', limit = '50' } = req.query

    const where: any = { userId }
    if (type) where.type = type
    if (categoryId) where.categoryId = categoryId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.transaction.count({ where }),
    ])

    res.json({
      data: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
      meta: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function createTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const data = transactionSchema.parse(req.body)

    if (data.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: data.categoryId, userId },
      })
      if (!cat) throw new AppError('Categoría no encontrada', 404)
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId,
        date: new Date(data.date),
        amount: data.amount,
      },
      include: { category: true },
    })

    res.status(201).json({ ...transaction, amount: Number(transaction.amount) })
  } catch (error) {
    next(error)
  }
}

export async function updateTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) throw new AppError('Transacción no encontrada', 404)

    const data = transactionSchema.partial().parse(req.body)

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        ...(data.date && { date: new Date(data.date) }),
      },
      include: { category: true },
    })

    res.json({ ...transaction, amount: Number(transaction.amount) })
  } catch (error) {
    next(error)
  }
}

export async function deleteTransaction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const existing = await prisma.transaction.findFirst({ where: { id, userId } })
    if (!existing) throw new AppError('Transacción no encontrada', 404)

    await prisma.transaction.delete({ where: { id } })
    res.json({ message: 'Transacción eliminada' })
  } catch (error) {
    next(error)
  }
}

export async function getMonthlyStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const now = new Date()

    const months = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)

      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: 'income', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: 'expense', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])

      const income = Number(incomeAgg._sum.amount || 0)
      const expenses = Number(expenseAgg._sum.amount || 0)

      months.push({
        month: format(monthDate, 'MMM yyyy'),
        income,
        expenses,
        savings: income - expenses,
        savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      })
    }

    res.json(months)
  } catch (error) {
    next(error)
  }
}

export async function getCategories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { type } = req.query

    const categories = await prisma.category.findMany({
      where: { userId, ...(type && { type: type as string }) },
      orderBy: { name: 'asc' },
    })

    res.json(categories)
  } catch (error) {
    next(error)
  }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(['income', 'expense']),
      color: z.string().optional(),
      icon: z.string().optional(),
    })

    const data = schema.parse(req.body)
    const category = await prisma.category.create({
      data: { ...data, userId },
    })

    res.status(201).json(category)
  } catch (error) {
    next(error)
  }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const cat = await prisma.category.findFirst({ where: { id, userId } })
    if (!cat) throw new AppError('Categoría no encontrada', 404)
    if (cat.isDefault) throw new AppError('No se pueden eliminar categorías por defecto', 400)

    await prisma.category.delete({ where: { id } })
    res.json({ message: 'Categoría eliminada' })
  } catch (error) {
    next(error)
  }
}
