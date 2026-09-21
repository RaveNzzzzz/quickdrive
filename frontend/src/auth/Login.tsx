import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'

export default function Login() {
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
