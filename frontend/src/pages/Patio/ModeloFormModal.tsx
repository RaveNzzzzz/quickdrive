import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { SearchableSelect } from '../../components/SearchableSelect'
import type { ModeloApi, OpcaoApi } from '../../types'
import { OPCAO_NOME_MAX } from './opcoes'
import './Veiculo.css'

type Props = {
  marcas: OpcaoApi[]
  /** Marca já escolhida no formulário do veículo (vem preenchida ao criar). */
  marcaInicialId?: string
  /** Preenchido = editar esse modelo; vazio = criar um novo. */
  modelo?: ModeloApi
  onClose: () => void
  onSaved: (modelo: ModeloApi) => void
}

export function ModeloFormModal({ marcas, marcaInicialId = '', modelo, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const [nome, setNome] = useState(modelo?.nome ?? '')
  const [marcaId, setMarcaId] = useState(modelo ? String(modelo.marca_id) : marcaInicialId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Abre por cima do formulário do veículo: o submit não pode "subir" e salvar o veículo junto.
    event.stopPropagation()
    if (saving) return

    const limpo = nome.trim().replace(/\s+/g, ' ')
    if (!limpo) return setError('Informe o nome do modelo.')
    if (!marcaId) return setError('Escolha a marca do modelo.')

    setError('')
    setSaving(true)
    try {
      const saved = await api<ModeloApi>(modelo ? `/veiculos/opcoes/modelos/${modelo.id}` : '/veiculos/opcoes/modelos', {
        method: modelo ? 'PATCH' : 'POST',
        body: JSON.stringify({ nome: limpo, marca_id: Number(marcaId) }),
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o modelo.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={modelo ? 'Editar modelo' : 'Novo modelo'}
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
            {saving ? 'Salvando…' : modelo ? 'Salvar' : 'Criar'}
          </button>
        </>
      }
    >
      <form id={formId} className="vform" onSubmit={handleSubmit}>
        <div className="vform-field">
          <label htmlFor={`${uid}-marca`}>Marca</label>
          <SearchableSelect
            id={`${uid}-marca`}
            value={marcaId}
            onChange={setMarcaId}
            options={marcas.map((m) => ({ value: String(m.id), label: m.nome }))}
          />
        </div>
        <div className="vform-field">
          <label htmlFor={`${uid}-nome`}>Nome do modelo</label>
          <input
            id={`${uid}-nome`}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={OPCAO_NOME_MAX}
            placeholder="Ex.: Impreza WRX"
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        {modelo && (
          <p className="vform-hint">A mudança vale para todos os veículos que usam o modelo “{modelo.nome}”.</p>
        )}
      </form>
    </Modal>
  )
}
