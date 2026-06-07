import React from 'react'
import { X, Loader2 } from 'lucide-react'

// ─── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  glow?: boolean
}

export function Card({ children, className = '', onClick, glow }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-surface border border-border rounded-xl p-5
        ${glow ? 'shadow-glow' : 'shadow-card'}
        ${onClick ? 'cursor-pointer hover:border-border-2 transition-colors' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-sm font-semibold text-text-2 uppercase tracking-wider ${className}`}>{children}</h3>
}

// ─── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  children, variant = 'primary', size = 'md', loading, icon,
  className = '', disabled, ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-bg hover:bg-primary-dark font-semibold',
    secondary: 'bg-surface-2 text-text-1 hover:bg-surface-3 border border-border',
    ghost: 'text-text-2 hover:text-text-1 hover:bg-surface-2',
    danger: 'bg-loss/10 text-loss hover:bg-loss/20 border border-loss/30',
    outline: 'border border-primary text-primary hover:bg-primary/10',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-surface border border-border rounded-2xl shadow-2xl animate-slide-up`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-1">{title}</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Spinner ───────────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-primary`} />
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-text-3 mb-4 text-5xl">{icon}</div>
      <h3 className="text-lg font-semibold text-text-1 mb-1">{title}</h3>
      {description && <p className="text-sm text-text-2 mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, trend, icon, className = '',
}: {
  label: string
  value: string
  sub?: string
  trend?: number
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-2 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-text-1 font-mono truncate">{value}</p>
          {sub && <p className="text-xs text-text-2 mt-1">{sub}</p>}
        </div>
        {icon && <div className="ml-3 text-text-3">{icon}</div>}
      </div>
      {trend !== undefined && (
        <div className={`mt-3 text-xs font-medium ${trend >= 0 ? 'text-gain' : 'text-loss'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}% vs mes anterior
        </div>
      )}
    </Card>
  )
}

// ─── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }: {
  label?: string
  error?: string
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-text-2 mb-1.5">{label}</label>}
      <input
        className={`
          w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-text-1
          placeholder:text-text-3 transition-colors outline-none
          focus:border-primary focus:ring-1 focus:ring-primary/30
          ${error ? 'border-loss' : 'border-border'}
        `}
        {...props}
      />
      {error && <p className="text-xs text-loss mt-1">{error}</p>}
    </div>
  )
}

// ─── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }: {
  label?: string
  error?: string
  children: React.ReactNode
  className?: string
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-text-2 mb-1.5">{label}</label>}
      <select
        className={`
          w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-text-1
          transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
          ${error ? 'border-loss' : 'border-border'}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-loss mt-1">{error}</p>}
    </div>
  )
}
