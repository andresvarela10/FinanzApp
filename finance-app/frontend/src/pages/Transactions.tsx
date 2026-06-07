import { useEffect, useState } from 'react'
import { Plus, Trash2, Filter, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { transactionsApi, categoriesApi } from '@/api'
import type { Transaction, Category, MonthlyStats } from '@/types'
import {
  Card, CardHeader, CardTitle, Button, Modal,
  EmptyState, LoadingSpinner, Input, Select,
} from '@/components/ui/index'
import { formatCurrency, formatDate, gainColor, gainBg } from '@/utils/formatters'

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<MonthlyStats[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState({ type: '', categoryId: '' })

  async function load() {
    setLoading(true)
    try {
      const [txRes, cats, monthlyStats] = await Promise.all([
        transactionsApi.list({ page, limit: 50, ...filter }),
        categoriesApi.list(),
        transactionsApi.monthlyStats(),
      ])
      setTransactions(txRes.data)
      setTotal(txRes.meta.total)
      setCategories(cats)
      setStats(monthlyStats)
    } catch {
      toast.error('Error cargando transacciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, filter])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta transacción?')) return
    try {
      await transactionsApi.delete(id)
      toast.success('Eliminada')
      load()
    } catch { toast.error('Error') }
  }

  const currentMonth = stats[stats.length - 1]
  const lastMonth = stats[stats.length - 2]

  if (loading && !transactions.length) return <LoadingSpinner size="lg" className="h-64" />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">Transacciones</h1>
          <p className="text-sm text-text-2 mt-0.5">Ingresos y gastos</p>
        </div>
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>
          Nueva
        </Button>
      </div>

      {/* Monthly overview */}
      {currentMonth && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Ingresos', value: currentMonth.income, color: 'text-gain' },
            { label: 'Gastos',   value: currentMonth.expenses, color: 'text-loss' },
            { label: 'Ahorro',   value: currentMonth.savings,
              color: currentMonth.savings >= 0 ? 'text-primary' : 'text-loss' },
          ].map((item, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-2 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-xl font-bold font-mono ${item.color}`}>{formatCurrency(item.value)}</p>
              {lastMonth && (
                <p className="text-xs text-text-3 mt-1">
                  vs {formatCurrency(i === 0 ? lastMonth.income : i === 1 ? lastMonth.expenses : lastMonth.savings)} mes ant.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Charts + Filters row */}
      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Evolución mensual</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.slice(-6)}>
              <XAxis dataKey="month" tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="income"   name="Ingresos" fill="#00c896" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" name="Gastos"   fill="#ff4d6a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <div className="space-y-3">
            <Select
              label="Tipo"
              value={filter.type}
              onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </Select>
            <Select
              label="Categoría"
              value={filter.categoryId}
              onChange={e => setFilter(f => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Todas</option>
              {categories.filter(c => !filter.type || c.type === filter.type).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
            {(filter.type || filter.categoryId) && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilter({ type: '', categoryId: '' })}>
                Limpiar filtros
              </Button>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-text-2">
            {total} transacciones
          </div>
        </Card>
      </div>

      {/* Transaction list */}
      {loading ? (
        <LoadingSpinner className="h-32" />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="💸"
          title="Sin transacciones"
          description="Registra tus ingresos y gastos para hacer seguimiento de tus finanzas"
          action={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Nueva transacción</Button>}
        />
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="flex items-center gap-4 bg-surface border border-border rounded-xl px-5 py-3.5 hover:border-border-2 transition-colors group"
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: `${tx.category?.color || '#525775'}22` }}
              >
                {tx.category?.icon || (tx.type === 'income' ? '💰' : '💸')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-1 truncate">
                  {tx.description || tx.category?.name || 'Sin descripción'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-2">{formatDate(tx.date)}</span>
                  {tx.category && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: `${tx.category.color}22`, color: tx.category.color }}
                    >
                      {tx.category.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <p className={`text-base font-bold font-mono ${tx.type === 'income' ? 'text-gain' : 'text-loss'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>

              {/* Delete */}
              <button
                onClick={() => handleDelete(tx.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-loss/10 text-text-3 hover:text-loss transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddTransactionModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        categories={categories}
        onSaved={load}
      />
    </div>
  )
}

function AddTransactionModal({ isOpen, onClose, categories, onSaved }: {
  isOpen: boolean; onClose: () => void; categories: Category[]; onSaved: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'expense', amount: '', date: today, categoryId: '', description: '' })
  const [loading, setLoading] = useState(false)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const filteredCats = categories.filter(c => c.type === form.type)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await transactionsApi.create({
        type: form.type as 'income' | 'expense',
        amount: parseFloat(form.amount),
        date: form.date,
        categoryId: form.categoryId || undefined,
        description: form.description || undefined,
      })
      toast.success('Transacción registrada')
      onSaved(); onClose()
      setForm({ type: 'expense', amount: '', date: today, categoryId: '', description: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva transacción">
      <form onSubmit={submit} className="space-y-4">
        {/* Income / Expense toggle */}
        <div className="flex bg-surface-2 p-1 rounded-xl">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: t, categoryId: '' }))}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                form.type === t
                  ? t === 'income' ? 'bg-gain/20 text-gain' : 'bg-loss/20 text-loss'
                  : 'text-text-2 hover:text-text-1'
              }`}
            >
              {t === 'income' ? '+ Ingreso' : '− Gasto'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Importe (€)" type="number" step="0.01" value={form.amount} onChange={s('amount')} placeholder="0.00" required />
          <Input label="Fecha" type="date" value={form.date} onChange={s('date')} required />
        </div>

        <Select label="Categoría" value={form.categoryId} onChange={s('categoryId')}>
          <option value="">Sin categoría</option>
          {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Select>

        <Input label="Descripción" value={form.description} onChange={s('description')} placeholder="Opcional..." />

        <Button type="submit" className="w-full" loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  )
}
