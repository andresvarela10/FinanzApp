import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { Button, Input } from '@/components/ui/index'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = tab === 'login'
        ? await authApi.login(form.email, form.password)
        : await authApi.register(form.name, form.email, form.password)
      login(res.user, res.token)
      toast.success(tab === 'login' ? '¡Bienvenido!' : '¡Cuenta creada!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gain-gradient rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-bg" />
          </div>
          <span className="text-3xl font-extrabold">
            <span className="text-text-1">Finanz</span>
            <span className="text-primary">App</span>
          </span>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-card overflow-hidden">
          {/* Tabs */}
          <div className="flex">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-2 hover:text-text-1 border-b border-border'
                }`}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {tab === 'register' && (
              <Input
                label="Nombre"
                type="text"
                placeholder="Tu nombre"
                value={form.name}
                onChange={set('name')}
                required
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={set('email')}
              required
            />

            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 pr-10 text-sm text-text-1 placeholder:text-text-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              {tab === 'login' ? 'Entrar' : 'Crear cuenta'}
            </Button>

            {tab === 'login' && (
              <p className="text-center text-xs text-text-3 pt-2">
                Demo: <span className="text-text-2 font-mono">demo@finanzas.app</span> / <span className="text-text-2 font-mono">demo1234</span>
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-text-3 mt-6">
          Tu información financiera está cifrada y es privada.
        </p>
      </div>
    </div>
  )
}
