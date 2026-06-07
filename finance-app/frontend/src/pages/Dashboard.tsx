import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboardApi } from '@/api'
import type { DashboardData } from '@/types'
import { Card, CardHeader, CardTitle, LoadingSpinner } from '@/components/ui/index'
import { formatCurrency, formatPercent, gainColor } from '@/utils/formatters'

const CHART_COLORS = {
  primary: '#00d4aa',
  gain: '#00c896',
  loss: '#ff4d6a',
  accent: '#6366f1',
  warning: '#f7a325',
  invested: '#525775',
}

function CustomTooltip({ active, payload, label, currency = true }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3 shadow-card text-xs">
      <p className="text-text-2 mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-2">{p.name}:</span>
          <span className="text-text-1 font-mono font-semibold">
            {currency ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const d = await dashboardApi.get()
      setData(d)
    } catch {
      toast.error('Error cargando el dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingSpinner size="lg" className="h-64" />
  if (!data) return null

  const { summary, charts } = data
  const isPortfolioPositive = summary.portfolioGainPct >= 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">Dashboard</h1>
          <p className="text-sm text-text-2 mt-0.5">Resumen de tu situación financiera</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-text-2 hover:text-primary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Patrimonio neto"
          value={formatCurrency(summary.netWorth)}
          icon={<Wallet className="w-5 h-5" />}
          accent
        />
        <KpiCard
          label="Cartera inversiones"
          value={formatCurrency(summary.currentPortfolioValue)}
          sub={
            <span className={gainColor(summary.portfolioGainPct)}>
              {formatPercent(summary.portfolioGainPct)} total
            </span>
          }
          icon={isPortfolioPositive
            ? <TrendingUp className="w-5 h-5 text-gain" />
            : <TrendingDown className="w-5 h-5 text-loss" />}
        />
        <KpiCard
          label="Ahorro este mes"
          value={formatCurrency(summary.monthlySavings)}
          sub={<span className="text-text-2">{formatPercent(summary.savingsRate, 0)} tasa de ahorro</span>}
          icon={<PiggyBank className="w-5 h-5 text-accent" />}
        />
        <KpiCard
          label="Ingresos / Gastos"
          value={formatCurrency(summary.monthlyIncome)}
          sub={<span className="text-loss">{formatCurrency(summary.monthlyExpenses)} gastos</span>}
          icon={<Target className="w-5 h-5 text-warning" />}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Portfolio evolution */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Evolución de la cartera</CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-primary inline-block rounded" /> Valor
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-text-3 inline-block rounded" /> Invertido
              </span>
            </div>
          </CardHeader>
          {charts.portfolioHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.portfolioHistory}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, 'EUR', true)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Valor" stroke={CHART_COLORS.primary} fill="url(#valGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="invested" name="Invertido" stroke={CHART_COLORS.invested} fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-3 text-sm">
              Sin datos suficientes — añade inversiones para ver la evolución
            </div>
          )}
        </Card>

        {/* Asset distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de activos</CardTitle>
          </CardHeader>
          {charts.assetDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={charts.assetDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {charts.assetDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {charts.assetDistribution.map((item, i) => {
                  const total = charts.assetDistribution.reduce((s, a) => s + a.value, 0)
                  const pct = total > 0 ? (item.value / total) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-text-2 flex-1 truncate">{item.name}</span>
                      <span className="text-text-1 font-mono font-medium">{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-text-3 text-sm">Sin activos registrados</div>
          )}
        </Card>
      </div>

      {/* ── Savings & Expenses ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Monthly savings evolution */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución mensual</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.savingsEvolution} barGap={2}>
              <XAxis dataKey="month" tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, 'EUR', true)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Ingresos" fill={CHART_COLORS.gain} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill={CHART_COLORS.loss} radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Ahorro" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Expenses by category */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por categoría</CardTitle>
            <span className="text-xs text-text-2">Este mes</span>
          </CardHeader>
          {charts.expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {charts.expensesByCategory.slice(0, 6).map((cat, i) => {
                const total = charts.expensesByCategory.reduce((s, c) => s + c.amount, 0)
                const pct = total > 0 ? (cat.amount / total) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span className="text-text-1 font-medium">{cat.name}</span>
                      </span>
                      <span className="text-text-2 font-mono">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-text-3 text-sm">
              Sin gastos este mes
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, sub, icon, accent,
}: {
  label: string
  value: string
  sub?: React.ReactNode
  icon?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-primary/10 border-primary/30 shadow-glow-sm' : 'bg-surface border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-2 uppercase tracking-wider">{label}</span>
        <span className={accent ? 'text-primary' : 'text-text-3'}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold font-mono ${accent ? 'text-primary' : 'text-text-1'}`}>{value}</p>
      {sub && <div className="mt-1.5 text-xs">{sub}</div>}
    </div>
  )
}
