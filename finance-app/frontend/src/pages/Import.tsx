import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { importApi } from '@/api'
import { Card, CardHeader, CardTitle, Button, LoadingSpinner, Select } from '@/components/ui/index'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface ImportResult {
  message: string
  imported: number
  skipped: number
  errors: string[]
  fundsSummary: { fundName: string; count: number }[]
}

interface PreviewTx {
  date: Date
  type: 'buy' | 'sell' | 'dividend'
  fundName: string
  isin?: string
  shares: number
  pricePerShare: number
  amount: number
}

const BROKERS = [
  { value: 'myinvestor', label: 'MyInvestor', icon: '🏦' },
  { value: 'indexa',     label: 'Indexa Capital', icon: '📊' },
  { value: 'finizens',   label: 'Finizens', icon: '💼' },
  { value: 'other',      label: 'Otro broker', icon: '🌐' },
]

export default function Import() {
  const [file, setFile] = useState<File | null>(null)
  const [broker, setBroker] = useState('myinvestor')
  const [preview, setPreview] = useState<PreviewTx[] | null>(null)
  const [previewTotal, setPreviewTotal] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) selectFile(f)
  }

  function selectFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls', 'txt'].includes(ext || '')) {
      toast.error('Formato no soportado. Usa CSV o Excel.')
      return
    }
    setFile(f)
    setPreview(null)
    setResult(null)
    setStep('upload')
  }

  async function handlePreview() {
    if (!file) return
    setLoading(true)
    try {
      const data = await importApi.preview(file)
      setPreview(data.preview)
      setPreviewTotal(data.total)
      setStep('preview')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al leer el archivo')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    try {
      const data = await importApi.import(file, broker)
      setResult(data)
      setStep('done')
      toast.success(data.imported > 0 ? `✅ ${data.imported} operaciones importadas` : 'Sin nuevas operaciones')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error durante la importación')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setStep('upload')
    if (inputRef.current) inputRef.current.value = ''
  }

  const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    buy:      { label: 'Compra',    color: '#00c896' },
    sell:     { label: 'Venta',     color: '#ff4d6a' },
    dividend: { label: 'Dividendo', color: '#6366f1' },
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-1">Importar operaciones</h1>
        <p className="text-sm text-text-2 mt-0.5">Importa tus movimientos desde MyInvestor u otros brokers</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: 'upload',  label: '1. Seleccionar archivo' },
          { id: 'preview', label: '2. Vista previa' },
          { id: 'done',    label: '3. Importado' },
        ].map((s, i, arr) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className={`font-medium ${step === s.id ? 'text-primary' : step === 'done' || (step === 'preview' && i === 0) ? 'text-gain' : 'text-text-3'}`}>
              {s.label}
            </span>
            {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-text-3" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Broker selector */}
          <Card>
            <CardHeader><CardTitle>¿De qué broker importas?</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-2">
              {BROKERS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBroker(b.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                    broker === b.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface-2 text-text-2 hover:border-border-2 hover:text-text-1'
                  }`}
                >
                  <span className="text-xl">{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
              ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface-2'}
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={e => e.target.files?.[0] && selectFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-2">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-text-1">{file.name}</p>
                <p className="text-sm text-text-2">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={e => { e.stopPropagation(); reset() }}
                  className="text-xs text-text-3 hover:text-loss transition-colors flex items-center gap-1 mx-auto"
                >
                  <X className="w-3 h-3" /> Quitar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-surface-3 rounded-xl flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7 text-text-3" />
                </div>
                <div>
                  <p className="font-semibold text-text-1">Arrastra tu archivo aquí</p>
                  <p className="text-sm text-text-2 mt-1">o haz clic para seleccionarlo</p>
                </div>
                <p className="text-xs text-text-3">Compatible: CSV, Excel (.xlsx, .xls)</p>
              </div>
            )}
          </div>

          {file && (
            <Button className="w-full" size="lg" onClick={handlePreview} loading={loading}>
              Vista previa de importación
            </Button>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader><CardTitle>¿Cómo exportar desde MyInvestor?</CardTitle></CardHeader>
            <div className="space-y-2 text-sm text-text-2">
              {[
                'Accede a MyInvestor → Mi cartera → Mis fondos',
                'Selecciona el fondo que quieres exportar',
                'Haz clic en "Exportar movimientos" → CSV o Excel',
                'Repite para cada fondo y súbelos aquí',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-primary/20 text-primary rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-text-1">
                  Se han detectado <span className="text-primary">{previewTotal} operaciones</span>
                </p>
                <p className="text-xs text-text-2 mt-0.5">Mostrando las primeras {preview.length}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={reset}>Cancelar</Button>
                <Button size="sm" onClick={handleImport} loading={loading}>
                  Importar todas
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {preview.map((tx, i) => {
                const typeInfo = TX_TYPE_LABELS[tx.type]
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl text-sm">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0"
                      style={{ background: `${typeInfo.color}22`, color: typeInfo.color }}
                    >
                      {typeInfo.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-1 truncate">{tx.fundName}</p>
                      {tx.isin && <p className="text-xs text-text-3 font-mono">{tx.isin}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono font-semibold text-text-1">{formatCurrency(tx.amount)}</p>
                      <p className="text-xs text-text-2">
                        {new Date(tx.date).toLocaleDateString('es-ES')} · {tx.shares?.toFixed(4)} part.
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <Card>
            <div className="text-center py-4">
              {result.imported > 0 ? (
                <CheckCircle2 className="w-14 h-14 text-gain mx-auto mb-3" />
              ) : (
                <AlertCircle className="w-14 h-14 text-warning mx-auto mb-3" />
              )}
              <h2 className="text-xl font-bold text-text-1 mb-1">
                {result.imported > 0 ? '¡Importación completada!' : 'Sin operaciones nuevas'}
              </h2>
              <p className="text-text-2 text-sm">{result.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gain/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gain">{result.imported}</p>
                <p className="text-xs text-text-2 mt-1">Importadas</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-text-2">{result.skipped}</p>
                <p className="text-xs text-text-2 mt-1">Omitidas (duplicadas)</p>
              </div>
            </div>

            {result.fundsSummary.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">Fondos importados</p>
                <div className="space-y-1.5">
                  {result.fundsSummary.map((f, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-1 truncate">{f.fundName}</span>
                      <span className="text-text-2 font-mono ml-2">{f.count} ops.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mt-4 bg-warning/10 rounded-xl p-3">
                <p className="text-xs font-semibold text-warning mb-2">⚠️ Advertencias</p>
                <ul className="space-y-1">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs text-text-2">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button className="w-full mt-4" variant="secondary" onClick={reset}>
              Importar otro archivo
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
