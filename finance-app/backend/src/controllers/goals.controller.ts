import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'

const goalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['total_invested', 'monthly_savings', 'net_worth', 'financial_independence', 'custom']),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export async function getGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate current amount for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const current = await calculateCurrentAmount(userId, goal.type)
        const progress =
          goal.targetAmount && Number(goal.targetAmount) > 0
            ? Math.min(100, (current / Number(goal.targetAmount)) * 100)
            : 0

        // Estimate completion date
        let estimatedDate: Date | null = null
        if (goal.targetAmount && current < Number(goal.targetAmount)) {
          estimatedDate = await estimateCompletionDate(
            userId,
            current,
            Number(goal.targetAmount),
            goal.type
          )
        }

        return {
          ...goal,
          targetAmount: goal.targetAmount ? Number(goal.targetAmount) : null,
          currentAmount: current,
          progress,
          estimatedDate,
        }
      })
    )

    res.json(goalsWithProgress)
  } catch (error) {
    next(error)
  }
}

export async function createGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const data = goalSchema.parse(req.body)

    const goal = await prisma.goal.create({
      data: {
        ...data,
        userId,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        targetAmount: data.targetAmount,
      },
    })

    res.status(201).json({ ...goal, targetAmount: goal.targetAmount ? Number(goal.targetAmount) : null })
  } catch (error) {
    next(error)
  }
}

export async function updateGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const existing = await prisma.goal.findFirst({ where: { id, userId } })
    if (!existing) throw new AppError('Objetivo no encontrado', 404)

    const data = goalSchema.partial().parse(req.body)

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    })

    res.json({ ...goal, targetAmount: goal.targetAmount ? Number(goal.targetAmount) : null })
  } catch (error) {
    next(error)
  }
}

export async function deleteGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const existing = await prisma.goal.findFirst({ where: { id, userId } })
    if (!existing) throw new AppError('Objetivo no encontrado', 404)

    await prisma.goal.delete({ where: { id } })
    res.json({ message: 'Objetivo eliminado' })
  } catch (error) {
    next(error)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function calculateCurrentAmount(userId: string, type: string): Promise<number> {
  if (type === 'total_invested') {
    const agg = await prisma.portfolioHolding.aggregate({
      where: { userId },
      _sum: { totalInvested: true },
    })
    return Number(agg._sum.totalInvested || 0)
  }

  if (type === 'monthly_savings') {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [income, expenses] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'income', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ])

    return Math.max(0, Number(income._sum.amount || 0) - Number(expenses._sum.amount || 0))
  }

  if (type === 'net_worth' || type === 'financial_independence') {
    const [assets, liabilities] = await Promise.all([
      prisma.netWorthAsset.aggregate({ where: { userId }, _sum: { amount: true } }),
      prisma.netWorthLiability.aggregate({ where: { userId }, _sum: { amount: true } }),
    ])

    const portfolioValue = await getPortfolioValue(userId)
    return (
      Number(assets._sum.amount || 0) +
      portfolioValue -
      Number(liabilities._sum.amount || 0)
    )
  }

  return 0
}

async function getPortfolioValue(userId: string): Promise<number> {
  const holdings = await prisma.portfolioHolding.findMany({
    where: { userId },
    include: { fund: { include: { navHistory: { orderBy: { date: 'desc' }, take: 1 } } } },
  })

  return holdings.reduce((sum, h) => {
    const shares = Number(h.shares)
    const nav = Number(h.fund.navHistory[0]?.nav || 0)
    return sum + (nav > 0 ? shares * nav : Number(h.totalInvested))
  }, 0)
}

async function estimateCompletionDate(
  userId: string,
  current: number,
  target: number,
  type: string
): Promise<Date | null> {
  try {
    const remaining = target - current
    if (remaining <= 0) return new Date()

    // Calculate monthly average contributions (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    if (type === 'total_invested') {
      const transactions = await prisma.investmentTransaction.findMany({
        where: { userId, type: 'buy', date: { gte: sixMonthsAgo } },
      })
      const totalContributed = transactions.reduce((s, t) => s + Number(t.amount), 0)
      const monthlyAvg = totalContributed / 6

      if (monthlyAvg <= 0) return null
      const monthsNeeded = Math.ceil(remaining / monthlyAvg)
      const date = new Date()
      date.setMonth(date.getMonth() + monthsNeeded)
      return date
    }

    return null
  } catch {
    return null
  }
}
