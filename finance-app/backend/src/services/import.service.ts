import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import { prisma } from '../config/database'
import { portfolioService } from './portfolio.service'

interface ParsedTransaction {
  date: Date
  type: 'buy' | 'sell' | 'dividend'
  fundName: string
  isin?: string
  shares: number
  pricePerShare: number
  amount: number
  fees: number
  description: string
}

class ImportService {
  // ─── CSV Import ─────────────────────────────────────────────────────────────

  async parseCSV(buffer: Buffer): Promise<ParsedTransaction[]> {
    const content = buffer.toString('utf-8')

    // Try to detect MyInvestor CSV format
    if (content.includes('MyInvestor') || content.includes('ISIN')) {
      return this.parseMyInvestorCSV(content)
    }

    // Generic CSV fallback
    return this.parseGenericCSV(content)
  }

  private parseMyInvestorCSV(content: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = []

    try {
      // Remove BOM and normalize line endings
      const cleaned = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')

      const records = parse(cleaned, {
        delimiter: ';',
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      })

      for (const row of records) {
        const tx = this.parseMyInvestorRow(row)
        if (tx) transactions.push(tx)
      }
    } catch (e) {
      console.error('CSV parse error:', e)
    }

    return transactions
  }

  private parseMyInvestorRow(row: Record<string, string>): ParsedTransaction | null {
    try {
      // MyInvestor column names (may vary by export version)
      const dateStr =
        row['Fecha'] || row['Fecha operación'] || row['Date'] || row['fecha']
      const typeStr =
        row['Operación'] || row['Tipo'] || row['Type'] || row['operacion'] || ''
      const isin = row['ISIN'] || row['isin'] || ''
      const fundName =
        row['Fondo'] || row['Nombre'] || row['Fondo / ETF'] || row['fund_name'] || ''
      const sharesStr =
        row['Participaciones'] || row['Shares'] || row['participaciones'] || '0'
      const navStr =
        row['Valor liquidativo'] || row['NAV'] || row['Precio'] || row['precio'] || '0'
      const amountStr =
        row['Importe'] || row['Amount'] || row['Total'] || row['importe'] || '0'

      if (!dateStr || !typeStr) return null

      const date = this.parseDate(dateStr)
      if (!date) return null

      const typeLower = typeStr.toLowerCase()
      let type: 'buy' | 'sell' | 'dividend' = 'buy'
      if (typeLower.includes('venta') || typeLower.includes('sell')) type = 'sell'
      else if (typeLower.includes('divid')) type = 'dividend'
      else if (typeLower.includes('suscri') || typeLower.includes('compra') || typeLower.includes('buy')) type = 'buy'
      else return null // Skip non-investment rows

      const shares = this.parseNumber(sharesStr)
      const pricePerShare = this.parseNumber(navStr)
      const amount = Math.abs(this.parseNumber(amountStr))

      if (shares <= 0 && amount <= 0) return null

      return {
        date,
        type,
        fundName: fundName.trim(),
        isin: isin.trim().toUpperCase(),
        shares: Math.abs(shares),
        pricePerShare: pricePerShare || (shares > 0 ? amount / shares : 0),
        amount,
        fees: 0,
        description: `Importado de MyInvestor - ${typeStr}`,
      }
    } catch (e) {
      return null
    }
  }

  private parseGenericCSV(content: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = []

    try {
      const records = parse(content, {
        delimiter: [',', ';', '\t'],
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })

      for (const row of records) {
        const tx = this.parseGenericRow(row)
        if (tx) transactions.push(tx)
      }
    } catch (e) {
      console.error('Generic CSV parse error:', e)
    }

    return transactions
  }

  private parseGenericRow(row: Record<string, string>): ParsedTransaction | null {
    const keys = Object.keys(row).map((k) => k.toLowerCase())
    const get = (names: string[]) => {
      for (const name of names) {
        const key = keys.find((k) => k.includes(name))
        if (key) return row[Object.keys(row)[keys.indexOf(key)]] || ''
      }
      return ''
    }

    const dateStr = get(['fecha', 'date', 'dia', 'day'])
    const date = this.parseDate(dateStr)
    if (!date) return null

    const typeStr = get(['tipo', 'type', 'operacion', 'operation'])
    const typeLower = typeStr.toLowerCase()
    let type: 'buy' | 'sell' | 'dividend' = 'buy'
    if (typeLower.includes('sell') || typeLower.includes('venta')) type = 'sell'
    else if (typeLower.includes('div')) type = 'dividend'

    const fundName = get(['fondo', 'fund', 'nombre', 'name', 'producto'])
    const isin = get(['isin'])
    const shares = Math.abs(this.parseNumber(get(['participacion', 'share', 'cuota', 'unit'])))
    const nav = this.parseNumber(get(['nav', 'liquidativo', 'precio', 'price', 'valor']))
    const amount = Math.abs(this.parseNumber(get(['importe', 'amount', 'total', 'valor total'])))

    if (!fundName && !isin) return null

    return {
      date,
      type,
      fundName,
      isin: isin.toUpperCase(),
      shares,
      pricePerShare: nav || (shares > 0 ? amount / shares : 0),
      amount,
      fees: 0,
      description: 'Importación CSV',
    }
  }

  // ─── Excel Import ───────────────────────────────────────────────────────────

