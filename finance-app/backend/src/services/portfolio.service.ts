import { prisma } from '../config/database'

class PortfolioService {
  // Recalculate a fund holding from all transactions
  async recalculateHolding(userId: string, fundId: string): Promise<void> {
    const transactions = await prisma.investmentTransaction.findMany({
      where: { userId, fundId },
      orderBy: { date: 'asc' },
    })

    if (!transactions.length) {
      // Remove holding if no transactions
      await prisma.portfolioHolding.deleteMany({ where: { userId, fundId } })
      return
    }

    let shares = 0
    let totalInvested = 0
    let totalCost = 0

    for (const tx of transactions) {
      const txShares = Number(tx.shares)
      const txAmount = Number(tx.amount)
      const txPrice = Number(tx.pricePerShare)

      if (tx.type === 'buy') {
        totalCost += txShares * txPrice
        shares += txShares
        totalInvested += txAmount
      } else if (tx.type === 'sell') {
        const avgCost = shares > 0 ? totalCost / shares : txPrice
        totalCost -= txShares * avgCost
        shares -= txShares
        totalInvested -= txAmount
      }
    }

    const avgPurchasePrice = shares > 0 ? totalCost / shares : 0

    await prisma.portfolioHolding.upsert({
      where: { userId_fundId: { userId, fundId } },
      update: {
        shares: Math.max(0, shares),
        avgPurchasePrice: Math.max(0, avgPurchasePrice),
        totalInvested: Math.max(0, totalInvested),
        lastUpdated: new Date(),
      },
      create: {
        userId,
        fundId,
        shares: Math.max(0, shares),
        avgPurchasePrice: Math.max(0, avgPurchasePrice),
        totalInvested: Math.max(0, totalInvested),
      },
    })
  }

  // Recalculate all holdings for a user
  async recalculateAllHoldings(userId: string): Promise<void> {
    const funds = await prisma.fund.findMany({ where: { userId } })
    for (const fund of funds) {
      await this.recalculateHolding(userId, fund.id)
    }
  }
}

export const portfolioService = new PortfolioService()
