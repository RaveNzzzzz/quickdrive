import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { OpcaoApi } from '../../types'
import { OPCAO_NOME_MAX, OPCAO_ROTULOS, type TipoOpcao } from './opcoes'
import './Veiculo.css'

type Props = {
  tipo: TipoOpcao
  /** Preenchido = editar essa opção; vazio = criar uma nova. */
  opcao?: OpcaoApi
  onClose: () => void
  onSaved: (opcao: OpcaoApi) => void
}

export function OpcaoFormModal({ tipo, opcao, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const { singular, artigo } = OPCAO_ROTULOS[tipo]
  const novo = artigo === 'a' ? 'Nova' : 'Novo'

  const [nome, setNome] = useState(opcao?.nome ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Abre por cima do formulário do veículo: o submit não pode "subir" e salvar o veículo junto.
    event.stopPropagation()
    if (saving) return

    const limpo = nome.trim().replace(/\s+/g, ' ')
    if (!limpo) {
      setError('Informe o nome.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const saved = await api<OpcaoApi>(
        opcao ? `/veiculos/opcoes/${tipo}/${opcao.id}` : `/veiculos/opcoes/${tipo}`,
        { method: opcao ? 'PATCH' : 'POST', body: JSON.stringify({ nome: limpo }) },
      )
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Não foi possível salvar ${artigo} ${singular}.`)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={opcao ? `Editar ${singular}` : `${novo} ${singular}`}
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
            {saving ? 'Salvando…' : opcao ? 'Salvar' : 'Criar'}
          </button>
        </>
      }
    >
      <form id={formId} className="vform" onSubmit={handleSubmit}>
        <div className="vform-field">
          <label htmlFor={`${uid}-nome`}>Nome</label>
          <input
            id={`${uid}-nome`}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={OPCAO_NOME_MAX}
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        {opcao && (
          <p className="vform-hint">
            A mudança vale para todos os veículos que usam {artigo} {singular} “{opcao.nome}”.
          </p>
        )}
      </form>
    </Modal>
  )
}