  async parseExcel(buffer: Buffer): Promise<ParsedTransaction[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const transactions: ParsedTransaction[] = []

    // Try each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' }) as Record<
        string,
        string
      >[]

      if (!rows.length) continue

      const firstRow = rows[0]
      const isMyInvestor = Object.keys(firstRow).some(
        (k) =>
          k.toLowerCase().includes('isin') ||
          k.toLowerCase().includes('participacion') ||
          k.toLowerCase().includes('liquidativo')
      )

      const parsed = isMyInvestor
        ? rows.map((r) => this.parseMyInvestorRow(r)).filter(Boolean)
        : rows.map((r) => this.parseGenericRow(r)).filter(Boolean)

      transactions.push(...(parsed as ParsedTransaction[]))
    }

    return transactions
  }

  // ─── Import to DB ───────────────────────────────────────────────────────────

  async importTransactions(
    userId: string,
    transactions: ParsedTransaction[],
    source: string
  ): Promise<{
    imported: number
    skipped: number
    errors: string[]
    fundsSummary: { fundName: string; count: number }[]
  }> {
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    const fundCounts: Record<string, number> = {}

    for (const tx of transactions) {
      try {
        // Find or create fund
        let fund = null

        if (tx.isin) {
          fund = await prisma.fund.findFirst({ where: { userId, isin: tx.isin } })

          if (!fund && tx.fundName) {
            fund = await prisma.fund.create({
              data: {
                userId,
                name: tx.fundName,
                isin: tx.isin,
                broker: source.includes('myinvestor') ? 'MyInvestor' : 'Importado',
                category: this.guessFundCategory(tx.fundName, tx.isin),
                etfProxy: this.guessEtfProxy(tx.isin),
              },
            })
          }
        }

        if (!fund) {
          skipped++
          errors.push(`Fondo no encontrado: ${tx.fundName} (${tx.isin})`)
          continue
        }

        // Check for duplicate (same fund, date, type, shares)
        const existing = await prisma.investmentTransaction.findFirst({
          where: {
            userId,
            fundId: fund.id,
            date: tx.date,
            type: tx.type,
            shares: tx.shares,
          },
        })

        if (existing) {
          skipped++
          continue
        }

        // Create transaction
        await prisma.investmentTransaction.create({
          data: {
            userId,
            fundId: fund.id,
            type: tx.type,
            date: tx.date,
            shares: tx.shares,
            pricePerShare: tx.pricePerShare,
            amount: tx.amount,
            fees: tx.fees,
            description: tx.description,
            importSource: source,
          },
        })

        // Record NAV
        if (tx.pricePerShare > 0) {
          await prisma.fundNavHistory.upsert({
            where: { fundId_date: { fundId: fund.id, date: tx.date } },
            update: {},
            create: {
              fundId: fund.id,
              date: tx.date,
              nav: tx.pricePerShare,
              source: 'import',
            },
          })
        }

        fundCounts[tx.fundName] = (fundCounts[tx.fundName] || 0) + 1
        imported++
      } catch (e: any) {
        errors.push(`Error procesando ${tx.fundName}: ${e.message}`)
      }
    }

    // Recalculate all holdings
    if (imported > 0) {
      await portfolioService.recalculateAllHoldings(userId)
    }

    const fundsSummary = Object.entries(fundCounts).map(([fundName, count]) => ({
      fundName,
      count,
    }))

    return { imported, skipped, errors, fundsSummary }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null

    // Try various formats
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{4})-(\d{2})-(\d{2})/,    // YYYY-MM-DD
      /(\d{2})-(\d{2})-(\d{4})/,    // DD-MM-YYYY
      /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
    ]

    for (const format of formats) {
      const match = dateStr.match(format)
      if (match) {
        const [, a, b, c] = match
        let date: Date

        if (a.length === 4) {
          date = new Date(parseInt(a), parseInt(b) - 1, parseInt(c))
        } else {
          date = new Date(parseInt(c), parseInt(b) - 1, parseInt(a))
        }

        if (!isNaN(date.getTime())) {
          date.setHours(0, 0, 0, 0)
          return date
        }
      }
    }

    // Try native Date parsing
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0)
      return d
    }

    return null
  }

  private parseNumber(str: string): number {
    if (!str) return 0
    // Handle European number format (1.234,56 → 1234.56)
    const cleaned = str
      .replace(/[€$£\s]/g, '')
      .replace(/\.(?=\d{3})/g, '')
      .replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  private guessFundCategory(name: string, isin: string): string {
    const n = name.toLowerCase()
    if (n.includes('nasdaq') || n.includes('technology')) return 'nasdaq'
    if (n.includes('emerging') || n.includes('emergente')) return 'emerging'
    if (n.includes('s&p 500') || n.includes('sp500') || n.includes('s&p500')) return 'sp500'
    if (n.includes('world') || n.includes('global') || n.includes('msci world')) return 'world'
    if (n.includes('bond') || n.includes('bono') || n.includes('renta fija')) return 'bonds'
    return 'other'
  }

  private guessEtfProxy(isin: string): string | undefined {
    // Common ISIN → ETF proxy mappings
    const proxies: Record<string, string> = {
      IE00B4L5Y983: 'IWDA.AS',    // iShares MSCI World
      IE00B03HCZ61: 'VWCE.DE',    // Vanguard FTSE All-World
      IE00B3XXRP09: 'VUSD.L',     // Vanguard S&P 500
      IE00B5BMR087: 'SXR8.DE',    // iShares Core S&P 500
      IE0032077012: 'EQQQ.L',     // Invesco NASDAQ-100
      IE00B3VVMM84: 'VFEM.AS',    // Vanguard Emerging Markets
      LU0274208692: 'XMWO.DE',    // Xtrackers MSCI World
    }
    return proxies[isin]
  }
}

export const importService = new ImportService()
