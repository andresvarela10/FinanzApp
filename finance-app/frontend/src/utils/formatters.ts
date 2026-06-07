export function formatCurrency(amount: number, currency = 'EUR', compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    const val = amount / 1000
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val) + 'K'
  }
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatShares(shares: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(shares)
}

export function formatDate(dateStr: string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateStr)
  const formats = {
    short: { day: '2-digit', month: '2-digit' } as const,
    medium: { day: '2-digit', month: 'short', year: 'numeric' } as const,
    long: { day: '2-digit', month: 'long', year: 'numeric' } as const,
  }
  return new Intl.DateTimeFormat('es-ES', formats[format]).format(date)
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`
  return formatDate(dateStr, 'medium')
}

export function isPositive(value: number): boolean {
  return value > 0
}

export function gainColor(value: number): string {
  if (value > 0) return 'text-gain'
  if (value < 0) return 'text-loss'
  return 'text-text-2'
}

export function gainBg(value: number): string {
  if (value > 0) return 'bg-gain/10 text-gain'
  if (value < 0) return 'bg-loss/10 text-loss'
  return 'bg-text-3/10 text-text-2'
}
