import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordFields({ password, confirmation, onPassword, onConfirmation }: {
  password: string
  confirmation: string
  onPassword: (value: string) => void
  onConfirmation: (value: string) => void
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <>
      <div className="login-field">
        <label className="login-label" htmlFor={`${id}-password`}>Nova senha</label>
        <div className="login-password">
          <input id={`${id}-password`} type={visible ? 'text' : 'password'} required minLength={8} maxLength={128}
            autoComplete="new-password" value={password} onChange={e => onPassword(e.target.value)}
            aria-describedby={`${id}-hint`} />
          <button type="button" className="login-eye" onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>
            {visible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <p id={`${id}-hint`} className="auth-hint">Use pelo menos 8 caracteres.</p>
      </div>
      <label className="login-field">
        <span className="login-label">Confirmar nova senha</span>
        <input type={visible ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password"
          value={confirmation} onChange={e => onConfirmation(e.target.value)} />
      </label>
    </>
  )
}
