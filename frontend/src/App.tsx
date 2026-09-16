import { Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import Home from './pages/Home'
import Estoque from './pages/Estoque'
import Patio from './pages/Patio'
import Vendas from './pages/Vendas'
import Clientes from './pages/Clientes'
import Funil from './pages/Funil'
import Financeiro from './pages/Financeiro'
import Funcionarios from './pages/Funcionarios'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from './api/client'
import { AuthProvider, useAuth } from './auth/AuthContext'
import type { Paginated, Task } from './types'
import './App.css'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/estoque': 'Estoque',
  '/patio': 'Pátio',
  '/vendas': 'Vendas',
  '/clientes': 'Clientes',
  '/funil': 'Funil de Clientes',
  '/financeiro': 'Financeiro',
  '/funcionarios': 'Funcionários',
}

function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
    } catch {
      setError('Usuário ou senha inválidos.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Entrar</h1>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuário" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
      />
      <button type="submit">Entrar</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

function Tasks() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    api<Paginated<Task>>('/tasks').then((data) => setTasks(data.items))
  }, [])

  async function addTask(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const task = await api<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
    setTasks((prev) => [task, ...prev])
    setTitle('')
  }

  return (
    <div>
      <header>
        <span>Olá, {user?.username}</span>
        <button onClick={logout}>Sair</button>
      </header>

      <form onSubmit={addTask}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa" />
        <button type="submit">Adicionar</button>
      </form>

      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  )
}

function Layout() {
  const location = useLocation()
  const title = pageTitles[location.pathname.toLowerCase()] ?? 'QuickDrive'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Estoque" element={<Estoque />} />
            <Route path="/Patio" element={<Patio />} />
            <Route path="/Vendas" element={<Vendas />} />
            <Route path="/Clientes" element={<Clientes />} />
            <Route path="/Funil" element={<Funil />} />
            <Route path="/Financeiro" element={<Financeiro />} />
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