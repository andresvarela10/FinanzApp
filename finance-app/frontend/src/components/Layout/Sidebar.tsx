import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Target,
  PieChart, Calculator, Upload, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/investments', icon: TrendingUp, label: 'Inversiones' },
  { to: '/net-worth', icon: PieChart, label: 'Patrimonio' },
  { to: '/goals', icon: Target, label: 'Objetivos' },
  { to: '/simulator', icon: Calculator, label: 'Simulador' },
  { to: '/import', icon: Upload, label: 'Importar' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

  return (
    <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gain-gradient rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-bg font-bold" />
          </div>
          <div>
            <span className="text-lg font-extrabold text-text-1 tracking-tight">Finanz</span>
            <span className="text-lg font-extrabold text-primary tracking-tight">App</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition-all duration-150 group
              ${isActive
                ? 'bg-primary/10 text-primary shadow-glow-sm'
                : 'text-text-2 hover:text-text-1 hover:bg-surface-2'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-primary/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors">
          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-1 truncate">{user?.name}</p>
            <p className="text-xs text-text-3 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="text-text-3 hover:text-loss transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
