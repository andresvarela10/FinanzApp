import { useEffect, useState } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Plus, RefreshCw, Zap, TrendingUp, TrendingDown,
  AlertCircle, Trash2, Edit2, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fundsApi, investmentTxApi, portfolioApi } from '@/api'
import type { Fund, InvestmentTransaction, PortfolioSummary } from '@/types'
import {
  Card, CardHeader, CardTitle, Button, Modal,
  LoadingSpinner, EmptyState, Input, Select,
} from '@/components/ui/index'
import {
  formatCurrency, formatPercent, formatDate, formatShares,
  gainColor, gainBg,
} from '@/utils/formatters'

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  world:    { label: 'MSCI World',      color: '#00d4aa' },
  sp500:    { label: 'S&P 500',         color: '#6366f1' },
  emerging: { label: 'Emergentes',      color: '#f7a325' },
  nasdaq:   { label: 'NASDAQ',          color: '#0ea5e9' },
  bonds:    { label: 'Renta Fija',      color: '#8b5cf6' },
  other:    { label: 'Otros',           color: '#64748b' },
}

export default function Investments() {
  const [funds, setFunds] = useState<Fund[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'funds' | 'transactions'>('overview')
  const [showAddFund, setShowAddFund] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [updatingNav, setUpdatingNav] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      const [f, p, t] = await Promise.all([
        fundsApi.list(),
        portfolioApi.summary(),
        investmentTxApi.list({ limit: 100 }),
      ])
      setFunds(f)
      setPortfolio(p)
      setTransactions(t.data)
    } catch {
      toast.error('Error cargando inversiones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUpdateNav(fund: Fund) {
    setUpdatingNav(fund.id)
    try {
      await fundsApi.updateNav(fund.id)
      toast.success('NAV actualizado')
      load()
    } catch {
      toast.error('No se pudo actualizar el NAV')
    } finally {
      setUpdatingNav(null)
    }
  }

  async function handleDeleteFund(id: string) {
    if (!confirm('¿Eliminar este fondo y todas sus transacciones?')) return
    try {
      await fundsApi.delete(id)
      toast.success('Fondo eliminado')
      load()
    } catch {
      toast.error('Error eliminando fondo')
    }
  }

  if (loading) return <LoadingSpinner size="lg" className="h-64" />

  const s = portfolio?.summary

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">Inversiones</h1>
          <p className="text-sm text-text-2 mt-0.5">Cartera de fondos indexados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={load}>
            Actualizar
          </Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddFund(true)}>
            Añadir fondo
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      {s && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Capital invertido',    value: formatCurrency(s.totalInvested) },
            { label: 'Valor actual',          value: formatCurrency(s.currentValue),
              accent: true },
            { label: 'Ganancia / Pérdida',
              value: formatCurrency(s.totalGain),
              sub: formatPercent(s.totalGainPct),
              positive: s.totalGain >= 0 },
            { label: 'Rentabilidad anual.',
              value: formatPercent(s.annualizedReturn),
              sub: `${s.numberOfFunds} fondos` },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-xl p-5 border ${
              kpi.accent ? 'bg-primary/10 border-primary/30 shadow-glow-sm' : 'bg-surface border-border'
            }`}>
              <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">{kpi.label}</p>
              <p className={`text-2xl font-bold font-mono ${
                kpi.accent ? 'text-primary' :
                kpi.positive !== undefined ? (kpi.positive ? 'text-gain' : 'text-loss') :
                'text-text-1'
              }`}>{kpi.value}</p>
              {kpi.sub && <p className={`text-xs mt-1 ${kpi.positive !== undefined ? (kpi.positive ? 'text-gain' : 'text-loss') : 'text-text-2'}`}>{kpi.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded-xl w-fit">
        {(['overview', 'funds', 'transactions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-surface text-text-1 shadow-card' : 'text-text-2 hover:text-text-1'
            }`}
          >
            {{ overview: 'Resumen', funds: 'Fondos', transactions: 'Operaciones' }[t]}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="grid xl:grid-cols-3 gap-4">
          {/* History chart */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Evolución de la cartera</CardTitle>
            </CardHeader>
            {portfolio && portfolio.history.length > 1 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={portfolio.history}>
                  <defs>
                    <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, 'EUR', true)} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                  <Area type="monotone" dataKey="value" name="Valor" stroke="#00d4aa" fill="url(#portGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="invested" name="Invertido" stroke="#525775" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-text-3 text-sm">
                Sin historial disponible aún
              </div>
            )}
          </Card>

          {/* Allocation pie */}
          <Card>
            <CardHeader><CardTitle>Distribución</CardTitle></CardHeader>
            {portfolio && portfolio.holdings.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={portfolio.holdings} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} stroke="none">
                      {portfolio.holdings.map((h, i) => (
                        <Cell key={i} fill={Object.values(CATEGORY_LABELS)[i % 6]?.color || '#00d4aa'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {portfolio.holdings.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: Object.values(CATEGORY_LABELS)[i % 6]?.color }} />
                      <span className="text-text-2 flex-1 truncate">{h.fund.name.split(' ').slice(0, 3).join(' ')}</span>
                      <span className="text-text-1 font-mono">{h.weight.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-text-3 text-sm">Sin posiciones</div>
            )}
          </Card>
        </div>
      )}

      {/* ── Funds Tab ── */}
      {tab === 'funds' && (
        <div className="space-y-3">
          {funds.length === 0 ? (
            <EmptyState
              icon="📈"
              title="Sin fondos registrados"
              description="Añade tus fondos indexados para hacer seguimiento de tu cartera"
              action={<Button onClick={() => setShowAddFund(true)} icon={<Plus className="w-4 h-4" />}>Añadir fondo</Button>}
            />
          ) : (
            funds.map(fund => <FundCard key={fund.id} fund={fund} onUpdateNav={handleUpdateNav} onDelete={handleDeleteFund} updatingNav={updatingNav} />)
          )}
        </div>
      )}

      {/* ── Transactions Tab ── */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddTx(true)}>
              Nueva operación
            </Button>
          </div>
          {transactions.length === 0 ? (
            <EmptyState icon="📋" title="Sin operaciones" description="Registra tus compras de participaciones o importa desde MyInvestor" />
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 bg-surface border border-border rounded-xl px-5 py-3.5 hover:border-border-2 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${tx.type === 'buy' ? 'bg-gain/10' : 'bg-loss/10'}`}>
                    {tx.type === 'buy' ? '↗' : '↙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-1 truncate">{tx.fund.name}</p>
                    <p className="text-xs text-text-2">{formatDate(tx.date)} · {formatShares(tx.shares)} participaciones</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${tx.type === 'buy' ? 'text-loss' : 'text-gain'}`}>
                      {tx.type === 'buy' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-text-2 font-mono">{formatCurrency(tx.pricePerShare)} / part.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddFundModal isOpen={showAddFund} onClose={() => setShowAddFund(false)} onSaved={load} />
      <AddTransactionModal isOpen={showAddTx} onClose={() => setShowAddTx(false)} funds={funds} onSaved={load} />
    </div>
  )
}

