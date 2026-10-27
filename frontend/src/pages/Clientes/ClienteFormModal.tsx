import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { ClienteApi } from '../../types'
import { formatarDocumento, formatarTelefone, soDigitos } from '../../utils/format'
import './ClienteFormModal.css'

// Mesmos valores de UF (backend/people/enums.py).
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

type Props = {
  /** Cliente a editar. Sem ele, cadastra um novo. */
  cliente?: ClienteApi
  /** Nome e telefone já conhecidos (ex.: o interessado do funil virando cliente). */
  inicial?: { nome: string; telefone: string }
  /** Texto acima do formulário (ex.: "Passo 1 de 2"). */
  aviso?: string
  textoSalvar?: string
  onClose: () => void
  onSaved: (cliente: ClienteApi) => void
}

/** Cadastro completo do cliente (pessoa + endereço). Usado na tela de Clientes e no "Registrar venda" do funil. */
export function ClienteFormModal({ cliente, inicial, aviso, textoSalvar, onClose, onSaved }: Props) {
  const formId = useId()
  const pessoa = cliente?.pessoa
  const endereco = pessoa?.endereco
  const [tipoPessoa, setTipoPessoa] = useState<'FISICA' | 'JURIDICA'>(pessoa?.tipo_pessoa ?? 'FISICA')
  const [nome, setNome] = useState(pessoa?.nome ?? inicial?.nome ?? '')
  const [telefone, setTelefone] = useState(formatarTelefone(pessoa?.telefone ?? inicial?.telefone ?? ''))
  const [email, setEmail] = useState(pessoa?.email ?? '')
  const [documento, setDocumento] = useState(pessoa ? formatarDocumento(pessoa.cpf_cnpj) : '')
  const [nascimento, setNascimento] = useState(pessoa?.data_nascimento ?? '')
  const [cep, setCep] = useState(endereco?.cep ?? '')
  const [rua, setRua] = useState(endereco?.rua ?? '')
  const [numero, setNumero] = useState(endereco?.numero ?? '')
  const [complemento, setComplemento] = useState(endereco?.complemento ?? '')
  const [bairro, setBairro] = useState(endereco?.bairro ?? '')
  const [cidade, setCidade] = useState(endereco?.cidade ?? '')
  const [uf, setUf] = useState(endereco?.uf ?? 'SP')
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

    const dadosPessoa = {
      nome,
      email,
      telefone: fone,
      cpf_cnpj: doc,
      data_nascimento: nascimento || null,
      endereco: { cep: cepDigitos, rua, numero, complemento, bairro, cidade, uf },
    }
    setSaving(true)
    try {
      const salvo = await api<ClienteApi>(cliente ? `/clientes/${cliente.id}` : '/clientes', {
        method: cliente ? 'PATCH' : 'POST',
        // O tipo de pessoa só é escolhido no cadastro (a edição não troca física <-> jurídica).
        body: JSON.stringify({ pessoa: cliente ? dadosPessoa : { ...dadosPessoa, tipo_pessoa: tipoPessoa } }),
      })
      onSaved(salvo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o cliente.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={cliente ? 'Editar cliente' : 'Cadastrar cliente'}
      size="lg"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          {error && (
            <p className="clform-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : (textoSalvar ?? 'Salvar')}
          </button>
        </>
      }
    >
      <form id={formId} className="clform" onSubmit={submit}>
        {aviso && <p className="clform-note">{aviso}</p>}
        <fieldset disabled={saving}>
          {cliente ? (
            <p>
              Tipo: <strong>{fisica ? 'Pessoa física' : 'Pessoa jurídica'}</strong>
            </p>
          ) : (
            <div className="clform-choice" role="radiogroup" aria-label="Tipo de pessoa">
              <label>
                <input type="radio" name={`${formId}-tipo`} checked={fisica} onChange={() => setTipoPessoa('FISICA')} />
                Pessoa física
              </label>
              <label>
                <input
                  type="radio"
                  name={`${formId}-tipo`}
                  checked={!fisica}
                  onChange={() => setTipoPessoa('JURIDICA')}
                />
                Pessoa jurídica
              </label>
            </div>
          )}

          <div className="clform-row">
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

          <div className="clform-row">
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
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>
          </div>

          <label htmlFor={`${formId}-nascimento`}>
            {fisica ? 'Data de nascimento (opcional)' : 'Data de abertura (opcional)'}
          </label>
          <input id={`${formId}-nascimento`} type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />

          <h3 className="clform-section">Endereço</h3>
          <div className="clform-row">
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
          <div className="clform-row">
            <div>
              <label htmlFor={`${formId}-rua`}>Rua</label>
              <input id={`${formId}-rua`} value={rua} onChange={(e) => setRua(e.target.value)} maxLength={200} required />
            </div>
            <div>
              <label htmlFor={`${formId}-numero`}>Número</label>
              <input id={`${formId}-numero`} value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={20} required />
            </div>
          </div>
          <div className="clform-row">
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
