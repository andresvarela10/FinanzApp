import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Investments from '@/pages/Investments'
import NetWorth from '@/pages/NetWorth'
import Goals from '@/pages/Goals'
import Simulator from '@/pages/Simulator'
import Import from '@/pages/Import'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e2235',
            color: '#e8ecf4',
            border: '1px solid #252942',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Outfit, system-ui, sans-serif',
          },
          success: { iconTheme: { primary: '#00c896', secondary: '#1e2235' } },
          error:   { iconTheme: { primary: '#ff4d6a', secondary: '#1e2235' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/"            element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/investments"  element={<Investments />} />
          <Route path="/net-worth"    element={<NetWorth />} />
          <Route path="/goals"        element={<Goals />} />
          <Route path="/simulator"    element={<Simulator />} />
          <Route path="/import"       element={<Import />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
