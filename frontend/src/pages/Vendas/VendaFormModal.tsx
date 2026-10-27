import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Modal } from '../../components/Modal'
import type { Paginated, StatusVendaApi, VeiculoApi, VendaApi } from '../../types'
import { todayIso } from '../Financeiro/financeiroUtils'
import { formasPagamento } from './formasPagamento'

// Só o que o formulário usa de cliente e funcionário.
type PessoaOpcao = { id: number; pessoa: { nome: string } }

const statusOptions: { value: StatusVendaApi; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'cancelada', label: 'Cancelada' },
]

type Props = {
  /** Venda a editar. Sem ela, o formulário cria uma nova. */
  venda?: VendaApi
  onClose: () => void
  onSaved: (venda: VendaApi) => void
}

export function VendaFormModal({ venda, onClose, onSaved }: Props) {
  const formId = useId()
  const { user } = useAuth()
  // A lista de funcionários é só para gerentes (GestaoJWTAuth). Quem não é gerente vende em nome próprio.
  const escolheVendedor = !!user?.pode_gerenciar
  const [veiculos, setVeiculos] = useState<VeiculoApi[]>([])
  const [clientes, setClientes] = useState<PessoaOpcao[]>([])
  const [vendedores, setVendedores] = useState<PessoaOpcao[]>([])
  const [loading, setLoading] = useState(true)

  const [veiculoId, setVeiculoId] = useState('')
  const [clienteId, setClienteId] = useState(venda ? String(venda.cliente_id) : '')
  // Na venda nova, o vendedor começa como o funcionário logado.
  const [funcionarioId, setFuncionarioId] = useState(
    venda ? String(venda.funcionario_id) : String(user?.funcionario?.id ?? ''),
  )
  const [valor, setValor] = useState(venda ? String(venda.valor_venda) : '')
  const [forma, setForma] = useState(venda?.forma_pagamento ?? 'pix')
  const [status, setStatus] = useState<StatusVendaApi>(venda?.status ?? 'pendente')
  const [data, setData] = useState(venda?.data_venda ?? todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      // Na edição o veículo não muda, então só a venda nova precisa da lista de disponíveis.
      venda ? Promise.resolve(null) : api<Paginated<VeiculoApi>>('/veiculos?status=disponivel&limit=1000'),
      api<Paginated<PessoaOpcao>>('/clientes?limit=1000'),
      escolheVendedor ? api<Paginated<PessoaOpcao>>('/funcionarios?limit=1000') : Promise.resolve(null),
    ])
      .then(([v, c, f]) => {
        if (!active) return
        if (v) setVeiculos(v.items)
        setClientes(c.items)
        if (f) setVendedores(f.items)
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
  }, [venda, escolheVendedor])

  function chooseVeiculo(id: string) {
    setVeiculoId(id)
    // Sugere o preço anunciado do veículo; o vendedor pode mudar depois.
    const veiculo = veiculos.find((v) => String(v.id) === id)
    if (veiculo) setValor(String(veiculo.valor))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    const valorNumero = Number(valor.replace(',', '.'))
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    const payload = {
      ...(venda ? {} : { veiculo_id: Number(veiculoId) }),
      cliente_id: Number(clienteId),
      // Quem não é gerente não troca o vendedor ao editar (o backend só aceita o próprio id).
      ...(escolheVendedor || !venda ? { funcionario_id: Number(funcionarioId) } : {}),
      valor_venda: valorNumero.toFixed(2),
      forma_pagamento: forma,
      status,
      data_venda: data,
    }
    setSaving(true)
    try {
      const saved = await api<VendaApi>(venda ? `/vendas/${venda.id}` : '/vendas', {
        method: venda ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  const semVeiculos = !venda && !loading && veiculos.length === 0
  // Conta antiga, sem funcionário ligado, e sem permissão de escolher outro vendedor.
  const semVendedor = !escolheVendedor && !funcionarioId
  const nomeVendedor = venda ? venda.funcionario : user?.funcionario?.pessoa.nome

  return (
    <Modal
      title={venda ? 'Editar venda' : 'Nova venda'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          {error && (
            <p className="vd-error-text" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving || loading || semVeiculos || semVendedor}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id={formId} className="vd-form" onSubmit={submit}>
        <fieldset disabled={saving || loading}>
          {venda ? (
            <p>
              Veículo: <strong>{venda.veiculo}</strong> ({venda.placa}). Para trocar o veículo, cancele esta venda e
              crie outra.
            </p>
          ) : (
            <>
              <label htmlFor={`${formId}-veiculo`}>Veículo</label>
              <select id={`${formId}-veiculo`} value={veiculoId} onChange={(e) => chooseVeiculo(e.target.value)} required>
                <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} · {v.placa}
                  </option>
                ))}
              </select>
              {semVeiculos && <p>Não há veículos disponíveis no pátio para vender.</p>}
            </>
          )}

          <label htmlFor={`${formId}-cliente`}>Cliente</label>
          <select id={`${formId}-cliente`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
            <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.pessoa.nome}
              </option>
            ))}
          </select>

          {escolheVendedor ? (
            <>
              <label htmlFor={`${formId}-vendedor`}>Vendedor</label>
              <select
                id={`${formId}-vendedor`}
                value={funcionarioId}
                onChange={(e) => setFuncionarioId(e.target.value)}
                required
              >
                <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
                {vendedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.pessoa.nome}
                  </option>
                ))}
              </select>
            </>
          ) : semVendedor ? (
            <p>Sua conta não está ligada a um funcionário, então não pode registrar vendas.</p>
          ) : (
            <p>
              Vendedor: <strong>{nomeVendedor}</strong>
            </p>
          )}

          <div className="vd-form-row">
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
              <label htmlFor={`${formId}-data`}>Data da venda</label>
              <input id={`${formId}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
          </div>

          <div className="vd-form-row">
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
              <select
                id={`${formId}-status`}
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusVendaApi)}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p>
            {status === 'cancelada'
              ? 'Venda cancelada: o veículo fica disponível no pátio.'
              : 'Ao salvar, o veículo passa a constar como vendido no pátio.'}
          </p>
        </fieldset>
      </form>
    </Modal>
  )
}
