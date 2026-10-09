import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
    } catch {
      setError('Usuário ou senha inválidos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
        <form className="login-card" onSubmit={handleSubmit}>
          <h1>Logue na sua conta QuickDrive</h1>

          <label className="login-field">
            <span className="login-label">Usuário</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entre com seu usuário"
              autoComplete="username"
              autoFocus
            />
          </label>

          <div className="login-field">
            <div className="login-label-row">
              <label className="login-label" htmlFor="login-password">
                Senha
              </label>
            </div>
            <div className="login-password">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entre com sua senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Logar Agora'}
          </button>
</form>
    </AuthShell>
  )
}
