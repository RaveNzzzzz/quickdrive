import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { PasswordFields } from './PasswordFields'
import './AuthForms.css'

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export default function Signup() {
  const [step, setStep] = useState(0)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})

  function field(key: string, label: string, type = 'text', required = true, maxLength?: number) {
    return <label className="login-field" key={key}>
      <span className="login-label">{label}{!required && ' (opcional)'}</span>
      <input name={key} type={type} required={required} maxLength={maxLength} value={values[key] ?? ''}
        onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
        {...(key === 'cpf' ? { inputMode: 'numeric' as const, pattern: '[0-9]{11}', title: 'Informe 11 dígitos, sem pontuação.' } : {})}
        {...(key === 'cep' ? { inputMode: 'numeric' as const, pattern: '[0-9]{8}', title: 'Informe 8 dígitos, sem pontuação.' } : {})}
        {...(type === 'date' ? { max: new Date().toLocaleDateString('en-CA') } : {})} />
    </label>
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (step < 2) { setStep(s => s + 1); return }
    if (password !== confirmation) { setMessage('As senhas precisam ser iguais.'); return }
    if ((values.username ?? '').trim().length < 3) { setMessage('O usuário deve ter pelo menos 3 caracteres.'); return }
    setMessage('O cadastro ainda não está disponível. Nenhuma conta foi criada.')
  }

  return <AuthShell>
    <form className="login-card auth-card auth-signup" onSubmit={submit}>
      <h1>Criar sua conta</h1>
      <p className="auth-description">Cadastre seus dados para acessar o QuickDrive.</p>
      <p className="auth-pending">Cadastro em preparação. Os dados deste formulário ainda não serão enviados ou salvos.</p>
      <p className="auth-progress" role="status">Etapa {step + 1} de 3 · {['Dados pessoais', 'Endereço', 'Acesso'][step]}</p>
      <div className="auth-grid">
        {step === 0 && <>
          {field('first_name', 'Nome', 'text', true, 150)}
          {field('last_name', 'Sobrenome', 'text', true, 150)}
          {field('email', 'E-mail', 'email', true, 254)}
          {field('phone', 'Telefone com DDD', 'tel', true, 20)}
          {field('cpf', 'CPF (somente números)', 'text', true, 11)}
          {field('birth_date', 'Data de nascimento', 'date', false)}
        </>}
        {step === 1 && <>
          {field('cep', 'CEP (somente números)', 'text', true, 8)}
          {field('street', 'Rua', 'text', true, 200)}
          {field('number', 'Número', 'text', true, 20)}
          {field('complement', 'Complemento', 'text', false, 200)}
          {field('neighborhood', 'Bairro', 'text', true, 100)}
          {field('city', 'Cidade', 'text', true, 100)}
          <label className="login-field"><span className="login-label">Estado</span>
            <select required value={values.state ?? ''} onChange={e => setValues(prev => ({ ...prev, state: e.target.value }))}>
              <option value="">Selecione</option>{states.map(state => <option key={state}>{state}</option>)}
            </select>
          </label>
        </>}
        {step === 2 && <>
          {field('username', 'Nome de usuário', 'text', true, 150)}
          <PasswordFields password={password} confirmation={confirmation} onPassword={setPassword} onConfirmation={setConfirmation} />
        </>}
      </div>
      {message && <p className="login-error" role="alert">{message}</p>}
      <div className="auth-actions">
        {step > 0 && <button type="button" className="auth-secondary" onClick={() => { setStep(s => s - 1); setMessage('') }}>Voltar</button>}
        <button type="submit" className="login-submit">{step === 2 ? 'Criar conta' : 'Continuar'}</button>
      </div>
      {step === 1 && <button type="button" className="login-link" onClick={() => {
        setValues(prev => Object.fromEntries(Object.entries(prev).filter(([key]) =>
          !['cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'].includes(key))))
        setStep(2)
        setMessage('')
      }}>Preencher endereço depois</button>}
      <Link className="login-link auth-back" to="/login">Já tenho conta · Entrar</Link>
    </form>
  </AuthShell>
}
