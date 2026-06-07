import { Router } from 'express'
import { authenticate } from '../middleware/auth'

// Controllers
import * as auth from '../controllers/auth.controller'
import * as dashboard from '../controllers/dashboard.controller'
import * as transactions from '../controllers/transactions.controller'
import * as investments from '../controllers/investments.controller'
import * as goals from '../controllers/goals.controller'
import * as networth from '../controllers/networth.controller'
import { importFile, previewImport, upload } from '../controllers/import.controller'

const router = Router()

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', auth.register)
router.post('/auth/login', auth.login)
router.get('/auth/me', authenticate, auth.getProfile)
router.put('/auth/me', authenticate, auth.updateProfile)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, dashboard.getDashboard)

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', authenticate, transactions.getTransactions)
router.post('/transactions', authenticate, transactions.createTransaction)
router.put('/transactions/:id', authenticate, transactions.updateTransaction)
router.delete('/transactions/:id', authenticate, transactions.deleteTransaction)
router.get('/transactions/stats/monthly', authenticate, transactions.getMonthlyStats)

// Categories
router.get('/categories', authenticate, transactions.getCategories)
router.post('/categories', authenticate, transactions.createCategory)
router.delete('/categories/:id', authenticate, transactions.deleteCategory)

// ─── Investments ──────────────────────────────────────────────────────────────
router.get('/funds', authenticate, investments.getFunds)
router.post('/funds', authenticate, investments.createFund)
router.put('/funds/:id', authenticate, investments.updateFund)
router.delete('/funds/:id', authenticate, investments.deleteFund)
router.post('/funds/:id/update-nav', authenticate, investments.updateFundNav)
router.get('/funds/:id/intraday', authenticate, investments.getEtfIntradayPrice)

router.get('/investment-transactions', authenticate, investments.getInvestmentTransactions)
router.post('/investment-transactions', authenticate, investments.createInvestmentTransaction)
router.delete('/investment-transactions/:id', authenticate, investments.deleteInvestmentTransaction)

router.get('/portfolio', authenticate, investments.getPortfolioSummary)

// ─── Import ───────────────────────────────────────────────────────────────────
router.post('/import/preview', authenticate, upload.single('file'), previewImport)
router.post('/import', authenticate, upload.single('file'), importFile)

// ─── Goals ────────────────────────────────────────────────────────────────────
router.get('/goals', authenticate, goals.getGoals)
router.post('/goals', authenticate, goals.createGoal)
router.put('/goals/:id', authenticate, goals.updateGoal)
router.delete('/goals/:id', authenticate, goals.deleteGoal)

// ─── Net Worth ────────────────────────────────────────────────────────────────
router.get('/net-worth', authenticate, networth.getNetWorthSummary)

router.get('/assets', authenticate, networth.getAssets)
router.post('/assets', authenticate, networth.createAsset)
router.put('/assets/:id', authenticate, networth.updateAsset)
router.delete('/assets/:id', authenticate, networth.deleteAsset)

router.get('/liabilities', authenticate, networth.getLiabilities)
router.post('/liabilities', authenticate, networth.createLiability)
router.put('/liabilities/:id', authenticate, networth.updateLiability)
router.delete('/liabilities/:id', authenticate, networth.deleteLiability)

export default router
