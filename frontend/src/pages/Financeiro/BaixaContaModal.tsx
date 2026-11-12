import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { ContaPagarApi, ContaReceberApi } from '../../types'
import { mascarar } from '../../utils/privacy'
import { toast } from '../../utils/toast'
import { ComprovanteField } from './ComprovanteField'
import {
  comprovantePath,
  contaPath,
  currencyCents,
  fromContaPagar,
  fromContaReceber,
  todayIso,
  type Conta,
} from './financeiroUtils'

type Props = {
  conta: Conta
  oculto: boolean
  onClose: () => void
  /** Chamado com a conta já atualizada (paga/recebida e, se enviado, com o comprovante). */
  onConfirmed: (conta: Conta) => void
}

/** Confirmação de "Marcar como pago/recebido", com o comprovante (opcional). */
export function BaixaContaModal({ conta, oculto, onClose, onConfirmed }: Props) {
  const formId = useId()
  const receber = conta.kind === 'receber'
  const [data, setData] = useState(todayIso())
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    setSaving(true)
    try {
      const body = JSON.stringify(
        receber ? { status: 'recebido', data_recebimento: data } : { status: 'pago', data_pagamento: data },
      )
      let salva = await api<ContaReceberApi | ContaPagarApi>(contaPath(conta), { method: 'PATCH', body })

      // O comprovante vai separado (arquivo não cabe em JSON). Se falhar, a baixa já foi feita.
      if (proofFile) {
        try {
          const form = new FormData()
          form.append('arquivo', proofFile)
          salva = await api<ContaReceberApi | ContaPagarApi>(comprovantePath(conta), { method: 'POST', body: form })
        } catch (err) {
          toast.error(`A conta foi baixada, mas o comprovante não foi enviado: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
        }
      }
      onConfirmed(receber ? fromContaReceber(salva as ContaReceberApi) : fromContaPagar(salva as ContaPagarApi))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a conta.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={receber ? 'Marcar como recebido' : 'Marcar como pago'}
      size="sm"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="fx-error-text" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className={`btn ${receber ? 'btn-receive' : 'btn-pay'}`} disabled={saving}>
            {saving ? 'Salvando…' : receber ? 'Confirmar recebimento' : 'Confirmar pagamento'}
          </button>
        </>
      }
    >
      <form id={formId} className="fx-form" onSubmit={submit}>
        <fieldset disabled={saving}>
          <p className="fx-baixa-resumo">
            <strong>{conta.description}</strong>
            <span className={`fx-amount-${conta.kind}`}>{mascarar(currencyCents.format(conta.amount), oculto)}</span>
          </p>

          <label htmlFor={`${formId}-data`}>{receber ? 'Data do recebimento' : 'Data do pagamento'}</label>
          <input id={`${formId}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} required />

          <ComprovanteField file={proofFile} onFile={setProofFile} removed={false} onRemovedChange={() => {}} />
        </fieldset>
      </form>
    </Modal>
  )
}
