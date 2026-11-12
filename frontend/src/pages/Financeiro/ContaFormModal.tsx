import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Modal } from '../../components/Modal'
import type { CompraApi, ContaPagarApi, ContaReceberApi, LancamentoApi, Paginated, VendaApi } from '../../types'
import { toast } from '../../utils/toast'
import { resumoComissao } from '../Vendas/comissao'
import { abrirComprovante } from './comprovante'
import { ComprovanteField } from './ComprovanteField'
import { comprovantePath, contaPath, fromContaPagar, fromContaReceber, todayIso, type Conta, type ContaKind } from './financeiroUtils'

// Valor do <select> que significa "criar uma receita/despesa nova junto com a conta".
const NOVO = 'novo'

type Props = {
  /** Conta a editar. Sem ela, o formulário cria uma nova. */
  conta?: Conta
  /** Tipo da conta nova (cada botão da tela abre o formulário do seu tipo). Ao editar, vale o tipo da conta. */
  kind?: ContaKind
  /** Percentual de comissão de cada vendedor (id do funcionário -> %). Só vem para quem gerencia. */
  comissoes?: Map<number, number>
  onClose: () => void
  onSaved: (conta: Conta) => void
}

export function ContaFormModal({ conta, kind: kindInicial = 'pagar', comissoes, onClose, onSaved }: Props) {
  const formId = useId()
  const { user } = useAuth()
  const kind: ContaKind = conta?.kind ?? kindInicial
  const receber = kind === 'receber'
  const verComissao = !!user?.pode_gerenciar && !!comissoes

  const [receitas, setReceitas] = useState<LancamentoApi[]>([])
  const [despesas, setDespesas] = useState<LancamentoApi[]>([])
  const [vendas, setVendas] = useState<VendaApi[]>([])
  const [compras, setCompras] = useState<CompraApi[]>([])
  const [loading, setLoading] = useState(true)

  const [description, setDescription] = useState(conta?.description ?? '')
  const [amount, setAmount] = useState(conta ? String(conta.amount) : '')
  const [dueDate, setDueDate] = useState(conta?.dueDate ?? todayIso())
  const [parentId, setParentId] = useState(conta ? String(conta.parentId) : '')
  // '' = conta sem venda/compra ligada
  const [originId, setOriginId] = useState(conta?.originId ? String(conta.originId) : '')
  const [newParentName, setNewParentName] = useState('')
  const [newParentCategory, setNewParentCategory] = useState('')
  const [paid, setPaid] = useState(!!conta?.paidAt)
  const [paidAt, setPaidAt] = useState(conta?.paidAt ?? todayIso())
  // Comprovante de pagamento.
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [removeProof, setRemoveProof] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api<Paginated<LancamentoApi>>('/financeiro/receitas?limit=1000'),
      api<Paginated<LancamentoApi>>('/financeiro/despesas?limit=1000'),
      api<Paginated<VendaApi>>('/vendas?limit=1000'),
      api<Paginated<CompraApi>>('/compras?limit=1000'),
    ])
      .then(([r, d, v, c]) => {
        if (!active) return
        setReceitas(r.items)
        setDespesas(d.items)
        setVendas(v.items)
        setCompras(c.items)
      })
      .catch((err: Error) => {
        if (active) setError(`Não foi possível carregar receitas e despesas: ${err.message}`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const lancamentos = receber ? receitas : despesas
  const parentLabel = receber ? 'Receita' : 'Despesa'
  // Sugestões para o campo de categoria (as que já existem no tipo escolhido).
  const categorias = [...new Set(lancamentos.map((l) => l.categoria))].sort()

  // Comissão do vendedor da venda ligada à conta (só para quem gerencia).
  const vendaLigada = receber && originId ? vendas.find((v) => String(v.id) === originId) : undefined
  const valorNumero = Number(amount.replace(',', '.'))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    const valor = Number(amount.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    const basePath = receber ? '/financeiro/receitas' : '/financeiro/despesas'
    setSaving(true)
    try {
      let lancamentoId = Number(parentId)
      if (parentId === NOVO) {
        const criado = await api<LancamentoApi>(basePath, {
          method: 'POST',
          body: JSON.stringify({
            descricao: newParentName,
            categoria: newParentCategory,
            valor: valor.toFixed(2),
            data: dueDate,
          }),
        })
        lancamentoId = criado.id
        // Se a conta falhar logo abaixo, tentar de novo usa esta receita/despesa em vez de criar outra.
        if (receber) setReceitas((prev) => [criado, ...prev])
        else setDespesas((prev) => [criado, ...prev])
        setParentId(String(criado.id))
      }

      const payload = receber
        ? {
            receita_id: lancamentoId,
            venda_id: originId ? Number(originId) : null,
            status: paid ? 'recebido' : 'pendente',
            data_recebimento: paid ? paidAt : null,
          }
        : {
            despesa_id: lancamentoId,
            compra_id: originId ? Number(originId) : null,
            status: paid ? 'pago' : 'pendente',
            data_pagamento: paid ? paidAt : null,
          }
      const body = JSON.stringify({ ...payload, descricao: description, valor: valor.toFixed(2), data_vencimento: dueDate })
      const options = { method: conta ? 'PATCH' : 'POST', body }
      const path = conta ? contaPath(conta) : `/financeiro/contas-${kind}`

      let salva = await api<ContaReceberApi | ContaPagarApi>(path, options)
      // O comprovante vai separado (arquivo não cabe em JSON). Se falhar, a conta já está salva.
      const comprovanteUrl = `/financeiro/contas-${kind}/${salva.id}/comprovante`
      try {
        if (proofFile) {
          const body = new FormData()
          body.append('arquivo', proofFile)
          salva = await api<ContaReceberApi | ContaPagarApi>(comprovanteUrl, { method: 'POST', body })
        } else if (removeProof && conta?.hasProof) {
          salva = await api<ContaReceberApi | ContaPagarApi>(comprovanteUrl, { method: 'DELETE' })
        }
      } catch (err) {
        toast.error(
          `A conta foi salva, mas o comprovante não: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
        )
      }
      onSaved(receber ? fromContaReceber(salva as ContaReceberApi) : fromContaPagar(salva as ContaPagarApi))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  const titulo = `${conta ? 'Editar' : 'Nova'} conta a ${receber ? 'receber' : 'pagar'}`

  return (
    <Modal
      title={titulo}
      onClose={onClose}
      busy={saving}
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
          <button
            type="submit"
            form={formId}
            className={`btn ${receber ? 'btn-receive' : 'btn-pay'}`}
            disabled={saving || loading}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id={formId} className="fx-form" onSubmit={submit}>
        <fieldset disabled={saving || loading}>
          <label htmlFor={`${formId}-description`}>Descrição</label>
          <input
            id={`${formId}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={receber ? 'Ex.: Ana Souza · parcela 1/3' : 'Ex.: Conta de luz de outubro'}
            maxLength={200}
            required
          />

          <div className="fx-form-row">
            <div>
              <label htmlFor={`${formId}-amount`}>Valor (R$)</label>
              <input
                id={`${formId}-amount`}
                readOnly={conta?.automatic}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-due`}>Vencimento</label>
              <input id={`${formId}-due`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          <label htmlFor={`${formId}-parent`}>{parentLabel}</label>
          <select id={`${formId}-parent`} value={parentId} onChange={(e) => setParentId(e.target.value)} required disabled={conta?.automatic}>
            <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
            <option value={NOVO}>+ Criar {parentLabel.toLowerCase()} nova</option>
            {lancamentos.map((l) => (
              <option key={l.id} value={l.id}>
                {l.descricao} ({l.categoria})
              </option>
            ))}
          </select>
          <p>
            Toda conta pertence a uma {parentLabel.toLowerCase()}. Uma {parentLabel.toLowerCase()} pode ter várias
            contas (por exemplo, as parcelas).
          </p>

          {parentId === NOVO && (
            <div className="fx-form-row">
              <div>
                <label htmlFor={`${formId}-parent-name`}>Nome da {parentLabel.toLowerCase()}</label>
                <input
                  id={`${formId}-parent-name`}
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder={receber ? 'Ex.: Venda do Gol' : 'Ex.: Energia elétrica'}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <label htmlFor={`${formId}-parent-category`}>Categoria</label>
                <input
                  id={`${formId}-parent-category`}
                  list={`${formId}-categories`}
                  value={newParentCategory}
                  onChange={(e) => setNewParentCategory(e.target.value)}
                  placeholder={receber ? 'Ex.: Financiamento' : 'Ex.: Contas de consumo'}
                  maxLength={60}
                  required
                />
                <datalist id={`${formId}-categories`}>
                  {categorias.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          <label htmlFor={`${formId}-origin`}>{receber ? 'Venda (opcional)' : 'Compra (opcional)'}</label>
          <select id={`${formId}-origin`} value={originId} onChange={(e) => setOriginId(e.target.value)} disabled={conta?.automatic}>
            <option value="">{receber ? 'Nenhuma venda' : 'Nenhuma compra'}</option>
            {receber
              ? vendas.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.veiculo} ({v.placa}) · {v.cliente}
                  </option>
                ))
              : compras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.veiculo ?? c.lote ?? `Compra ${c.id}`} · {c.data_compra.split('-').reverse().join('/')}
                  </option>
                ))}
          </select>

          {verComissao && vendaLigada && (
            <div className="fx-comissao" aria-live="polite">
              <span>
                Comissão de {vendaLigada.funcionario}
                <small>sobre o valor desta conta</small>
              </span>
              <strong>{resumoComissao(valorNumero, comissoes?.get(vendaLigada.funcionario_id))}</strong>
            </div>
          )}

          <label className="fx-form-check">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            {receber ? 'Já foi recebida' : 'Já foi paga'}
          </label>
          {paid && (
            <>
              <label htmlFor={`${formId}-paid-at`}>{receber ? 'Data do recebimento' : 'Data do pagamento'}</label>
              <input id={`${formId}-paid-at`} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
            </>
          )}

          <ComprovanteField
            savedName={conta?.hasProof ? conta.proofName : null}
            onView={conta ? () => void abrirComprovante(comprovantePath(conta)) : undefined}
            file={proofFile}
            onFile={setProofFile}
            removed={removeProof}
            onRemovedChange={setRemoveProof}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
