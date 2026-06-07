import axios from 'axios'
import { prisma } from '../config/database'
import { env } from '../config/env'

interface NavData {
  nav: number
  date: Date
  source: string
}

interface IntradayPrice {
  price: number
  change: number
  changePercent: number
  currency: string
  timestamp: Date
}

class MarketDataService {
  private readonly MORNINGSTAR_BASE = 'https://lt.morningstar.com/api/rest.svc'
  private readonly YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance'

  // ─── Fetch Fund NAV ──────────────────────────────────────────────────────────

  async fetchFundNav(fundId: string): Promise<{ nav: number; date: Date; source: string } | null> {
    const fund = await prisma.fund.findUnique({ where: { id: fundId } })
    if (!fund) return null

    console.log(`📊 Fetching NAV for fund: ${fund.name} (ISIN: ${fund.isin})`)

    // Strategy 1: Try Yahoo Finance if we have an ETF proxy (most reliable for ETFs)
    if (fund.etfProxy) {
      try {
        const data = await this.getYahooQuote(fund.etfProxy)
        if (data) {
          const nav = data.price
          const date = new Date()
          date.setHours(0, 0, 0, 0)

          await prisma.fundNavHistory.upsert({
            where: { fundId_date: { fundId, date } },
            update: { nav, source: 'yahoo' },
            create: { fundId, nav, date, source: 'yahoo' },
          })

          console.log(`✅ NAV from Yahoo Finance: ${nav} (${fund.etfProxy})`)
          return { nav, date, source: 'yahoo' }
        }
      } catch (e) {
        console.error('Yahoo Finance error:', e)
      }
    }

    // Strategy 2: Try Morningstar by ISIN
    try {
      const data = await this.getMorningstarNAV(fund.isin)
      if (data) {
        await prisma.fundNavHistory.upsert({
          where: { fundId_date: { fundId, date: data.date } },
          update: { nav: data.nav, source: 'morningstar' },
          create: { fundId, nav: data.nav, date: data.date, source: 'morningstar' },
        })

        console.log(`✅ NAV from Morningstar: ${data.nav}`)
        return data
      }
    } catch (e) {
      console.error('Morningstar error:', e)
    }

    // Strategy 3: Alpha Vantage (if API key provided)
    if (env.ALPHA_VANTAGE_API_KEY && fund.etfProxy) {
      try {
        const data = await this.getAlphaVantageQuote(fund.etfProxy)
        if (data) {
          const date = new Date()
          date.setHours(0, 0, 0, 0)

          await prisma.fundNavHistory.upsert({
            where: { fundId_date: { fundId, date } },
            update: { nav: data.price, source: 'alpha_vantage' },
            create: { fundId, nav: data.price, date, source: 'alpha_vantage' },
          })

          return { nav: data.price, date, source: 'alpha_vantage' }
        }
      } catch (e) {
        console.error('Alpha Vantage error:', e)
      }
    }

    console.warn(`⚠️  Could not fetch NAV for ${fund.name}`)
    return null
  }

  // ─── Fetch All User Funds NAV ─────────────────────────────────────────────

  async updateAllFundsNav(userId: string): Promise<void> {
    const funds = await prisma.fund.findMany({ where: { userId } })

    console.log(`🔄 Updating NAV for ${funds.length} funds...`)

    for (const fund of funds) {
      await this.fetchFundNav(fund.id)
      // Rate limit: wait 1 second between requests
      await new Promise((r) => setTimeout(r, 1000))
    }

    // Update portfolio value snapshot
    await this.updatePortfolioValueSnapshot(userId)

    console.log('✅ All NAVs updated')
  }

  // ─── ETF Intraday Price ───────────────────────────────────────────────────

  async getEtfIntradayPrice(ticker: string): Promise<IntradayPrice | null> {
    try {
      const data = await this.getYahooQuote(ticker)
      return data
    } catch (e) {
      console.error(`Error fetching intraday price for ${ticker}:`, e)
      return null
    }
  }

  // ─── Yahoo Finance ────────────────────────────────────────────────────────

