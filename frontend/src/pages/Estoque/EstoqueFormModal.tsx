import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { ResponsavelSelect, useResponsavel } from './ResponsavelSelect'
import type { CategoriaProdutoApi, LoteApi, ProdutoApi, ProdutoCriadoApi } from '../../types'

export type StockEditor =
  | { kind: 'produto'; item?: ProdutoApi }
  | { kind: 'categoria'; item?: CategoriaProdutoApi }
  | { kind: 'lote'; product: ProdutoApi; item?: LoteApi }

type Props = {
  editor: StockEditor
  categories: CategoriaProdutoApi[]
  onClose: () => void
  onSaved: (kind: StockEditor['kind'], item: ProdutoApi | CategoriaProdutoApi | LoteApi | ProdutoCriadoApi) => void
}

export function EstoqueFormModal({ editor, categories, onClose, onSaved }: Props) {
  const formId = useId()
  const [name, setName] = useState(editor.kind === 'lote' ? editor.item?.numero_lote ?? '' : editor.item?.nome ?? '')
  const [description, setDescription] = useState(editor.kind === 'produto' ? editor.item?.especificacao ?? '' : '')
  const [unitValue, setUnitValue] = useState(editor.kind === 'produto' ? editor.item?.valor_unitario ?? '' : '')
  const [categoryId, setCategoryId] = useState(editor.kind === 'produto' ? String(editor.item?.categoria_id ?? '') : '')
  const [quantity, setQuantity] = useState(editor.kind === 'lote' ? String(editor.item?.quantidade ?? 0) : '0')
  const [expiry, setExpiry] = useState(editor.kind === 'lote' ? editor.item?.data_validade ?? '' : '')
  // Lote inicial (só ao criar produto): opcional, vira uma compra no financeiro.
  const [initialQty, setInitialQty] = useState('')
  const [initialLot, setInitialLot] = useState('')
  const [initialExpiry, setInitialExpiry] = useState('')
  const responsavel = useResponsavel()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const label = editor.kind === 'produto' ? 'produto' : editor.kind === 'categoria' ? 'categoria' : 'lote'
  const newLot = editor.kind === 'lote' && !editor.item

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    if (!name.trim()) { setError('Informe um nome ou número válido.'); return }
    if (editor.kind === 'lote' && (!Number.isSafeInteger(Number(quantity)) || Number(quantity) < (newLot ? 1 : 0) || quantity === '')) {
      setError(newLot ? 'Informe uma quantidade inteira maior que zero.' : 'A quantidade deve ser um número inteiro maior ou igual a zero.'); return
    }
    const unitValueText = unitValue.trim().replace(',', '.')
    if (editor.kind === 'produto' && unitValueText && !/^\d{1,10}(\.\d{1,2})?$/.test(unitValueText)) {
      setError('Informe um valor unitário válido, com até duas casas decimais.'); return
    }
    const newProduct = editor.kind === 'produto' && !editor.item
    const initialQuantity = Number(initialQty)
    const withLot = newProduct && initialQty.trim() !== '' && initialQuantity !== 0
    if (withLot) {
      if (!Number.isSafeInteger(initialQuantity) || initialQuantity < 1) {
        setError('A quantidade do lote inicial deve ser um número inteiro maior que zero.'); return
      }
      if (!unitValueText || Number(unitValueText) <= 0) {
        setError('Informe o valor unitário do produto para cadastrar o lote: a compra é calculada com ele.'); return
      }
    }
    const compraNova = withLot || newLot
    if (compraNova && responsavel.precisaEscolher && !responsavel.value) {
      setError('Escolha o funcionário responsável pela compra.'); return
    }
    const responsavelPayload = compraNova && responsavel.precisaEscolher ? { funcionario_id: Number(responsavel.value) } : {}
    const payload = editor.kind === 'produto'
      ? {
        nome: name.trim(), especificacao: description.trim(), categoria_id: Number(categoryId), valor_unitario: unitValueText || null,
        ...(withLot ? { lote: { quantidade: initialQuantity, numero_lote: initialLot.trim(), data_validade: initialExpiry || null, ...responsavelPayload } } : {}),
      }
      : editor.kind === 'categoria' ? { nome: name.trim() }
        : { numero_lote: name.trim(), quantidade: Number(quantity), data_validade: expiry || null, ...(!editor.item ? { produto_id: editor.product.id, ...responsavelPayload } : {}) }
    const path = editor.kind === 'produto' ? 'produtos' : editor.kind === 'categoria' ? 'categorias' : 'lotes'
    setSaving(true)
    try {
      const saved = await api<ProdutoApi | CategoriaProdutoApi | LoteApi | ProdutoCriadoApi>(`/estoque/${path}${editor.item ? `/${editor.item.id}` : ''}`, {
        method: editor.item ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      })
      onSaved(editor.kind, saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  return <Modal title={`${editor.item ? 'Editar' : 'Novo'} ${label}`} onClose={onClose} busy={saving} footer={<>
    {error && <p className="estoque-error" role="alert">{error}</p>}
    <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
    <button className="btn btn-primary" type="submit" form={formId} disabled={saving || (editor.kind === 'produto' && !categories.length)}>{saving ? 'Salvando…' : 'Salvar'}</button>
  </>}>
    <form id={formId} className="estoque-form" onSubmit={submit}>
      <fieldset disabled={saving}>
        {editor.kind === 'lote' && <p>Produto: <strong>{editor.product.nome}</strong></p>}
        <label htmlFor={`${formId}-name`}>{editor.kind === 'lote' ? 'Número do lote' : 'Nome'}</label>
        <input id={`${formId}-name`} value={name} onChange={e => setName(e.target.value)} required maxLength={editor.kind === 'lote' ? 50 : 100} />
        {editor.kind === 'produto' && <>
          <label htmlFor={`${formId}-category`}>Categoria</label>
          <select id={`${formId}-category`} value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
            <option value="">Selecione</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {!categories.length && <p>Cadastre uma categoria antes de criar o produto.</p>}
          <label htmlFor={`${formId}-description`}>Especificação (opcional)</label>
          <textarea id={`${formId}-description`} value={description} onChange={e => setDescription(e.target.value)} />
          <label htmlFor={`${formId}-unit-value`}>Valor unitário de referência (R$, opcional)</label>
          <input id={`${formId}-unit-value`} inputMode="decimal" value={unitValue} onChange={e => setUnitValue(e.target.value)} placeholder="0,00" />
          {!editor.item && <fieldset className="estoque-lote-inicial">
            <legend>Lote inicial (opcional)</legend>
            <label htmlFor={`${formId}-initial-qty`}>Quantidade</label>
            <input id={`${formId}-initial-qty`} type="number" min={1} step="1" value={initialQty} onChange={e => setInitialQty(e.target.value)} placeholder="Deixe vazio para cadastrar só o produto" />
            <label htmlFor={`${formId}-initial-lot`}>Número do lote</label>
            <input id={`${formId}-initial-lot`} value={initialLot} onChange={e => setInitialLot(e.target.value)} maxLength={50} placeholder="Gerado automaticamente se ficar vazio" />
            <label htmlFor={`${formId}-initial-expiry`}>Validade</label>
            <input id={`${formId}-initial-expiry`} type="date" value={initialExpiry} onChange={e => setInitialExpiry(e.target.value)} />
            {responsavel.precisaEscolher && initialQty.trim() !== '' && Number(initialQty) > 0 && (
              <ResponsavelSelect id={`${formId}-resp`} value={responsavel.value} onChange={responsavel.setValue} />
            )}
            <p>Com um lote, a compra (valor unitário × quantidade) é lançada em Financeiro → A pagar.</p>
          </fieldset>}
        </>}
        {editor.kind === 'lote' && <>
          <label htmlFor={`${formId}-quantity`}>Quantidade</label>
          <input id={`${formId}-quantity`} type="number" min={newLot ? 1 : 0} step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} />
          <label htmlFor={`${formId}-expiry`}>Validade (opcional)</label>
          <input id={`${formId}-expiry`} type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
          {newLot && responsavel.precisaEscolher && (
            <ResponsavelSelect id={`${formId}-resp-lote`} value={responsavel.value} onChange={responsavel.setValue} />
          )}
          {newLot && <p>Ao salvar, a compra será lançada em Financeiro → A pagar com base no valor unitário do produto.</p>}
        </>}
      </fieldset>
    </form>
  </Modal>
}
