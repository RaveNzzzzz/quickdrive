import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Modal } from '../../components/Modal'
import type { ClienteApi, CompraApi, LoteApi, Paginated, ProdutoApi, VeiculoApi } from '../../types'
import { toast } from '../../utils/toast'
import { ClienteFormModal } from '../Clientes/ClienteFormModal'
import { formasPagamento } from '../Vendas/formasPagamento'
import { ComprovanteField } from './ComprovanteField'
import { todayIso } from './financeiroUtils'

type PessoaOpcao = { id: number; pessoa: { nome: string } }

type Props = {
  onClose: () => void
  /** Chamado com a compra criada (se for de produto, a conta a pagar já foi gerada pela API). */
  onSaved: (compra: CompraApi) => void
}

/** Registro de uma compra da loja: de um veículo (ex.: comprado de um cliente) ou de um lote de produtos. */
export function CompraFormModal({ onClose, onSaved }: Props) {
  const formId = useId()
  const { user } = useAuth()

  const [veiculos, setVeiculos] = useState<VeiculoApi[]>([])
  const [clientes, setClientes] = useState<PessoaOpcao[]>([])
  const [funcionarios, setFuncionarios] = useState<PessoaOpcao[]>([])
  const [lotes, setLotes] = useState<(LoteApi & { produtoNome: string })[]>([])
  const [loading, setLoading] = useState(true)

  const [item, setItem] = useState<'veiculo' | 'produto'>('veiculo')
  const [veiculoId, setVeiculoId] = useState('')
  const [loteId, setLoteId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [funcionarioId, setFuncionarioId] = useState(String(user?.funcionario?.id ?? ''))
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState('pix')
  const [status, setStatus] = useState<'pendente' | 'concluida'>('pendente')
  const [data, setData] = useState(todayIso())
  const [vencimento, setVencimento] = useState(todayIso())
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api<Paginated<VeiculoApi>>('/veiculos?limit=1000'),
      api<Paginated<PessoaOpcao>>('/clientes?limit=1000'),
      api<Paginated<PessoaOpcao>>('/funcionarios?ativo=true&limit=1000'),
      api<ProdutoApi[]>('/estoque/produtos'),
      api<LoteApi[]>('/estoque/lotes'),
      api<Paginated<CompraApi>>('/compras?limit=1000'),
    ])
      .then(([v, c, f, produtos, todosLotes, compras]) => {
        if (!active) return
        setVeiculos(v.items)
        setClientes(c.items)
        setFuncionarios(f.items)
        // Lote que já tem compra ativa não pode ter outra (a API recusa).
        const comCompra = new Set(compras.items.filter((x) => x.status !== 'cancelada' && x.lote_id).map((x) => x.lote_id))
        const nomes = new Map(produtos.map((p) => [p.id, p.nome]))
        setLotes(
          todosLotes
            .filter((l) => !comCompra.has(l.id))
            .map((l) => ({ ...l, produtoNome: nomes.get(l.produto_id) ?? 'Produto' })),
        )
      })
      .catch((err: Error) => {
        if (active) setError(`Não foi possível carregar as opções: ${err.message}`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function handleClienteCadastrado(cliente: ClienteApi) {
    setClientes((atuais) =>
      [...atuais.filter((c) => c.id !== cliente.id), cliente].sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR')),
    )
    setClienteId(String(cliente.id))
    setCadastrandoCliente(false)
    toast.success('Cliente cadastrado com sucesso!')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    const valorNumero = Number(valor.replace(',', '.'))
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) return setError('Informe um valor maior que zero.')
    if (!funcionarioId) return setError('Escolha o funcionário responsável pela compra.')
    if (item === 'veiculo' && !veiculoId) return setError('Escolha o veículo comprado.')
    if (item === 'produto' && !loteId) return setError('Escolha o lote de produtos comprado.')

    setSaving(true)
    try {
      const salva = await api<CompraApi>('/compras', {
        method: 'POST',
        body: JSON.stringify({
          funcionario_id: Number(funcionarioId),
          cliente_id: clienteId ? Number(clienteId) : null,
          item_compra: item,
          veiculo_id: item === 'veiculo' ? Number(veiculoId) : null,
          lote_id: item === 'produto' ? Number(loteId) : null,
          valor_compra: valorNumero.toFixed(2),
          forma_pagamento: forma,
          status,
          data_compra: data,
          data_vencimento: item === 'produto' ? vencimento : null,
        }),
      })
      // O comprovante vai separado (arquivo não cabe em JSON). Se falhar, a compra já está salva.
      let final = salva
      if (proofFile) {
        try {
          const body = new FormData()
          body.append('arquivo', proofFile)
          final = await api<CompraApi>(`/compras/${salva.id}/comprovante`, { method: 'POST', body })
        } catch (err) {
          toast.error(`A compra foi salva, mas o comprovante não: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
        }
      }
      onSaved(final)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a compra.')
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        title="Nova compra"
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
            <label htmlFor={`${formId}-item`}>O que foi comprado</label>
            <select id={`${formId}-item`} value={item} onChange={(e) => setItem(e.target.value as 'veiculo' | 'produto')}>
              <option value="veiculo">Veículo</option>
              <option value="produto">Lote de produtos do estoque</option>
            </select>

            {item === 'veiculo' ? (
              <>
                <label htmlFor={`${formId}-veiculo`}>Veículo</label>
                <select id={`${formId}-veiculo`} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
                  <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} · {v.placa}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label htmlFor={`${formId}-lote`}>Lote</label>
                <select id={`${formId}-lote`} value={loteId} onChange={(e) => setLoteId(e.target.value)} required>
                  <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.produtoNome} · lote {l.numero_lote} ({l.quantidade} un.)
                    </option>
                  ))}
                </select>
                {!loading && lotes.length === 0 && (
                  <p>
                    Todos os lotes já têm compra registrada. Para dar entrada em produtos novos, use “Ajustar” na tela de
                    Estoque.
                  </p>
                )}
              </>
            )}

            <div className="vd-label-row">
              <label htmlFor={`${formId}-cliente`}>{item === 'veiculo' ? 'Comprado de (cliente, opcional)' : 'Cliente (opcional)'}</label>
              <button type="button" className="vd-link-btn" onClick={() => setCadastrandoCliente(true)} disabled={saving || loading}>
                + Novo cliente
              </button>
            </div>
            <select id={`${formId}-cliente`} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Nenhum</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.pessoa.nome}
                </option>
              ))}
            </select>

            <label htmlFor={`${formId}-funcionario`}>Funcionário responsável</label>
            <select id={`${formId}-funcionario`} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)} required>
              <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.pessoa.nome}
                </option>
              ))}
            </select>

            <div className="fx-form-row">
              <div>
                <label htmlFor={`${formId}-valor`}>Valor (R$)</label>
                <input
                  id={`${formId}-valor`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor={`${formId}-data`}>Data da compra</label>
                <input id={`${formId}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
            </div>

            <div className="fx-form-row">
              <div>
                <label htmlFor={`${formId}-forma`}>Forma de pagamento</label>
                <select id={`${formId}-forma`} value={forma} onChange={(e) => setForma(e.target.value)}>
                  {formasPagamento.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-status`}>Status</label>
                <select id={`${formId}-status`} value={status} onChange={(e) => setStatus(e.target.value as 'pendente' | 'concluida')}>
                  <option value="pendente">Pendente</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>

            <ComprovanteField file={proofFile} onFile={setProofFile} removed={false} onRemovedChange={() => {}} />

            {item === 'produto' && (
              <>
                <label htmlFor={`${formId}-vencimento`}>Vencimento da conta a pagar</label>
                <input
                  id={`${formId}-vencimento`}
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  required
                />
                <p>A compra de produtos gera a conta a pagar automaticamente.</p>
              </>
            )}
          </fieldset>
        </form>
      </Modal>

      {cadastrandoCliente && (
        <ClienteFormModal onClose={() => setCadastrandoCliente(false)} onSaved={handleClienteCadastrado} />
      )}
    </>
  )
}