  private async getYahooQuote(ticker: string): Promise<IntradayPrice | null> {
    try {
      const url = `${this.YAHOO_BASE}/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinanceApp/1.0)',
        },
      })

      const result = response.data?.chart?.result?.[0]
      if (!result) return null

      const meta = result.meta
      const price = meta.regularMarketPrice || meta.previousClose
      const prevClose = meta.chartPreviousClose || meta.previousClose
      const change = price - prevClose
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

      return {
        price,
        change,
        changePercent,
        currency: meta.currency || 'EUR',
        timestamp: new Date(meta.regularMarketTime * 1000),
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.error(`Ticker not found on Yahoo Finance: ${ticker}`)
      }
      return null
    }
  }

  // ─── Morningstar ──────────────────────────────────────────────────────────

  private async getMorningstarNAV(isin: string): Promise<NavData | null> {
    try {
      // Step 1: Search for the security by ISIN
      const searchUrl = `${this.MORNINGSTAR_BASE}/v1/security/screener`
      const searchResponse = await axios.get(searchUrl, {
        params: {
          page: 1,
          pageSize: 5,
          sortOrder: 'LegalName asc',
          outputType: 'json',
          version: 1,
          languageId: 'es-ES',
          currencyId: 'EUR',
          universeIds: 'FOEUR$$ALL|ETEUR$$ALL',
          term: isin,
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinanceApp/1.0)',
          Referer: 'https://www.morningstar.es',
        },
      })

      const securities = searchResponse.data?.rows || []
      if (!securities.length) return null

      const security = securities[0]
      const secId = security.SecId

      if (!secId) return null

      // Step 2: Get price history
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const priceUrl = `${this.MORNINGSTAR_BASE}/timeseries_price/zb3qpz6ys7`
      const priceResponse = await axios.get(priceUrl, {
        params: {
          id: secId,
          currencyId: 'EUR',
          idType: 'msid',
          frequency: 'daily',
          startDate,
          endDate,
          outputType: 'COMPACTJSON',
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinanceApp/1.0)',
          Referer: 'https://www.morningstar.es',
        },
      })

      const series = priceResponse.data
      if (!series?.['Security']?.[0]?.['Frequency']?.[0]?.['Data']) return null

      const priceData = series['Security'][0]['Frequency'][0]['Data']
      if (!priceData.length) return null

      // Get latest data point
      const latest = priceData[priceData.length - 1]
      const nav = latest[1]
      const dateStr = latest[0]

      if (!nav || !dateStr) return null

      return {
        nav: parseFloat(nav),
        date: new Date(dateStr),
        source: 'morningstar',
      }
    } catch (e) {
      return null
    }
  }

  // ─── Alpha Vantage ────────────────────────────────────────────────────────

  private async getAlphaVantageQuote(
    symbol: string
  ): Promise<{ price: number } | null> {
    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: env.ALPHA_VANTAGE_API_KEY,
        },
        timeout: 10000,
      })

      const quote = response.data?.['Global Quote']
      if (!quote) return null

      const price = parseFloat(quote['05. price'])
      return price > 0 ? { price } : null
    } catch (e) {
      return null
    }
  }

  // ─── Portfolio Value Snapshot ─────────────────────────────────────────────

  async updatePortfolioValueSnapshot(userId: string): Promise<void> {
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

    let totalValue = 0
    let totalInvested = 0

    for (const h of holdings) {
      const shares = Number(h.shares)
      const invested = Number(h.totalInvested)
      const nav = Number(h.fund.navHistory[0]?.nav || 0)

      totalInvested += invested
      totalValue += nav > 0 ? shares * nav : invested
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.portfolioValueHistory.upsert({
      where: { userId_date: { userId, date: today } },
      update: { totalValue, totalInvested },
      create: { userId, date: today, totalValue, totalInvested },
    })
  }

  // ─── NAV History ──────────────────────────────────────────────────────────

  async getFundNavHistory(
    fundId: string,
    days: number = 365
  ): Promise<{ date: Date; nav: number; source: string }[]> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const history = await prisma.fundNavHistory.findMany({
      where: { fundId, date: { gte: from } },
      orderBy: { date: 'asc' },
    })

    return history.map((h) => ({
      date: h.date,
      nav: Number(h.nav),
      source: h.source,
    }))
  }
}

export const marketDataService = new MarketDataService()
