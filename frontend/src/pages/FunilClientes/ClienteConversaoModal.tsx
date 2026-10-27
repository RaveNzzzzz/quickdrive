import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { formatarTelefone, soDigitos } from './funil'

// Mesmos valores de UF (backend/people/enums.py).
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export type ClienteCriado = { id: number; pessoa: { nome: string } }

type Props = {
  nome: string
  telefone: string
  onClose: () => void
  onSaved: (cliente: ClienteCriado) => void
}

/** Cadastro completo do cliente, pedido só na hora da venda (antes o interessado tinha só nome e telefone). */
export function ClienteConversaoModal({ nome: nomeInicial, telefone: telefoneInicial, onClose, onSaved }: Props) {
  const formId = useId()
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>('FISICA')
  const [nome, setNome] = useState(nomeInicial)
  const [telefone, setTelefone] = useState(formatarTelefone(telefoneInicial))
  const [email, setEmail] = useState('')
  const [documento, setDocumento] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('SP')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fisica = tipoPessoa === 'FISICA'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    const fone = soDigitos(telefone)
    const doc = soDigitos(documento)
    const cepDigitos = soDigitos(cep)
    if (fone.length !== 10 && fone.length !== 11) return setError('Telefone deve ter DDD + número (10 ou 11 dígitos).')
    if (doc.length !== (fisica ? 11 : 14)) return setError(fisica ? 'O CPF deve ter 11 dígitos.' : 'O CNPJ deve ter 14 dígitos.')
    if (cepDigitos.length !== 8) return setError('O CEP deve ter 8 dígitos.')

    setSaving(true)
    try {
      const cliente = await api<ClienteCriado>('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          pessoa: {
            nome,
            email,
            telefone: fone,
            cpf_cnpj: doc,
            tipo_pessoa: tipoPessoa,
            data_nascimento: nascimento || null,
            endereco: { cep: cepDigitos, rua, numero, complemento, bairro, cidade, uf },
          },
        }),
      })
      onSaved(cliente)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o cliente.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Cadastrar cliente"
      size="lg"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          {error && (
            <p className="funil-error-text" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Cadastrar e continuar'}
          </button>
        </>
      }
    >
      <form id={formId} className="funil-form" onSubmit={submit}>
        <p className="funil-form-note">
          Passo 1 de 2: para registrar a venda, o interessado precisa virar cliente com cadastro completo.
        </p>
        <fieldset disabled={saving}>
          <div className="funil-form-choice" role="radiogroup" aria-label="Tipo de pessoa">
            <label>
              <input type="radio" name={`${formId}-tipo`} checked={fisica} onChange={() => setTipoPessoa('FISICA')} />
              Pessoa física
            </label>
            <label>
              <input type="radio" name={`${formId}-tipo`} checked={!fisica} onChange={() => setTipoPessoa('JURIDICA')} />
              Pessoa jurídica
            </label>
          </div>

          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-nome`}>{fisica ? 'Nome completo' : 'Razão social'}</label>
              <input id={`${formId}-nome`} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} required />
            </div>
            <div>
              <label htmlFor={`${formId}-doc`}>{fisica ? 'CPF' : 'CNPJ'}</label>
              <input
                id={`${formId}-doc`}
                inputMode="numeric"
                placeholder={fisica ? '000.000.000-00' : '00.000.000/0000-00'}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-email`}>E-mail</label>
              <input id={`${formId}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor={`${formId}-telefone`}>Telefone</label>
              <input
                id={`${formId}-telefone`}
                type="tel"
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>
          </div>

          <label htmlFor={`${formId}-nascimento`}>
            {fisica ? 'Data de nascimento (opcional)' : 'Data de abertura (opcional)'}
          </label>
          <input
            id={`${formId}-nascimento`}
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
          />

          <h3 className="funil-form-section">Endereço</h3>
          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-cep`}>CEP</label>
              <input
                id={`${formId}-cep`}
                inputMode="numeric"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-uf`}>Estado</label>
              <select id={`${formId}-uf`} value={uf} onChange={(e) => setUf(e.target.value)}>
                {UFS.map((sigla) => (
                  <option key={sigla}>{sigla}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-rua`}>Rua</label>
              <input id={`${formId}-rua`} value={rua} onChange={(e) => setRua(e.target.value)} maxLength={200} required />
            </div>
            <div>
              <label htmlFor={`${formId}-numero`}>Número</label>
              <input id={`${formId}-numero`} value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={20} required />
            </div>
          </div>
          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-bairro`}>Bairro</label>
              <input id={`${formId}-bairro`} value={bairro} onChange={(e) => setBairro(e.target.value)} maxLength={100} required />
            </div>
            <div>
              <label htmlFor={`${formId}-cidade`}>Cidade</label>
              <input id={`${formId}-cidade`} value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={100} required />
            </div>
          </div>
          <label htmlFor={`${formId}-complemento`}>Complemento (opcional)</label>
          <input
            id={`${formId}-complemento`}
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            maxLength={200}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
