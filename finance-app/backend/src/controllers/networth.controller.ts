import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error'

const assetSchema = z.object({
  type: z.enum(['bank_account', 'fund', 'etf', 'stock', 'crypto', 'vehicle', 'real_estate', 'other']),
  name: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().default('EUR'),
  date: z.string().refine((d) => !isNaN(Date.parse(d))),
  notes: z.string().optional(),
})

const liabilitySchema = z.object({
  type: z.enum(['mortgage', 'loan', 'credit_card', 'debt', 'other']),
  name: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().default('EUR'),
  date: z.string().refine((d) => !isNaN(Date.parse(d))),
  notes: z.string().optional(),
})

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function getAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const assets = await prisma.netWorthAsset.findMany({
      where: { userId: req.userId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    res.json(assets.map((a) => ({ ...a, amount: Number(a.amount) })))
  } catch (error) {
    next(error)
  }
}

export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = assetSchema.parse(req.body)
    const asset = await prisma.netWorthAsset.create({
      data: { ...data, userId: req.userId!, date: new Date(data.date) },
    })
    res.status(201).json({ ...asset, amount: Number(asset.amount) })
  } catch (error) {
    next(error)
  }
}

export async function updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const existing = await prisma.netWorthAsset.findFirst({ where: { id, userId: req.userId } })
    if (!existing) throw new AppError('Activo no encontrado', 404)

    const data = assetSchema.partial().parse(req.body)
    const asset = await prisma.netWorthAsset.update({
      where: { id },
      data: { ...data, ...(data.date && { date: new Date(data.date) }) },
    })
    res.json({ ...asset, amount: Number(asset.amount) })
  } catch (error) {
    next(error)
  }
}

export async function deleteAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const existing = await prisma.netWorthAsset.findFirst({ where: { id, userId: req.userId } })
    if (!existing) throw new AppError('Activo no encontrado', 404)
    await prisma.netWorthAsset.delete({ where: { id } })
    res.json({ message: 'Activo eliminado' })
  } catch (error) {
    next(error)
  }
}

// ─── Liabilities ──────────────────────────────────────────────────────────────

export async function getLiabilities(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const liabilities = await prisma.netWorthLiability.findMany({
      where: { userId: req.userId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    res.json(liabilities.map((l) => ({ ...l, amount: Number(l.amount) })))
  } catch (error) {
    next(error)
  }
}

export async function createLiability(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = liabilitySchema.parse(req.body)
    const liability = await prisma.netWorthLiability.create({
      data: { ...data, userId: req.userId!, date: new Date(data.date) },
    })
    res.status(201).json({ ...liability, amount: Number(liability.amount) })
  } catch (error) {
    next(error)
  }
}

export async function updateLiability(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const existing = await prisma.netWorthLiability.findFirst({ where: { id, userId: req.userId } })
    if (!existing) throw new AppError('Pasivo no encontrado', 404)

    const data = liabilitySchema.partial().parse(req.body)
    const liability = await prisma.netWorthLiability.update({
      where: { id },
      data: { ...data, ...(data.date && { date: new Date(data.date) }) },
    })
    res.json({ ...liability, amount: Number(liability.amount) })
  } catch (error) {
    next(error)
  }
}

export async function deleteLiability(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const existing = await prisma.netWorthLiability.findFirst({ where: { id, userId: req.userId } })
    if (!existing) throw new AppError('Pasivo no encontrado', 404)
    await prisma.netWorthLiability.delete({ where: { id } })
    res.json({ message: 'Pasivo eliminado' })
  } catch (error) {
    next(error)
  }
}

// ─── Net Worth Summary ────────────────────────────────────────────────────────

export async function getNetWorthSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!

    const [assetsRaw, liabilitiesRaw] = await Promise.all([
      prisma.netWorthAsset.findMany({ where: { userId } }),
      prisma.netWorthLiability.findMany({ where: { userId } }),
    ])

    // Add portfolio value (from holdings)
    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
      include: { fund: { include: { navHistory: { orderBy: { date: 'desc' }, take: 1 } } } },
    })

    let portfolioValue = 0
    for (const h of holdings) {
      const shares = Number(h.shares)
      const nav = Number(h.fund.navHistory[0]?.nav || 0)
      portfolioValue += nav > 0 ? shares * nav : Number(h.totalInvested)
    }

    const totalAssets =
      assetsRaw.reduce((s, a) => s + Number(a.amount), 0) + portfolioValue
    const totalLiabilities = liabilitiesRaw.reduce((s, l) => s + Number(l.amount), 0)
    const netWorth = totalAssets - totalLiabilities

    // Group assets by type
    const assetsByType: Record<string, number> = {}
    for (const a of assetsRaw) {
      assetsByType[a.type] = (assetsByType[a.type] || 0) + Number(a.amount)
    }
    if (portfolioValue > 0) {
      assetsByType['fund'] = (assetsByType['fund'] || 0) + portfolioValue
    }

    // History
    const history = await prisma.netWorthHistory.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: 36, // 3 years monthly
    })

    // Snapshot today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.netWorthHistory.upsert({
      where: { userId_date: { userId, date: today } },
      update: { totalAssets, totalLiabilities, netWorth },
      create: { userId, date: today, totalAssets, totalLiabilities, netWorth },
    })

    res.json({
      totalAssets,
      totalLiabilities,
      netWorth,
      portfolioValue,
      assetsByType,
      history: history.map((h) => ({
        date: h.date,
        totalAssets: Number(h.totalAssets),
        totalLiabilities: Number(h.totalLiabilities),
        netWorth: Number(h.netWorth),
      })),
    })
  } catch (error) {
    next(error)
  }
}
