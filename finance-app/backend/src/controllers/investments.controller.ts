import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'
import { portfolioService } from '../services/portfolio.service'
import { marketDataService } from '../services/market-data.service'

// ─── Fund Management ─────────────────────────────────────────────────────────

const fundSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  isin: z.string().length(12, 'El ISIN debe tener 12 caracteres'),
  etfProxy: z.string().optional(),
  currency: z.string().default('EUR'),
  broker: z.string().optional(),
  category: z.string().optional(),
})

export async function getFunds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!

    const funds = await prisma.fund.findMany({
      where: { userId },
      include: {
        portfolioHolding: true,
        navHistory: {
          orderBy: { date: 'desc' },
          take: 2, // current + previous for daily change
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = funds.map((fund) => {
      const holding = fund.portfolioHolding
      const latestNav = fund.navHistory[0]
      const prevNav = fund.navHistory[1]

      const shares = Number(holding?.shares || 0)
      const currentNav = Number(latestNav?.nav || 0)
      const currentValue = shares * currentNav
      const totalInvested = Number(holding?.totalInvested || 0)
      const profitLoss = currentValue - totalInvested
      const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0

      const dailyChange =
        prevNav && latestNav
          ? ((Number(latestNav.nav) - Number(prevNav.nav)) / Number(prevNav.nav)) * 100
          : null

      return {
        id: fund.id,
        name: fund.name,
        isin: fund.isin,
        etfProxy: fund.etfProxy,
        currency: fund.currency,
        broker: fund.broker,
        category: fund.category,
        holding: holding
          ? {
              shares,
              avgPurchasePrice: Number(holding.avgPurchasePrice || 0),
              totalInvested,
              currentValue,
              profitLoss,
              profitLossPct,
            }
          : null,
        nav: latestNav
          ? {
              value: Number(latestNav.nav),
              date: latestNav.date,
              source: latestNav.source,
              dailyChange,
            }
          : null,
      }
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function createFund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const data = fundSchema.parse(req.body)

    // Check ISIN doesn't already exist for this user
    const existing = await prisma.fund.findFirst({ where: { userId, isin: data.isin } })
    if (existing) throw new AppError('Ya existe un fondo con este ISIN', 409)

    const fund = await prisma.fund.create({ data: { ...data, userId } })

    // Try to fetch initial NAV
    marketDataService.fetchFundNav(fund.id).catch(console.error)

    res.status(201).json(fund)
  } catch (error) {
    next(error)
  }
}

export async function updateFund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const existing = await prisma.fund.findFirst({ where: { id, userId } })
    if (!existing) throw new AppError('Fondo no encontrado', 404)

    const data = fundSchema.partial().parse(req.body)
    const fund = await prisma.fund.update({ where: { id }, data })

    res.json(fund)
  } catch (error) {
    next(error)
  }
}

export async function deleteFund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const existing = await prisma.fund.findFirst({ where: { id, userId } })
    if (!existing) throw new AppError('Fondo no encontrado', 404)

    await prisma.fund.delete({ where: { id } })
    res.json({ message: 'Fondo eliminado' })
  } catch (error) {
    next(error)
  }
}

// ─── Investment Transactions ──────────────────────────────────────────────────

const investmentTxSchema = z.object({
  fundId: z.string().uuid(),
  type: z.enum(['buy', 'sell', 'dividend']),
  date: z.string().refine((d) => !isNaN(Date.parse(d))),
  shares: z.number().positive(),
  pricePerShare: z.number().positive(),
  amount: z.number().positive(),
  fees: z.number().min(0).default(0),
  description: z.string().optional(),
})

export async function getInvestmentTransactions(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!
    const { fundId, page = '1', limit = '50' } = req.query

    const where: any = { userId }
    if (fundId) where.fundId = fundId

    const [transactions, total] = await Promise.all([
      prisma.investmentTransaction.findMany({
        where,
        include: { fund: { select: { name: true, isin: true } } },
        orderBy: { date: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.investmentTransaction.count({ where }),
    ])

    res.json({
      data: transactions.map((t) => ({
        ...t,
        shares: Number(t.shares),
        pricePerShare: Number(t.pricePerShare),
        amount: Number(t.amount),
        fees: Number(t.fees),
      })),
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) },
    })
  } catch (error) {
    next(error)
  }
}

