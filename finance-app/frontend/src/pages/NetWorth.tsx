import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { netWorthApi } from '@/api'
import type { NetWorthSummary, NetWorthAsset, NetWorthLiability, AssetType, LiabilityType } from '@/types'
import {
  Card, CardHeader, CardTitle, Button, Modal,
  LoadingSpinner, EmptyState, Input, Select,
} from '@/components/ui/index'
import { formatCurrency, formatDate, gainColor } from '@/utils/formatters'

const ASSET_TYPES: { value: AssetType; label: string; icon: string; color: string }[] = [
  { value: 'bank_account', label: 'Cuenta bancaria', icon: '🏦', color: '#6366f1' },
  { value: 'fund',         label: 'Fondo indexado',  icon: '📈', color: '#00d4aa' },
  { value: 'etf',          label: 'ETF',             icon: '📊', color: '#0ea5e9' },
  { value: 'stock',        label: 'Acciones',        icon: '💹', color: '#f7a325' },
  { value: 'crypto',       label: 'Criptomonedas',   icon: '₿',  color: '#f97316' },
  { value: 'real_estate',  label: 'Inmuebles',       icon: '🏠', color: '#8b5cf6' },
  { value: 'vehicle',      label: 'Vehículos',       icon: '🚗', color: '#64748b' },
  { value: 'other',        label: 'Otros activos',   icon: '💼', color: '#94a3b8' },
]

const LIABILITY_TYPES: { value: LiabilityType; label: string; icon: string }[] = [
  { value: 'mortgage',    label: 'Hipoteca',         icon: '🏠' },
  { value: 'loan',        label: 'Préstamo',         icon: '💳' },
  { value: 'credit_card', label: 'Tarjeta crédito',  icon: '💳' },
  { value: 'debt',        label: 'Deuda',            icon: '📋' },
  { value: 'other',       label: 'Otro pasivo',      icon: '📌' },
]

