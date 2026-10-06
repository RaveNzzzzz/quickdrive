import { Routes, Route } from 'react-router-dom'
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
import { AuthProvider, useAuth } from './auth/AuthContext'
import Login from './auth/Login'
import './App.css'

function Layout() {
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
            <Route path="/Financeiro" element={<Financeiro />} />
            <Route path="/FinanceiroFigma" element={<FinanceiroFigma />} />
            <Route path="/Funcionarios" element={<Funcionarios />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Root() {
  const { user, loading } = useAuth()
  if (loading) return <p>Carregando…</p>
  return user ? <Layout /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}