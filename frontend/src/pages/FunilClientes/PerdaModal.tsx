import { useId, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import type { NegociacaoApi } from '../../types'
import { motivosPerda } from './funil'

type Props = {
  negociacao: NegociacaoApi
  onClose: () => void
  /** Recebe o motivo escolhido; quem chama faz o POST /mover. Deve lançar erro com mensagem se falhar. */
  onConfirm: (motivo: string) => Promise<void>
}

/** Pergunta o motivo antes de mover a negociação para "Perdido". */
export function PerdaModal({ negociacao, onClose, onConfirm }: Props) {
  const formId = useId()
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || !motivo) return
    setSaving(true)
    setError('')
    try {
      await onConfirm(motivo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Marcar como perdida"
      size="sm"
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
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving || !motivo}>
            {saving ? 'Salvando…' : 'Marcar como perdida'}
          </button>
        </>
      }
    >
      <form id={formId} className="funil-form" onSubmit={submit}>
        <fieldset disabled={saving}>
          <p>
            Por que a negociação com <strong>{negociacao.nome}</strong> não deu certo? Isso ajuda a entender onde a loja
            perde vendas.
          </p>
          <div className="funil-form-motivos" role="radiogroup" aria-label="Motivo da perda">
            {motivosPerda.map((m) => (
              <label key={m.value}>
                <input
                  type="radio"
                  name={`${formId}-motivo`}
                  value={m.value}
                  checked={motivo === m.value}
                  onChange={() => setMotivo(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
          <p>Ela sai das colunas abertas, mas não é apagada: dá para reabrir depois.</p>
        </fieldset>
      </form>
    </Modal>
  )
}