export default function NetWorth() {
  const [summary, setSummary] = useState<NetWorthSummary | null>(null)
  const [assets, setAssets] = useState<NetWorthAsset[]>([])
  const [liabilities, setLiabilities] = useState<NetWorthLiability[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'assets' | 'liabilities'>('overview')
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddLiability, setShowAddLiability] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [s, a, l] = await Promise.all([
        netWorthApi.summary(),
        netWorthApi.listAssets(),
        netWorthApi.listLiabilities(),
      ])
      setSummary(s)
      setAssets(a)
      setLiabilities(l)
    } catch {
      toast.error('Error cargando patrimonio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDeleteAsset(id: string) {
    if (!confirm('¿Eliminar este activo?')) return
    try { await netWorthApi.deleteAsset(id); load() } catch { toast.error('Error') }
  }

  async function handleDeleteLiability(id: string) {
    if (!confirm('¿Eliminar este pasivo?')) return
    try { await netWorthApi.deleteLiability(id); load() } catch { toast.error('Error') }
  }

  if (loading) return <LoadingSpinner size="lg" className="h-64" />

  const s = summary

  // Build pie data from assetsByType
  const pieData = s
    ? Object.entries(s.assetsByType).map(([type, value]) => {
        const info = ASSET_TYPES.find(t => t.value === type)
        return { name: info?.label || type, value, color: info?.color || '#94a3b8', icon: info?.icon }
      }).filter(d => d.value > 0)
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">Patrimonio neto</h1>
          <p className="text-sm text-text-2 mt-0.5">Activos, pasivos y evolución</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddLiability(true)}>
            Pasivo
          </Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddAsset(true)}>
            Activo
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {s && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Patrimonio neto', value: formatCurrency(s.netWorth), accent: true, positive: s.netWorth >= 0 },
            { label: 'Total activos',   value: formatCurrency(s.totalAssets),       sub: `Inversiones: ${formatCurrency(s.portfolioValue)}` },
            { label: 'Total pasivos',   value: formatCurrency(s.totalLiabilities),  negative: true },
            { label: 'Ratio A/P',       value: s.totalLiabilities > 0 ? `${(s.totalAssets / s.totalLiabilities).toFixed(1)}x` : '∞',
              sub: 'Activos por cada € de deuda' },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-xl p-5 border ${
              kpi.accent
                ? (kpi.positive ? 'bg-primary/10 border-primary/30 shadow-glow-sm' : 'bg-loss/10 border-loss/30')
                : 'bg-surface border-border'
            }`}>
              <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">{kpi.label}</p>
              <p className={`text-2xl font-bold font-mono ${
                kpi.accent ? (kpi.positive ? 'text-primary' : 'text-loss')
                : kpi.negative ? 'text-loss' : 'text-text-1'
              }`}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-text-2 mt-1">{kpi.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded-xl w-fit">
        {(['overview', 'assets', 'liabilities'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-surface text-text-1 shadow-card' : 'text-text-2 hover:text-text-1'
            }`}
          >
            {{ overview: 'Resumen', assets: `Activos (${assets.length})`, liabilities: `Pasivos (${liabilities.length})` }[t]}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && s && (
        <div className="grid xl:grid-cols-3 gap-4">
          {/* History */}
          <Card className="xl:col-span-2">
            <CardHeader><CardTitle>Evolución del patrimonio neto</CardTitle></CardHeader>
            {s.history.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={s.history}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => new Date(v).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })} />
                  <YAxis tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatCurrency(v, 'EUR', true)} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']}
                    labelFormatter={v => new Date(v).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} />
                  <Area type="monotone" dataKey="netWorth"        name="Patrimonio neto" stroke="#00d4aa" fill="url(#nwGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="totalAssets"     name="Activos"         stroke="#6366f1" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="totalLiabilities" name="Pasivos"        stroke="#ff4d6a" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-text-3 text-sm">
                El historial se genera automáticamente cada mes
              </div>
            )}
          </Card>

          {/* Pie */}
          <Card>
            <CardHeader><CardTitle>Distribución de activos</CardTitle></CardHeader>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d, i) => {
                    const pct = s.totalAssets > 0 ? (d.value / s.totalAssets) * 100 : 0
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span>{d.icon}</span>
                        <span className="text-text-2 flex-1 truncate">{d.name}</span>
                        <span className="font-mono text-text-1 font-medium">{pct.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-text-3 text-sm">Sin activos</div>
            )}
          </Card>
        </div>
      )}

      {/* ── Assets ── */}
      {tab === 'assets' && (
        assets.length === 0 ? (
          <EmptyState icon="🏦" title="Sin activos registrados"
            description="Registra tus cuentas bancarias, inmuebles, vehículos y otros activos"
            action={<Button onClick={() => setShowAddAsset(true)} icon={<Plus className="w-4 h-4" />}>Añadir activo</Button>} />
        ) : (
          <div className="space-y-2">
            {assets.map(asset => {
              const info = ASSET_TYPES.find(t => t.value === asset.type)
              return (
                <div key={asset.id} className="flex items-center gap-4 bg-surface border border-border rounded-xl px-5 py-3.5 hover:border-border-2 transition-colors group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${info?.color}22` }}>
                    {info?.icon || '💼'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-1">{asset.name}</p>
                    <p className="text-xs text-text-2">{info?.label} · {formatDate(asset.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold font-mono text-gain">+{formatCurrency(asset.amount)}</p>
                    <button onClick={() => handleDeleteAsset(asset.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-loss/10 text-text-3 hover:text-loss transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Liabilities ── */}
      {tab === 'liabilities' && (
        liabilities.length === 0 ? (
          <EmptyState icon="📋" title="Sin pasivos registrados"
            description="Registra hipotecas, préstamos y otras deudas"
            action={<Button variant="secondary" onClick={() => setShowAddLiability(true)} icon={<Plus className="w-4 h-4" />}>Añadir pasivo</Button>} />
        ) : (
          <div className="space-y-2">
            {liabilities.map(lib => {
              const info = LIABILITY_TYPES.find(t => t.value === lib.type)
              return (
                <div key={lib.id} className="flex items-center gap-4 bg-surface border border-border rounded-xl px-5 py-3.5 hover:border-border-2 transition-colors group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 bg-loss/10">
                    {info?.icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-1">{lib.name}</p>
                    <p className="text-xs text-text-2">{info?.label} · {formatDate(lib.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold font-mono text-loss">-{formatCurrency(lib.amount)}</p>
                    <button onClick={() => handleDeleteLiability(lib.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-loss/10 text-text-3 hover:text-loss transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modals */}
      <AssetModal    isOpen={showAddAsset}      onClose={() => setShowAddAsset(false)}      onSaved={load} />
      <LiabilityModal isOpen={showAddLiability} onClose={() => setShowAddLiability(false)} onSaved={load} />
    </div>
  )
}

function AssetModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'bank_account' as AssetType, name: '', amount: '', currency: 'EUR', date: today, notes: '' })
  const [loading, setLoading] = useState(false)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await netWorthApi.createAsset({ ...form, amount: parseFloat(form.amount) })
      toast.success('Activo añadido')
      onSaved(); onClose()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir activo">
      <form onSubmit={submit} className="space-y-4">
        <Select label="Tipo de activo" value={form.type} onChange={s('type')}>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </Select>
        <Input label="Nombre" value={form.name} onChange={s('name')} placeholder="Ej: Cuenta ING, Piso Barcelona..." required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Valor (€)" type="number" step="0.01" value={form.amount} onChange={s('amount')} required />
          <Input label="Fecha de valoración" type="date" value={form.date} onChange={s('date')} required />
        </div>
        <Input label="Notas (opcional)" value={form.notes} onChange={s('notes')} />
        <Button type="submit" className="w-full" loading={loading}>Añadir activo</Button>
      </form>
    </Modal>
  )
}

function LiabilityModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'loan' as LiabilityType, name: '', amount: '', currency: 'EUR', date: today, notes: '' })
  const [loading, setLoading] = useState(false)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await netWorthApi.createLiability({ ...form, amount: parseFloat(form.amount) })
      toast.success('Pasivo añadido')
      onSaved(); onClose()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir pasivo">
      <form onSubmit={submit} className="space-y-4">
        <Select label="Tipo de pasivo" value={form.type} onChange={s('type')}>
          {LIABILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </Select>
        <Input label="Nombre" value={form.name} onChange={s('name')} placeholder="Ej: Hipoteca piso, Préstamo coche..." required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Importe pendiente (€)" type="number" step="0.01" value={form.amount} onChange={s('amount')} required />
          <Input label="Fecha" type="date" value={form.date} onChange={s('date')} required />
        </div>
        <Input label="Notas (opcional)" value={form.notes} onChange={s('notes')} />
        <Button type="submit" variant="danger" className="w-full" loading={loading}>Añadir pasivo</Button>
      </form>
    </Modal>
  )
}
