import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PasswordFields } from './PasswordFields'
import { api } from '../api/client'
import './AuthForms.css'

export default function PasswordRecovery({ fromProfile = false }: { fromProfile?: boolean }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setMessage('')
    if (password !== confirmation) { setMessage('As senhas precisam ser iguais.'); return }
    setSaving(true)
    try {
      await api<void>('/contas/senha', { method: 'POST', body: JSON.stringify({ nova_senha: password, confirmacao: confirmation }) })
      setPassword(''); setConfirmation(''); setSuccess(true)
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível alterar a senha.') }
    finally { setSaving(false) }
  }

  return <div className="auth-internal">
    <form className="login-card auth-card" onSubmit={submit}>
      <h1>Trocar senha</h1>
      {success ? <p role="status">Senha alterada com sucesso. Use a nova senha no próximo login.</p> : <>
        <p className="auth-description">Defina sua nova senha e confirme abaixo.</p>
        <fieldset disabled={saving} className="password-form-fields">
          <PasswordFields password={password} confirmation={confirmation} onPassword={setPassword} onConfirmation={setConfirmation} />
        </fieldset>
        {message && <p className="login-error" role="alert">{message}</p>}
        <button type="submit" className="login-submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova senha'}</button>
      </>}
      <Link className="login-link auth-back" to={fromProfile ? '/perfil' : '/'}>Voltar ao perfil</Link>
    </form>
  </div>
}
