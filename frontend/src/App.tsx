import { useEffect, useState, type FormEvent } from 'react'
import { api } from './api/client'
import { AuthProvider, useAuth } from './auth/AuthContext'
import type { Paginated, Task } from './types'

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

function Root() {
  const { user, loading } = useAuth()
  if (loading) return <p>Carregando…</p>
  return user ? <Tasks /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
