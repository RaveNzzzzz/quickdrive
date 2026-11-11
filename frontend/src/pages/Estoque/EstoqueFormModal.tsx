import { useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { CategoriaProdutoApi, LoteApi, ProdutoApi } from '../../types'

export type StockEditor =
  | { kind: 'produto'; item?: ProdutoApi }
  | { kind: 'categoria'; item?: CategoriaProdutoApi }
  | { kind: 'lote'; product: ProdutoApi; item?: LoteApi }

type Props = {
  editor: StockEditor
  categories: CategoriaProdutoApi[]
  onClose: () => void
  onSaved: (kind: StockEditor['kind'], item: ProdutoApi | CategoriaProdutoApi | LoteApi) => void
}

export function EstoqueFormModal({ editor, categories, onClose, onSaved }: Props) {
  const formId = useId()
  const [name, setName] = useState(editor.kind === 'lote' ? editor.item?.numero_lote ?? '' : editor.item?.nome ?? '')
  const [description, setDescription] = useState(editor.kind === 'produto' ? editor.item?.especificacao ?? '' : '')
  const [unitValue, setUnitValue] = useState(editor.kind === 'produto' ? editor.item?.valor_unitario ?? '' : '')
  const [categoryId, setCategoryId] = useState(editor.kind === 'produto' ? String(editor.item?.categoria_id ?? '') : '')
  const [quantity, setQuantity] = useState(editor.kind === 'lote' ? String(editor.item?.quantidade ?? 0) : '0')
  const [expiry, setExpiry] = useState(editor.kind === 'lote' ? editor.item?.data_validade ?? '' : '')
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
    const payload = editor.kind === 'produto'
      ? { nome: name.trim(), especificacao: description.trim(), categoria_id: Number(categoryId), valor_unitario: unitValueText || null }
      : editor.kind === 'categoria' ? { nome: name.trim() }
        : { numero_lote: name.trim(), quantidade: Number(quantity), data_validade: expiry || null, ...(!editor.item ? { produto_id: editor.product.id } : {}) }
    const path = editor.kind === 'produto' ? 'produtos' : editor.kind === 'categoria' ? 'categorias' : 'lotes'
    setSaving(true)
    try {
      const saved = await api<ProdutoApi | CategoriaProdutoApi | LoteApi>(`/estoque/${path}${editor.item ? `/${editor.item.id}` : ''}`, {
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
        </>}
        {editor.kind === 'lote' && <>
          <label htmlFor={`${formId}-quantity`}>Quantidade</label>
          <input id={`${formId}-quantity`} type="number" min={newLot ? 1 : 0} step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} />
          <label htmlFor={`${formId}-expiry`}>Validade (opcional)</label>
          <input id={`${formId}-expiry`} type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
          {newLot && <p>Ao salvar, a compra será lançada em Financeiro → A pagar com base no valor unitário do produto.</p>}
        </>}
      </fieldset>
    </form>
  </Modal>
}
