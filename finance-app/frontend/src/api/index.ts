import { api } from './client'
import type {
  AuthResponse, User, DashboardData, Transaction, MonthlyStats,
  Category, Fund, InvestmentTransaction, PortfolioSummary,
  Goal, NetWorthSummary, NetWorthAsset, NetWorthLiability,
  PaginatedResponse,
} from '@/types'

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { name, email, password }).then(r => r.data),
  me: () =>
    api.get<User>('/auth/me').then(r => r.data),
  updateProfile: (data: Partial<{ name: string; currentPassword: string; newPassword: string }>) =>
    api.put<User>('/auth/me', data).then(r => r.data),
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () =>
    api.get<DashboardData>('/dashboard').then(r => r.data),
}

// ─── Transactions ──────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: { type?: string; categoryId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Transaction>>('/transactions', { params }).then(r => r.data),
  create: (data: Omit<Transaction, 'id' | 'createdAt' | 'category'>) =>
    api.post<Transaction>('/transactions', data).then(r => r.data),
  update: (id: string, data: Partial<Transaction>) =>
    api.put<Transaction>(`/transactions/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/transactions/${id}`).then(r => r.data),
  monthlyStats: () =>
    api.get<MonthlyStats[]>('/transactions/stats/monthly').then(r => r.data),
}

// ─── Categories ────────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: (type?: string) =>
    api.get<Category[]>('/categories', { params: { type } }).then(r => r.data),
  create: (data: { name: string; type: string; color?: string; icon?: string }) =>
    api.post<Category>('/categories', data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/categories/${id}`).then(r => r.data),
}

// ─── Investments ───────────────────────────────────────────────────────────────
export const fundsApi = {
  list: () =>
    api.get<Fund[]>('/funds').then(r => r.data),
  create: (data: { name: string; isin: string; etfProxy?: string; currency?: string; broker?: string; category?: string }) =>
    api.post<Fund>('/funds', data).then(r => r.data),
  update: (id: string, data: Partial<Fund>) =>
    api.put<Fund>(`/funds/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/funds/${id}`).then(r => r.data),
  updateNav: (id: string) =>
    api.post(`/funds/${id}/update-nav`).then(r => r.data),
  intraday: (id: string) =>
    api.get(`/funds/${id}/intraday`).then(r => r.data),
}

export const investmentTxApi = {
  list: (params?: { fundId?: string; page?: number }) =>
    api.get<PaginatedResponse<InvestmentTransaction>>('/investment-transactions', { params }).then(r => r.data),
  create: (data: { fundId: string; type: string; date: string; shares: number; pricePerShare: number; amount: number; fees?: number; description?: string }) =>
    api.post<InvestmentTransaction>('/investment-transactions', data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/investment-transactions/${id}`).then(r => r.data),
}

export const portfolioApi = {
  summary: () =>
    api.get<PortfolioSummary>('/portfolio').then(r => r.data),
}

// ─── Import ────────────────────────────────────────────────────────────────────
export const importApi = {
  preview: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  import: (file: File, broker = 'myinvestor') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('broker', broker)
    return api.post('/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}

// ─── Goals ─────────────────────────────────────────────────────────────────────
export const goalsApi = {
  list: () =>
    api.get<Goal[]>('/goals').then(r => r.data),
  create: (data: Omit<Goal, 'id' | 'currentAmount' | 'progress' | 'isCompleted' | 'createdAt' | 'estimatedDate'>) =>
    api.post<Goal>('/goals', data).then(r => r.data),
  update: (id: string, data: Partial<Goal>) =>
    api.put<Goal>(`/goals/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/goals/${id}`).then(r => r.data),
}

// ─── Net Worth ─────────────────────────────────────────────────────────────────
export const netWorthApi = {
  summary: () =>
    api.get<NetWorthSummary>('/net-worth').then(r => r.data),
  listAssets: () =>
    api.get<NetWorthAsset[]>('/assets').then(r => r.data),
  createAsset: (data: Omit<NetWorthAsset, 'id'>) =>
    api.post<NetWorthAsset>('/assets', data).then(r => r.data),
  updateAsset: (id: string, data: Partial<NetWorthAsset>) =>
    api.put<NetWorthAsset>(`/assets/${id}`, data).then(r => r.data),
  deleteAsset: (id: string) =>
    api.delete(`/assets/${id}`).then(r => r.data),
  listLiabilities: () =>
    api.get<NetWorthLiability[]>('/liabilities').then(r => r.data),
  createLiability: (data: Omit<NetWorthLiability, 'id'>) =>
    api.post<NetWorthLiability>('/liabilities', data).then(r => r.data),
  updateLiability: (id: string, data: Partial<NetWorthLiability>) =>
    api.put<NetWorthLiability>(`/liabilities/${id}`, data).then(r => r.data),
  deleteLiability: (id: string) =>
    api.delete(`/liabilities/${id}`).then(r => r.data),
}