export async function createInvestmentTransaction(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!
    const data = investmentTxSchema.parse(req.body)

    const fund = await prisma.fund.findFirst({ where: { id: data.fundId, userId } })
    if (!fund) throw new AppError('Fondo no encontrado', 404)

    const tx = await prisma.investmentTransaction.create({
      data: {
        ...data,
        userId,
        date: new Date(data.date),
        importSource: 'manual',
      },
    })

    // Update portfolio holding
    await portfolioService.recalculateHolding(userId, data.fundId)

    // Record NAV for this transaction date
    await prisma.fundNavHistory.upsert({
      where: { fundId_date: { fundId: data.fundId, date: new Date(data.date) } },
      update: {},
      create: {
        fundId: data.fundId,
        date: new Date(data.date),
        nav: data.pricePerShare,
        source: 'manual',
      },
    })

    res.status(201).json({
      ...tx,
      shares: Number(tx.shares),
      pricePerShare: Number(tx.pricePerShare),
      amount: Number(tx.amount),
      fees: Number(tx.fees),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteInvestmentTransaction(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const tx = await prisma.investmentTransaction.findFirst({ where: { id, userId } })
    if (!tx) throw new AppError('Transacción no encontrada', 404)

    const fundId = tx.fundId
    await prisma.investmentTransaction.delete({ where: { id } })
    await portfolioService.recalculateHolding(userId, fundId)

    res.json({ message: 'Transacción eliminada' })
  } catch (error) {
    next(error)
  }
}

// ─── Portfolio Summary ────────────────────────────────────────────────────────

export async function getPortfolioSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      include: {
        fund: {
          include: {
            navHistory: { orderBy: { date: 'desc' }, take: 1 },
          },
        },
      },
    })

    let totalInvested = 0
    let currentValue = 0

    const fundBreakdown = holdings.map((h) => {
      const shares = Number(h.shares)
      const invested = Number(h.totalInvested)
      const nav = Number(h.fund.navHistory[0]?.nav || 0)
      const value = shares * nav || invested
      const gain = value - invested
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0

      totalInvested += invested
      currentValue += value

      return {
        fund: { id: h.fund.id, name: h.fund.name, isin: h.fund.isin, category: h.fund.category },
        shares,
        invested,
        value,
        gain,
        gainPct,
        weight: 0, // calculated after
      }
    })

    // Calculate weights
    fundBreakdown.forEach((f) => {
      f.weight = currentValue > 0 ? (f.value / currentValue) * 100 : 0
    })

    // Annualized return calculation
    const firstTx = await prisma.investmentTransaction.findFirst({
      where: { userId, type: 'buy' },
      orderBy: { date: 'asc' },
    })

    let annualizedReturn = 0
    if (firstTx && totalInvested > 0) {
      const daysSinceFirst = Math.floor(
        (Date.now() - firstTx.date.getTime()) / (1000 * 60 * 60 * 24)
      )
      const years = daysSinceFirst / 365
      if (years > 0 && totalInvested > 0) {
        annualizedReturn = (Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100
      }
    }

    // Portfolio history
    const history = await prisma.portfolioValueHistory.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: 365,
    })

    res.json({
      summary: {
        totalInvested,
        currentValue,
        totalGain: currentValue - totalInvested,
        totalGainPct: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0,
        annualizedReturn,
        numberOfFunds: holdings.length,
      },
      holdings: fundBreakdown,
      history: history.map((h) => ({
        date: h.date,
        value: Number(h.totalValue),
        invested: Number(h.totalInvested),
      })),
    })
  } catch (error) {
    next(error)
  }
}

// ─── NAV Management ──────────────────────────────────────────────────────────

export async function updateFundNav(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const fund = await prisma.fund.findFirst({ where: { id, userId } })
    if (!fund) throw new AppError('Fondo no encontrado', 404)

    const navData = await marketDataService.fetchFundNav(fund.id)

    if (!navData) {
      throw new AppError(
        'No se pudo obtener el valor liquidativo. Inténtalo de nuevo más tarde.',
        503
      )
    }

    res.json({ message: 'NAV actualizado', ...navData })
  } catch (error) {
    next(error)
  }
}

export async function getEtfIntradayPrice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const { id } = req.params

    const fund = await prisma.fund.findFirst({ where: { id, userId } })
    if (!fund) throw new AppError('Fondo no encontrado', 404)

    if (!fund.etfProxy) {
      throw new AppError('Este fondo no tiene ETF proxy configurado', 400)
    }

    const price = await marketDataService.getEtfIntradayPrice(fund.etfProxy)

    res.json({
      ticker: fund.etfProxy,
      price: price?.price,
      change: price?.change,
      changePercent: price?.changePercent,
      currency: price?.currency,
      isEstimate: true,
      timestamp: new Date(),
    })
  } catch (error) {
    next(error)
  }
}
