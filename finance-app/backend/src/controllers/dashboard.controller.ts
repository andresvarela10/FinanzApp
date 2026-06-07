import { Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { startOfMonth, endOfMonth, subMonths, format } from '../utils/helpers'

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const now = new Date()
    const startMonth = startOfMonth(now)
    const endMonth = endOfMonth(now)
    const startLastMonth = startOfMonth(subMonths(now, 1))
    const endLastMonth = endOfMonth(subMonths(now, 1))

    // Monthly income & expenses (current month)
    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'income', date: { gte: startMonth, lte: endMonth } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: startMonth, lte: endMonth } },
        _sum: { amount: true },
      }),
    ])

    const monthlyIncome = Number(incomeResult._sum.amount || 0)
    const monthlyExpenses = Number(expenseResult._sum.amount || 0)
    const monthlySavings = monthlyIncome - monthlyExpenses
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0

    // Portfolio value (total invested + current value)
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      include: {
        fund: {
          include: {
            navHistory: {
              orderBy: { date: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    let totalInvested = 0
    let currentPortfolioValue = 0

    for (const holding of holdings) {
      const shares = Number(holding.shares)
      const invested = Number(holding.totalInvested)
      totalInvested += invested

      const latestNav = holding.fund.navHistory[0]?.nav
      if (latestNav && shares > 0) {
        currentPortfolioValue += shares * Number(latestNav)
      } else {
        currentPortfolioValue += invested // fallback to invested amount
      }
    }

    const portfolioGain = currentPortfolioValue - totalInvested
    const portfolioGainPct = totalInvested > 0 ? (portfolioGain / totalInvested) * 100 : 0

    // Cash (bank accounts from net worth assets)
    const cashAssets = await prisma.netWorthAsset.groupBy({
      by: ['type'],
      where: { userId, type: 'bank_account' },
      _sum: { amount: true },
    })
    const cash = Number(cashAssets[0]?._sum.amount || 0)

    // Net worth
    const [totalAssetsAgg, totalLiabilitiesAgg] = await Promise.all([
      prisma.netWorthAsset.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.netWorthLiability.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ])

    const totalAssets = Number(totalAssetsAgg._sum.amount || 0) + currentPortfolioValue
    const totalLiabilities = Number(totalLiabilitiesAgg._sum.amount || 0)
    const netWorth = totalAssets - totalLiabilities

    // Portfolio evolution (last 12 months)
    const twelveMonthsAgo = subMonths(now, 12)
    const portfolioHistory = await prisma.portfolioValueHistory.findMany({
      where: { userId, date: { gte: twelveMonthsAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, totalValue: true, totalInvested: true },
    })

    // Monthly savings evolution (last 6 months)
    const savingsEvolution = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)

      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: 'income', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: 'expense', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])

      savingsEvolution.push({
        month: format(monthDate, 'MMM yyyy'),
        income: Number(inc._sum.amount || 0),
        expenses: Number(exp._sum.amount || 0),
        savings: Number(inc._sum.amount || 0) - Number(exp._sum.amount || 0),
      })
    }

    // Expenses by category (current month)
    const expensesByCategory = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'expense', date: { gte: startMonth, lte: endMonth } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    const categoryIds = expensesByCategory
      .map((e) => e.categoryId)
      .filter(Boolean) as string[]

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    })

    const expensesByCategoryFormatted = expensesByCategory.map((e) => {
      const cat = categories.find((c) => c.id === e.categoryId)
      return {
        name: cat?.name || 'Sin categoría',
        color: cat?.color || '#94a3b8',
        icon: cat?.icon || '📦',
        amount: Number(e._sum.amount || 0),
      }
    })

    // Asset distribution
    const assetDistribution = [
      { name: 'Fondos indexados', value: currentPortfolioValue, color: '#00c896' },
      { name: 'Efectivo', value: cash, color: '#6366f1' },
    ]

    // Add other assets
    const otherAssets = await prisma.netWorthAsset.groupBy({
      by: ['type'],
      where: { userId, type: { not: 'bank_account' } },
      _sum: { amount: true },
    })

    const typeLabels: Record<string, { name: string; color: string }> = {
      fund: { name: 'Fondos', color: '#10b981' },
      etf: { name: 'ETFs', color: '#0ea5e9' },
      stock: { name: 'Acciones', color: '#f59e0b' },
      crypto: { name: 'Criptomonedas', color: '#f97316' },
      real_estate: { name: 'Inmuebles', color: '#8b5cf6' },
      vehicle: { name: 'Vehículos', color: '#64748b' },
      other: { name: 'Otros', color: '#94a3b8' },
    }

    for (const asset of otherAssets) {
      const label = typeLabels[asset.type]
      if (label && Number(asset._sum.amount) > 0) {
        assetDistribution.push({
          name: label.name,
          value: Number(asset._sum.amount),
          color: label.color,
        })
      }
    }

    res.json({
      summary: {
        netWorth,
        cash,
        totalInvested,
        currentPortfolioValue,
        portfolioGain,
        portfolioGainPct,
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        savingsRate,
      },
      charts: {
        portfolioHistory: portfolioHistory.map((p) => ({
          date: format(p.date, 'yyyy-MM-dd'),
          value: Number(p.totalValue),
          invested: Number(p.totalInvested),
        })),
        savingsEvolution,
        expensesByCategory: expensesByCategoryFormatted,
        assetDistribution: assetDistribution.filter((a) => a.value > 0),
      },
    })
  } catch (error) {
    next(error)
  }
}
