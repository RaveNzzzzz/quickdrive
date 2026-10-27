import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { CompraApi, ContaPagarApi, ContaReceberApi, LancamentoApi, Paginated, VendaApi } from '../../types'
import { contaPath, fromContaPagar, fromContaReceber, todayIso, type Conta, type ContaKind } from './financeiroUtils'

// Valor do <select> que significa "criar uma receita/despesa nova junto com a conta".
const NOVO = 'novo'

type Props = {
  /** Conta a editar. Sem ela, o formulário cria uma nova. */
  conta?: Conta
  onClose: () => void
  onSaved: (conta: Conta) => void
}

export function ContaFormModal({ conta, onClose, onSaved }: Props) {
  const formId = useId()
  const [receitas, setReceitas] = useState<LancamentoApi[]>([])
  const [despesas, setDespesas] = useState<LancamentoApi[]>([])
  const [vendas, setVendas] = useState<VendaApi[]>([])
  const [compras, setCompras] = useState<CompraApi[]>([])
  const [loading, setLoading] = useState(true)

  const [kind, setKind] = useState<ContaKind>(conta?.kind ?? 'pagar')
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

  const lancamentos = kind === 'receber' ? receitas : despesas
  const parentLabel = kind === 'receber' ? 'Receita' : 'Despesa'
  // Sugestões para o campo de categoria (as que já existem no tipo escolhido).
  const categorias = [...new Set(lancamentos.map((l) => l.categoria))].sort()

  function changeKind(next: ContaKind) {
    setKind(next)
    // A receita/despesa e a venda/compra escolhidas não valem para o outro tipo.
    setParentId('')
    setOriginId('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    const valor = Number(amount.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    const basePath = kind === 'receber' ? '/financeiro/receitas' : '/financeiro/despesas'
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
        if (kind === 'receber') setReceitas((prev) => [criado, ...prev])
        else setDespesas((prev) => [criado, ...prev])
        setParentId(String(criado.id))
      }

      const payload =
        kind === 'receber'
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
      onSaved(
        kind === 'receber'
          ? fromContaReceber(await api<ContaReceberApi>(path, options))
          : fromContaPagar(await api<ContaPagarApi>(path, options)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={conta ? 'Editar conta' : 'Nova conta'}
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
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving || loading}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id={formId} className="fx-form" onSubmit={submit}>
        <fieldset disabled={saving || loading}>
          {conta ? (
            <p>
              Tipo: <strong>{conta.kind === 'receber' ? 'Conta a receber' : 'Conta a pagar'}</strong>
            </p>
          ) : (
            <>
              <label htmlFor={`${formId}-kind`}>Tipo</label>
              <select id={`${formId}-kind`} value={kind} onChange={(e) => changeKind(e.target.value as ContaKind)}>
                <option value="pagar">Conta a pagar</option>
                <option value="receber">Conta a receber</option>
              </select>
            </>
          )}

          <label htmlFor={`${formId}-description`}>Descrição</label>
          <input
            id={`${formId}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === 'receber' ? 'Ex.: Ana Souza · parcela 1/3' : 'Ex.: Conta de luz de outubro'}
            maxLength={200}
            required
          />

          <div className="fx-form-row">
            <div>
              <label htmlFor={`${formId}-amount`}>Valor (R$)</label>
              <input
                id={`${formId}-amount`}
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
          <select id={`${formId}-parent`} value={parentId} onChange={(e) => setParentId(e.target.value)} required>
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
                  placeholder={kind === 'receber' ? 'Ex.: Venda do Gol' : 'Ex.: Energia elétrica'}
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
                  placeholder={kind === 'receber' ? 'Ex.: Financiamento' : 'Ex.: Contas de consumo'}
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

          <label htmlFor={`${formId}-origin`}>{kind === 'receber' ? 'Venda (opcional)' : 'Compra (opcional)'}</label>
          <select id={`${formId}-origin`} value={originId} onChange={(e) => setOriginId(e.target.value)}>
            <option value="">{kind === 'receber' ? 'Nenhuma venda' : 'Nenhuma compra'}</option>
            {kind === 'receber'
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

          <label className="fx-form-check">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            {kind === 'receber' ? 'Já foi recebida' : 'Já foi paga'}
          </label>
          {paid && (
            <>
              <label htmlFor={`${formId}-paid-at`}>{kind === 'receber' ? 'Data do recebimento' : 'Data do pagamento'}</label>
              <input id={`${formId}-paid-at`} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
            </>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
