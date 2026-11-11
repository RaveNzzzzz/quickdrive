import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { CustoPreparacaoApi } from '../../types'
import { valorDigitado, valorParaNumero } from './veiculoLimites'
import './Veiculo.css'

type Props = {
  veiculoId: number
  onClose: () => void
  onSaved: (custo: CustoPreparacaoApi) => void
}

function hojeIso(): string {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

export function CustoPreparacaoModal({ veiculoId, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hojeIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const descricao = nome.trim().replace(/\s+/g, ' ')
    if (!descricao) {
      setError('Informe a descrição do custo.')
      return
    }
    if (!data) {
      setError('Informe a data.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const salvo = await api<CustoPreparacaoApi>(`/veiculos/${veiculoId}/custos-preparacao`, {
        method: 'POST',
        body: JSON.stringify({ nome: descricao, custo: valorParaNumero(valor), data }),
      })
      onSaved(salvo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o custo.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Adicionar custo de preparação"
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
            {saving ? 'Salvando…' : 'Adicionar'}
          </button>
        </>
      }
    >
      <form id={formId} className="vform" onSubmit={handleSubmit}>
        <div className="vform-field">
          <label htmlFor={`${uid}-nome`}>Descrição</label>
          <input
            id={`${uid}-nome`}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={100}
            placeholder="Ex.: Polimento e higienização"
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        <div className="vform-grid">
          <div className="vform-field">
            <label htmlFor={`${uid}-valor`}>Valor (R$)</label>
            <input
              id={`${uid}-valor`}
              value={valor}
              onChange={(event) => setValor(valorDigitado(event.target.value))}
              inputMode="numeric"
              placeholder="0,00"
              autoComplete="off"
              required
            />
          </div>
          <div className="vform-field">
            <label htmlFor={`${uid}-data`}>Data</label>
            <input
              id={`${uid}-data`}
              type="date"
              value={data}
              max={hojeIso()}
              onChange={(event) => setData(event.target.value)}
              required
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
