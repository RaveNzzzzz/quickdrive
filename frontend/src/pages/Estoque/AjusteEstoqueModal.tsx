import { useId, useMemo, useState, type FormEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { LoteApi } from '../../types'
import { currencyCents } from '../../utils/format'
import { numeroParaValor, valorDigitado, valorParaNumero } from '../Patio/veiculoLimites'
import type { Product } from './estoqueData'
import { ResponsavelSelect, useResponsavel } from './ResponsavelSelect'

type Props = {
  product: Product
  onClose: () => void
  /** `lotes` são os lotes criados (entrada) ou alterados (saída). */
  onSaved: (modo: 'entrada' | 'saida', lotes: LoteApi[]) => void
}

const QUANTIDADE_MAX = 1_000_000

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100
}

export function AjusteEstoqueModal({ product, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const [modo, setModo] = useState<'entrada' | 'saida'>('entrada')
  const [quantidade, setQuantidade] = useState('1')
  // null = usa o cálculo automático (valor unitário x quantidade); texto = o usuário alterou o valor.
  const [totalEditado, setTotalEditado] = useState<string | null>(null)
  const [numeroLote, setNumeroLote] = useState('')
  const [validade, setValidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const responsavel = useResponsavel()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const unitario = product.valor_unitario == null ? 0 : Number(product.valor_unitario)
  const qtd = Number(quantidade) || 0
  const calculado = useMemo(() => arredondar(unitario * qtd), [unitario, qtd])
  const totalMostrado = totalEditado ?? (calculado > 0 ? numeroParaValor(calculado) : '')
  const totalNumero = valorParaNumero(totalMostrado)
  const alterado = totalEditado !== null && totalNumero !== calculado
  const restante = product.quantity - qtd

  function ajustar(delta: number) {
    const proxima = Math.min(QUANTIDADE_MAX, Math.max(1, qtd + delta))
    setQuantidade(String(proxima))
    setTotalEditado(null) // mudou a quantidade: volta ao cálculo automático
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    if (!Number.isSafeInteger(qtd) || qtd < 1) return setError('Informe uma quantidade inteira maior que zero.')
    if (modo === 'saida' && qtd > product.quantity) {
      return setError(`Só há ${product.quantity} em estoque. Informe uma quantidade menor ou igual.`)
    }
    if (modo === 'entrada' && responsavel.precisaEscolher && !responsavel.value) {
      return setError('Escolha o funcionário responsável pela compra.')
    }
    if (modo === 'entrada' && totalNumero <= 0) {
      return setError('Informe o valor total da entrada (o produto não tem valor unitário cadastrado).')
    }

    setSaving(true)
    try {
      if (modo === 'entrada') {
        const lote = await api<LoteApi>(`/estoque/produtos/${product.id}/entrada`, {
          method: 'POST',
          body: JSON.stringify({
            quantidade: qtd,
            valor_total: totalNumero,
            numero_lote: numeroLote.trim(),
            data_validade: validade || null,
            ...(responsavel.precisaEscolher ? { funcionario_id: Number(responsavel.value) } : {}),
          }),
        })
        onSaved('entrada', [lote])
      } else {
        const lotes = await api<LoteApi[]>(`/estoque/produtos/${product.id}/saida`, {
          method: 'POST',
          body: JSON.stringify({ quantidade: qtd, motivo: motivo.trim() }),
        })
        onSaved('saida', lotes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ajustar o estoque.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Ajustar estoque — ${product.nome}`}
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="estoque-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : modo === 'entrada' ? 'Adicionar ao estoque' : 'Remover do estoque'}
          </button>
        </>
      }
    >
      <form id={formId} className="estoque-form" onSubmit={submit}>
        <div className="ajuste-modo" role="group" aria-label="Tipo de ajuste">
          <button
            type="button"
            className={modo === 'entrada' ? 'active' : ''}
            aria-pressed={modo === 'entrada'}
            onClick={() => setModo('entrada')}
          >
            <Plus size={16} /> Adicionar
          </button>
          <button
            type="button"
            className={modo === 'saida' ? 'active ajuste-saida' : ''}
            aria-pressed={modo === 'saida'}
            onClick={() => setModo('saida')}
          >
            <Minus size={16} /> Remover
          </button>
        </div>

        <p className="ajuste-atual">
          Em estoque agora: <strong>{product.quantity}</strong>
          {product.valor_unitario != null && <> · Valor unitário: <strong>{currencyCents.format(unitario)}</strong></>}
        </p>

        <fieldset disabled={saving}>
          <label htmlFor={`${uid}-qtd`}>Quantidade a {modo === 'entrada' ? 'adicionar' : 'remover'}</label>
          <div className="ajuste-stepper">
            <button type="button" className="btn btn-outline" onClick={() => ajustar(-1)} aria-label="Diminuir quantidade">
              <Minus size={16} />
            </button>
            <input
              id={`${uid}-qtd`}
              type="number"
              min={1}
              max={modo === 'saida' ? product.quantity : QUANTIDADE_MAX}
              step={1}
              value={quantidade}
              onChange={(event) => {
                setQuantidade(event.target.value)
                setTotalEditado(null)
              }}
              required
            />
            <button type="button" className="btn btn-outline" onClick={() => ajustar(1)} aria-label="Aumentar quantidade">
              <Plus size={16} />
            </button>
          </div>

          {modo === 'entrada' ? (
            <>
              <div className="ajuste-calculo" aria-live="polite">
                <span>
                  {qtd} × {product.valor_unitario == null ? 'sem valor unitário' : currencyCents.format(unitario)}
                </span>
                <strong>{currencyCents.format(calculado)}</strong>
              </div>

              <label htmlFor={`${uid}-total`}>Valor total da compra (R$)</label>
              <div className="ajuste-total">
                <input
                  id={`${uid}-total`}
                  inputMode="numeric"
                  placeholder="0,00"
                  autoComplete="off"
                  value={totalMostrado}
                  onChange={(event) => setTotalEditado(valorDigitado(event.target.value))}
                />
                {alterado && (
                  <button type="button" className="btn btn-outline" onClick={() => setTotalEditado(null)}>
                    Restaurar cálculo
                  </button>
                )}
              </div>
              <p className="ajuste-dica">
                {alterado
                  ? 'Valor alterado manualmente.'
                  : 'Calculado pelo valor unitário. Você pode alterar se o preço pago foi diferente.'}{' '}
                A compra será lançada em Financeiro → A pagar.
              </p>

              {responsavel.precisaEscolher && (
                <ResponsavelSelect id={`${uid}-resp`} value={responsavel.value} onChange={responsavel.setValue} />
              )}

              <label htmlFor={`${uid}-lote`}>Número do lote (opcional)</label>
              <input
                id={`${uid}-lote`}
                value={numeroLote}
                onChange={(event) => setNumeroLote(event.target.value)}
                maxLength={50}
                placeholder="Gerado automaticamente se ficar vazio"
              />
              <label htmlFor={`${uid}-validade`}>Validade (opcional)</label>
              <input id={`${uid}-validade`} type="date" value={validade} onChange={(event) => setValidade(event.target.value)} />
            </>
          ) : (
            <>
              <div className={`ajuste-calculo ${restante < 0 ? 'ajuste-calculo-erro' : ''}`} aria-live="polite">
                <span>Quantidade em estoque depois</span>
                <strong>{restante < 0 ? 'insuficiente' : restante}</strong>
              </div>
              <label htmlFor={`${uid}-motivo`}>Motivo (opcional)</label>
              <input
                id={`${uid}-motivo`}
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                maxLength={200}
                placeholder="Ex.: perda, uso interno, correção de contagem"
              />
              <p className="ajuste-dica">Os lotes que vencem primeiro são consumidos primeiro.</p>
            </>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
