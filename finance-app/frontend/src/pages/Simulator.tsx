import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Calculator, TrendingUp, Info } from 'lucide-react'
import { calculateCompoundInterest } from '@/utils/calculations'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { Card, CardHeader, CardTitle } from '@/components/ui/index'

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm font-medium text-text-1">{label}</label>
        <span className="text-sm font-bold font-mono text-primary">
          {unit === '€' ? formatCurrency(value, 'EUR', value >= 1000) : `${value}${unit}`}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-surface-3 rounded-full appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-text-3 mt-1">
        <span>{unit === '€' ? formatCurrency(min, 'EUR', min >= 1000) : `${min}${unit}`}</span>
        <span>{unit === '€' ? formatCurrency(max, 'EUR', max >= 1000) : `${max}${unit}`}</span>
      </div>
    </div>
  )
}

export default function Simulator() {
  const [params, setParams] = useState({
    initialCapital: 10000,
    monthlyContribution: 500,
    annualReturn: 7,
    inflation: 2.5,
    years: 30,
  })

  const results = useMemo(() => calculateCompoundInterest(params), [params])
  const final = results[results.length - 1]
  const totalInvested = params.initialCapital + params.monthlyContribution * 12 * params.years

  const set = (k: keyof typeof params) => (v: number) => setParams(p => ({ ...p, [k]: v }))

  // Scenarios for comparison
  const scenarios = useMemo(() => [
    { label: 'Conservador', return: 4, color: '#f7a325' },
    { label: 'Moderado',    return: 7, color: '#00d4aa' },
    { label: 'Optimista',  return: 10, color: '#6366f1' },
  ].map(s => {
    const r = calculateCompoundInterest({ ...params, annualReturn: s.return })
    return { ...s, final: r[r.length - 1]?.nominal || 0 }
  }), [params])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-1">Simulador de interés compuesto</h1>
        <p className="text-sm text-text-2 mt-0.5">Calcula el crecimiento de tu cartera a largo plazo</p>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        {/* Controls */}
        <Card className="xl:col-span-2 space-y-6">
          <Slider label="Capital inicial" value={params.initialCapital} min={0} max={100000} step={1000} unit="€" onChange={set('initialCapital')} />
          <Slider label="Aportación mensual" value={params.monthlyContribution} min={0} max={5000} step={50} unit="€" onChange={set('monthlyContribution')} />
          <Slider label="Rentabilidad anual esperada" value={params.annualReturn} min={1} max={20} step={0.5} unit="%" onChange={set('annualReturn')} />
          <Slider label="Inflación estimada" value={params.inflation} min={0} max={10} step={0.5} unit="%" onChange={set('inflation')} />
          <Slider label="Número de años" value={params.years} min={1} max={50} step={1} unit=" años" onChange={set('years')} />
        </Card>

        {/* Results */}
        <div className="xl:col-span-3 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Capital final nominal',  value: formatCurrency(final?.nominal || 0), color: 'text-primary', accent: true },
              { label: 'Capital final real',     value: formatCurrency(final?.real || 0),    color: 'text-text-1' },
              { label: 'Total invertido',        value: formatCurrency(totalInvested),        color: 'text-text-1' },
              { label: 'Ganancias generadas',    value: formatCurrency(final?.gains || 0),   color: 'text-gain' },
            ].map((kpi, i) => (
              <div key={i} className={`rounded-xl p-4 border ${kpi.accent ? 'bg-primary/10 border-primary/30' : 'bg-surface border-border'}`}>
                <p className="text-xs text-text-2 uppercase tracking-wider mb-1">{kpi.label}</p>
                <p className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Power of compound interest */}
          <div className="bg-surface-2 border border-border-2 rounded-xl px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-2">
              De {formatCurrency(final?.nominal || 0)}, solo has invertido {formatCurrency(totalInvested)} ({(totalInvested / (final?.nominal || 1) * 100).toFixed(0)}%).
              El interés compuesto genera el resto: <span className="text-gain font-semibold">{formatCurrency(final?.gains || 0)}</span>.
            </p>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader><CardTitle>Crecimiento proyectado</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={results}>
                <defs>
                  <linearGradient id="nomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}a`} />
                <YAxis tick={{ fill: '#525775', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, 'EUR', true)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={v => `Año ${v}`} />
                <Area type="monotone" dataKey="nominal"  name="Nominal"  stroke="#00d4aa" fill="url(#nomGrad)"  strokeWidth={2} />
                <Area type="monotone" dataKey="real"     name="Real"     stroke="#6366f1" fill="url(#realGrad)" strokeWidth={2} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="invested" name="Invertido" stroke="#525775" fill="none"          strokeWidth={1.5} strokeDasharray="2 4" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Scenario comparison */}
          <Card>
            <CardHeader><CardTitle>Comparativa de escenarios a {params.years} años</CardTitle></CardHeader>
            <div className="space-y-3">
              {scenarios.map((s, i) => {
                const maxVal = Math.max(...scenarios.map(s => s.final))
                const pct = maxVal > 0 ? (s.final / maxVal) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium" style={{ color: s.color }}>{s.label} ({s.return}%)</span>
                      <span className="font-bold font-mono text-text-1">{formatCurrency(s.final, 'EUR', true)}</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
