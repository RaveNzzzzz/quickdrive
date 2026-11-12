import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { VagaApi } from '../../types'
import './Veiculo.css'

type Props = {
  /** Preenchido = editar essa vaga; vazio = criar uma nova. */
  vaga?: VagaApi
  onClose: () => void
  onSaved: (vaga: VagaApi) => void
}

// Sugestões de posição (o campo aceita qualquer texto).
const POSICOES = ['Frente da loja', 'Destaque', 'Depósito', 'Fundos', 'Lateral', 'Oficina']

export function VagaFormModal({ vaga, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const [nome, setNome] = useState(vaga?.nome ?? '')
  const [posicao, setPosicao] = useState(vaga?.posicao ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (saving) return

    const limpo = nome.trim().replace(/\s+/g, ' ')
    if (!limpo) return setError('Informe o nome da vaga.')

    setError('')
    setSaving(true)
    try {
      const saved = await api<VagaApi>(vaga ? `/veiculos/opcoes/vagas/${vaga.id}` : '/veiculos/opcoes/vagas', {
        method: vaga ? 'PATCH' : 'POST',
        body: JSON.stringify({ nome: limpo, posicao: posicao.trim().replace(/\s+/g, ' ') }),
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a vaga.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={vaga ? 'Editar vaga' : 'Nova vaga'}
      size="sm"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="vform-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : vaga ? 'Salvar' : 'Criar'}
          </button>
        </>
      }
    >
      <form id={formId} className="vform" onSubmit={handleSubmit}>
        <div className="vform-field">
          <label htmlFor={`${uid}-nome`}>Vaga</label>
          <input
            id={`${uid}-nome`}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={10}
            placeholder="Ex.: A-01"
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        <div className="vform-field">
          <label htmlFor={`${uid}-posicao`}>Posição na loja</label>
          <input
            id={`${uid}-posicao`}
            value={posicao}
            onChange={(event) => setPosicao(event.target.value)}
            maxLength={60}
            list={`${uid}-posicoes`}
            placeholder="Ex.: Frente da loja, Destaque, Depósito"
            autoComplete="off"
          />
          <datalist id={`${uid}-posicoes`}>
            {POSICOES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        {vaga && <p className="vform-hint">A mudança vale para o veículo que está na vaga “{vaga.nome}”.</p>}
      </form>
    </Modal>
  )
}
