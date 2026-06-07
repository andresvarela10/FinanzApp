// ─── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

// ─── Transactions ──────────────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  icon: string
  isDefault: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: string
  description?: string
  notes?: string
  categoryId?: string
  category?: Category
  createdAt: string
}

export interface MonthlyStats {
  month: string
  income: number
  expenses: number
  savings: number
  savingsRate: number
}

// ─── Investments ───────────────────────────────────────────────────────────────
export type FundCategory = 'world' | 'sp500' | 'emerging' | 'nasdaq' | 'bonds' | 'other'
export type InvestmentTxType = 'buy' | 'sell' | 'dividend'

export interface Fund {
  id: string
  name: string
  isin: string
  etfProxy?: string
  currency: string
  broker?: string
  category?: FundCategory
  holding: {
    shares: number
    avgPurchasePrice: number
    totalInvested: number
    currentValue: number
    profitLoss: number
    profitLossPct: number
  } | null
  nav: {
    value: number
    date: string
    source: string
    dailyChange: number | null
  } | null
}

export interface InvestmentTransaction {
  id: string
  fundId: string
  fund: { name: string; isin: string }
  type: InvestmentTxType
  date: string
  shares: number
  pricePerShare: number
  amount: number
  fees: number
  description?: string
  importSource?: string
}

export interface PortfolioHolding {
  fund: { id: string; name: string; isin: string; category?: string }
  shares: number
  invested: number
  value: number
  gain: number
  gainPct: number
  weight: number
}

export interface PortfolioSummary {
  summary: {
    totalInvested: number
    currentValue: number
    totalGain: number
    totalGainPct: number
    annualizedReturn: number
    numberOfFunds: number
  }
  holdings: PortfolioHolding[]
  history: { date: string; value: number; invested: number }[]
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardData {
  summary: {
    netWorth: number
    cash: number
    totalInvested: number
    currentPortfolioValue: number
    portfolioGain: number
    portfolioGainPct: number
    monthlyIncome: number
    monthlyExpenses: number
    monthlySavings: number
    savingsRate: number
  }
  charts: {
    portfolioHistory: { date: string; value: number; invested: number }[]
    savingsEvolution: { month: string; income: number; expenses: number; savings: number }[]
    expensesByCategory: { name: string; color: string; icon: string; amount: number }[]
    assetDistribution: { name: string; value: number; color: string }[]
  }
}

// ─── Goals ─────────────────────────────────────────────────────────────────────
export type GoalType =
  | 'total_invested'
  | 'monthly_savings'
  | 'net_worth'
  | 'financial_independence'
  | 'custom'

export interface Goal {
  id: string
  name: string
  type: GoalType
  targetAmount: number | null
  currentAmount: number
  targetDate?: string
  description?: string
  icon?: string
  color?: string
  isCompleted: boolean
  progress: number
  estimatedDate?: string | null
  createdAt: string
}

// ─── Net Worth ─────────────────────────────────────────────────────────────────
export type AssetType =
  | 'bank_account'
  | 'fund'
  | 'etf'
  | 'stock'
  | 'crypto'
  | 'vehicle'
  | 'real_estate'
  | 'other'

export type LiabilityType = 'mortgage' | 'loan' | 'credit_card' | 'debt' | 'other'

export interface NetWorthAsset {
  id: string
  type: AssetType
  name: string
  amount: number
  currency: string
  date: string
  notes?: string
}

export interface NetWorthLiability {
  id: string
  type: LiabilityType
  name: string
  amount: number
  currency: string
  date: string
  notes?: string
}

export interface NetWorthSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  portfolioValue: number
  assetsByType: Record<string, number>
  history: {
    date: string
    totalAssets: number
    totalLiabilities: number
    netWorth: number
  }[]
}

// ─── Simulator ─────────────────────────────────────────────────────────────────
export interface SimulatorParams {
  initialCapital: number
  monthlyContribution: number
  annualReturn: number
  inflation: number
  years: number
}

export interface SimulatorResult {
  year: number
  nominal: number
  real: number
  invested: number
  gains: number
}

// ─── API ───────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
  details?: { field: string; message: string }[]
}
