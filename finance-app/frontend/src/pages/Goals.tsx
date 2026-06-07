import { useEffect, useState } from 'react'
import { Plus, Target, Trash2, CheckCircle2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { goalsApi } from '@/api'
import type { Goal, GoalType } from '@/types'
import {
  Card, Button, Modal, EmptyState, LoadingSpinner, Input, Select,
} from '@/components/ui/index'
import { formatCurrency, formatDate } from '@/utils/formatters'

const GOAL_TYPES: { value: GoalType; label: string; icon: string; description: string }[] = [
  { value: 'total_invested',        icon: '📈', label: 'Capital invertido',     description: 'Alcanzar un importe total invertido en fondos' },
  { value: 'monthly_savings',       icon: '💰', label: 'Ahorro mensual',        description: 'Ahorrar una cantidad fija al mes' },
  { value: 'net_worth',             icon: '🏦', label: 'Patrimonio neto',       description: 'Alcanzar un patrimonio neto determinado' },
  { value: 'financial_independence',icon: '🌴', label: 'Independencia financiera', description: 'Alcanzar la libertad financiera (FIRE)' },
  { value: 'custom',                icon: '⭐', label: 'Personalizado',         description: 'Define tu propio objetivo' },
]

const GOAL_COLORS = ['#00d4aa', '#6366f1', '#f7a325', '#00c896', '#ff4d6a', '#0ea5e9']

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    try { setGoals(await goalsApi.list()) }
    catch { toast.error('Error cargando objetivos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este objetivo?')) return
    try { await goalsApi.delete(id); load() } catch { toast.error('Error') }
  }

  if (loading) return <LoadingSpinner size="lg" className="h-64" />

  const completed = goals.filter(g => g.progress >= 100)
  const active    = goals.filter(g => g.progress < 100)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">Objetivos financieros</h1>
          <p className="text-sm text-text-2 mt-0.5">{active.length} activos · {completed.length} completados</p>
        </div>
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>
          Nuevo objetivo
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Sin objetivos aún"
          description="Crea objetivos financieros para mantener el foco en tu camino hacia la independencia financiera"
          action={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Crear objetivo</Button>}
        />
      ) : (
        <div className="space-y-4">
          {active.map(goal => <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />)}
          {completed.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-text-2 uppercase tracking-wider pt-2">✅ Completados</h2>
              {completed.map(goal => <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} />)}
            </>
          )}
        </div>
      )}

      <AddGoalModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSaved={load} />
    </div>
  )
}

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: (id: string) => void }) {
  const type = GOAL_TYPES.find(t => t.value === goal.type)
  const color = goal.color || GOAL_COLORS[0]
  const pct = Math.min(100, goal.progress)
  const isCompleted = pct >= 100

  return (
    <Card className={isCompleted ? 'opacity-80' : ''}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${color}22` }}
        >
          {goal.icon || type?.icon || '🎯'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-bold text-text-1">{goal.name}</h3>
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-gain" />}
            <span className="text-xs px-2 py-0.5 rounded-md font-medium text-text-2 bg-surface-2">
              {type?.label}
            </span>
          </div>
          {goal.description && <p className="text-xs text-text-2 mb-3">{goal.description}</p>}

          {/* Progress bar */}
          {goal.targetAmount && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-2">
                  <span className="font-mono font-semibold text-text-1">{formatCurrency(goal.currentAmount)}</span>
                  {' '}de {formatCurrency(goal.targetAmount)}
                </span>
                <span className="font-bold font-mono" style={{ color }}>{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-text-3 mt-2">
            {goal.targetDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Objetivo: {formatDate(goal.targetDate)}
              </span>
            )}
            {goal.estimatedDate && !isCompleted && (
              <span className="flex items-center gap-1 text-primary">
                <Target className="w-3 h-3" />
                Estimado: {formatDate(goal.estimatedDate)}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(goal.id)}
          className="p-1.5 rounded-lg hover:bg-loss/10 text-text-3 hover:text-loss transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}

function AddGoalModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({ name: '', type: 'total_invested' as GoalType, targetAmount: '', targetDate: '', description: '', icon: '', color: GOAL_COLORS[0] })
  const [loading, setLoading] = useState(false)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedType = GOAL_TYPES.find(t => t.value === form.type)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await goalsApi.create({
        name: form.name,
        type: form.type,
        targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : null,
        targetDate: form.targetDate || undefined,
        description: form.description || undefined,
        icon: form.icon || undefined,
        color: form.color,
      } as any)
      toast.success('Objetivo creado')
      onSaved(); onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error')
    } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo objetivo" size="md">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Nombre del objetivo" value={form.name} onChange={s('name')} placeholder="Ej: 100.000€ invertidos" required />

        <Select label="Tipo" value={form.type} onChange={s('type')}>
          {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </Select>

        {selectedType && (
          <p className="text-xs text-text-2 bg-surface-2 rounded-lg p-2.5">{selectedType.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Importe objetivo (€)" type="number" step="100" value={form.targetAmount} onChange={s('targetAmount')} placeholder="100000" />
          <Input label="Fecha objetivo" type="date" value={form.targetDate} onChange={s('targetDate')} />
        </div>

        <Input label="Descripción (opcional)" value={form.description} onChange={s('description')} />

        {/* Color picker */}
        <div>
          <label className="block text-xs font-medium text-text-2 mb-2">Color</label>
          <div className="flex gap-2">
            {GOAL_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-surface ring-white/30' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" loading={loading}>Crear objetivo</Button>
      </form>
    </Modal>
  )
}
