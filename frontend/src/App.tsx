import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import Home from './pages/Home/Home'
import Estoque from './pages/Estoque/Estoque'
import Patio from './pages/Patio/Patio'
import VeiculoFicha from './pages/Patio/VeiculoFicha'
import Vendas from './pages/Vendas/Vendas'
import Clientes from './pages/Clientes/Clientes'
import FunilClientes from './pages/FunilClientes/FunilClientes'
import Financeiro from './pages/Financeiro/Financeiro'
import FinanceiroFigma from './pages/FinanceiroFigma/FinanceiroFigma'
import Funcionarios from './pages/Funcionarios/Funcionarios'
import Cargos from './pages/Funcionarios/Cargos'
import Perfil from './pages/Perfil/Perfil'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './auth/Login'
import PasswordRecovery from './auth/PasswordRecovery'
import { ChartSkeleton, KpiSkeleton, Skeleton } from './components/Skeleton'
import './App.css'

function Layout() {
  const { user } = useAuth()
  const restricted = (element: React.ReactNode) => user?.pode_gerenciar ? element : <Navigate to="/" replace />
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Estoque" element={<Estoque />} />
            <Route path="/Patio" element={<Patio />} />
            <Route path="/patio/:id" element={<VeiculoFicha />} />
            <Route path="/Vendas" element={<Vendas />} />
            <Route path="/Clientes" element={<Clientes />} />
            <Route path="/Funil" element={<FunilClientes />} />
            <Route path="/Financeiro" element={restricted(<Financeiro />)} />
            <Route path="/FinanceiroFigma" element={restricted(<FinanceiroFigma />)} />
            <Route path="/Funcionarios" element={restricted(<Funcionarios />)} />
            <Route path="/funcionarios/cargos" element={restricted(<Cargos key="cargos" />)} />
            <Route path="/funcionarios/setores" element={restricted(<Cargos key="setores" setores />)} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/perfil/senha" element={<PasswordRecovery fromProfile />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Root() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="app-layout" role="status" aria-busy="true" aria-label="Carregando">
        <aside className="skeleton-sidebar">
          <Skeleton width={120} height={28} radius={8} />
          <div className="skeleton-stack" style={{ marginTop: 28 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={34} radius={8} />
            ))}
          </div>
        </aside>
        <div className="app-main">
          <div className="skeleton-topbar">
            <div className="skeleton-stack" style={{ gap: 8, flex: 1 }}>
              <Skeleton width={180} height={12} />
              <Skeleton width={260} height={26} />
            </div>
            <Skeleton width={38} height={38} radius={999} />
            <Skeleton width={38} height={38} radius={999} />
            <Skeleton width={150} height={38} radius={999} />
          </div>
          <main className="app-content">
            <div className="kpi-row kpi-row-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="card kpi-card">
                  <Skeleton width="50%" height={14} />
                  <KpiSkeleton width="70%" />
                  <Skeleton width="60%" height={12} />
                </div>
              ))}
            </div>
            <div className="card" style={{ marginTop: 20 }}>
              <ChartSkeleton />
            </div>
          </main>
        </div>
      </div>
    )
  return user ? <Layout /> : (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
