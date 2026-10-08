import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import './Login.css'

function Logo() {
  return (
    <svg className="login-logo" viewBox="0 0 164 96" aria-label="QuickDrive">
      <circle cx="46" cy="48" r="34" fill="none" stroke="currentColor" strokeWidth="20" />
      <path d="M50 56h20l24 40H74Z" />
      <path fillRule="evenodd" d="M100 4h18a44 44 0 0 1 0 88h-18Zm18 20v48a24 24 0 0 0 0-48Z" />
    </svg>
  )
}

function Waves() {
  return (
    <svg className="login-waves" viewBox="0 0 1920 440" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="#05a2ee"
        d="M0 60C120 40 200 0 330 10S560 40 680 10 900 -10 1040 20 1260 0 1380 0 1560 50 1660 60 1820 30 1920 30V440H0Z"
      />
      <path
        fill="#1ab0f5"
        d="M0 110C140 60 260 20 400 40S620 110 760 90 980 40 1120 60 1340 120 1480 90 1720 30 1920 50V440H0Z"
      />
      <path
        fill="#3dbdf8"
        d="M0 180C160 120 300 100 440 140S700 220 860 180 1100 110 1260 140 1520 220 1680 180 1840 120 1920 140V440H0Z"
      />
      <path
        fill="#52c5fa"
        d="M0 240C180 180 340 160 520 200S780 280 960 240 1240 180 1420 210 1720 280 1920 240V440H0Z"
      />
      <path
        fill="#66ccfb"
        d="M0 320C200 290 360 230 520 230S800 300 1000 290 1300 230 1500 250 1800 320 1920 300V440H0Z"
      />
    </svg>
  )
}

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
    <div className="login-page">
      <Waves />
      <div className="login-wrap">
        <Logo />
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
              <button type="button" className="login-link">
                Esqueceu?
              </button>
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

          <p className="login-footer">
            Não Tem Acesso A Conta?
            <button type="button" className="login-link">
              Cadastre-Se
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