function FundCard({ fund, onUpdateNav, onDelete, updatingNav }: {
  fund: Fund
  onUpdateNav: (f: Fund) => void
  onDelete: (id: string) => void
  updatingNav: string | null
}) {
  const h = fund.holding
  const nav = fund.nav
  const cat = CATEGORY_LABELS[fund.category || 'other']

  return (
    <Card className="hover:border-border-2 transition-colors">
      <div className="flex items-start gap-4 flex-wrap">
        {/* Fund info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-text-1">{fund.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: `${cat?.color}22`, color: cat?.color }}>
              {cat?.label || fund.category}
            </span>
            {fund.etfProxy && (
              <span className="flex items-center gap-1 text-xs text-text-3">
                <Zap className="w-3 h-3 text-warning" /> {fund.etfProxy}
              </span>
            )}
          </div>
          <p className="text-xs text-text-3 font-mono">{fund.isin} · {fund.broker}</p>
        </div>

        {/* Holdings */}
        {h && (
          <div className="grid grid-cols-3 gap-6 text-right">
            <div>
              <p className="text-xs text-text-2 mb-0.5">Invertido</p>
              <p className="text-sm font-bold font-mono text-text-1">{formatCurrency(h.totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-text-2 mb-0.5">Valor actual</p>
              <p className="text-sm font-bold font-mono text-text-1">{formatCurrency(h.currentValue)}</p>
            </div>
            <div>
              <p className="text-xs text-text-2 mb-0.5">Rentabilidad</p>
              <p className={`text-sm font-bold font-mono ${gainColor(h.profitLossPct)}`}>
                {formatPercent(h.profitLossPct)}
              </p>
            </div>
          </div>
        )}

        {/* NAV & actions */}
        <div className="flex items-center gap-3">
          {nav && (
            <div className="text-right">
              <p className="text-xs text-text-2 mb-0.5">
                NAV · <span className="text-text-3">{nav.source}</span>
              </p>
              <p className="text-sm font-bold font-mono text-text-1">{formatCurrency(nav.value, fund.currency)}</p>
              {nav.dailyChange !== null && (
                <p className={`text-xs font-mono ${gainColor(nav.dailyChange)}`}>
                  {formatPercent(nav.dailyChange)}
                </p>
              )}
            </div>
          )}
          <button onClick={() => onUpdateNav(fund)} title="Actualizar NAV"
            className="p-2 rounded-lg hover:bg-surface-2 text-text-3 hover:text-primary transition-colors">
            <RefreshCw className={`w-4 h-4 ${updatingNav === fund.id ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => onDelete(fund.id)} title="Eliminar"
            className="p-2 rounded-lg hover:bg-loss/10 text-text-3 hover:text-loss transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function AddFundModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', isin: '', etfProxy: '', broker: 'MyInvestor', category: 'world' })
  const [loading, setLoading] = useState(false)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fundsApi.create(form)
      toast.success('Fondo añadido')
      onSaved(); onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al añadir fondo')
    } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir fondo indexado">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nombre del fondo" value={form.name} onChange={s('name')} placeholder="Vanguard Global Stock Index EUR Acc" required />
        <Input label="ISIN" value={form.isin} onChange={s('isin')} placeholder="IE00B03HCZ61" maxLength={12} required />
        <Input label="ETF Proxy (ticker)" value={form.etfProxy} onChange={s('etfProxy')} placeholder="VWCE.DE (opcional, para estimación intradía)" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Categoría" value={form.category} onChange={s('category')}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Input label="Broker" value={form.broker} onChange={s('broker')} />
        </div>
        <Button type="submit" className="w-full" loading={loading}>Añadir fondo</Button>
      </form>
    </Modal>
  )
}

function AddTransactionModal({ isOpen, onClose, funds, onSaved }: {
  isOpen: boolean; onClose: () => void; funds: Fund[]; onSaved: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ fundId: funds[0]?.id || '', type: 'buy', date: today, shares: '', pricePerShare: '', amount: '', fees: '0' })
  const [loading, setLoading] = useState(false)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await investmentTxApi.create({
        fundId: form.fundId,
        type: form.type,
        date: form.date,
        shares: parseFloat(form.shares),
        pricePerShare: parseFloat(form.pricePerShare),
        amount: parseFloat(form.amount),
        fees: parseFloat(form.fees),
      })
      toast.success('Operación registrada')
      onSaved(); onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva operación">
      <form onSubmit={submit} className="space-y-4">
        <Select label="Fondo" value={form.fundId} onChange={s('fundId')} required>
          {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Tipo" value={form.type} onChange={s('type')}>
            <option value="buy">Compra</option>
            <option value="sell">Venta</option>
            <option value="dividend">Dividendo</option>
          </Select>
          <Input label="Fecha" type="date" value={form.date} onChange={s('date')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Participaciones" type="number" step="0.000001" value={form.shares} onChange={s('shares')} required />
          <Input label="Precio / part." type="number" step="0.0001" value={form.pricePerShare} onChange={s('pricePerShare')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Importe total (€)" type="number" step="0.01" value={form.amount} onChange={s('amount')} required />
          <Input label="Comisiones (€)" type="number" step="0.01" value={form.fees} onChange={s('fees')} />
        </div>
        <Button type="submit" className="w-full" loading={loading}>Registrar operación</Button>
      </form>
    </Modal>
  )
}
