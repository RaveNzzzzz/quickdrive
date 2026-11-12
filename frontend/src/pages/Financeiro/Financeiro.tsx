import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Plus } from 'lucide-react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { toast } from '../../utils/toast'
import { mascarar, useValoresOcultos } from '../../utils/privacy'
import { DateRangePicker } from '../../components/DateRangePicker'
import { Modal } from '../../components/Modal'
import type { ContaPagarApi, ContaReceberApi, Paginated, VendaApi } from '../../types'
import type { FuncionarioApi } from '../Funcionarios/funcionariosData'
import { BaixaContaModal } from './BaixaContaModal'
import { CompraFormModal } from './CompraFormModal'
import { ContaFormModal } from './ContaFormModal'
import { ContasTable, type ContasTab } from './ContasTable'
import { CategoriasChart, FluxoCaixaChart } from './FinanceiroCharts'
import { ChartSkeleton, KpiSkeleton } from '../../components/Skeleton'
import {
  contaPath,
  currency,
  fromContaPagar,
  fromContaReceber,
  inRange,
  percentChange,
  previousRange,
  sortContas,
  statusOf,
  sum,
  todayIso,
  type Conta,
  type ContaKind,
  type DateRange,
} from './financeiroUtils'
import './Financeiro.css'

type Kpi = {
  label: string
  value: number
  helper: string
  change: number | null
  // Whether an increase is good news (false for expenses)
  goodWhenUp: boolean
  // Linha extra destacada (ex.: a folha salarial já incluída no total de "A pagar")
  highlight?: string
}

function ChangeBadge({ change, goodWhenUp }: { change: number | null; goodWhenUp: boolean }) {
  if (change === null) return null
  const good = change >= 0 === goodWhenUp
  return (
    <span className={`trend-badge ${good ? 'trend-up' : 'trend-down'}`}>
      {change >= 0 ? '+' : ''}
      {change.toFixed(1).replace('.', ',')}%
    </span>
  )
}

function summarize(list: Conta[]) {
  const receber = list.filter((c) => c.kind === 'receber')
  const pagar = list.filter((c) => c.kind === 'pagar')
  return {
    saldo: sum(receber) - sum(pagar),
    receberAberto: sum(receber.filter((c) => !c.paidAt)),
    pagarAberto: sum(pagar.filter((c) => !c.paidAt)),
    receberAbertoCount: receber.filter((c) => !c.paidAt).length,
    pagarAbertoCount: pagar.filter((c) => !c.paidAt).length,
    recebido: sum(receber.filter((c) => c.paidAt)),
    pago: sum(pagar.filter((c) => c.paidAt)),
  }
}

export default function Financeiro() {
  const today = todayIso()
  const { user } = useAuth()
  // Comissão do vendedor: só para quem gerencia (a lista de funcionários com o percentual é restrita).
  const verComissao = !!user?.pode_gerenciar
  const [oculto, setOculto] = useValoresOcultos()
  const fmt = (valor: number) => mascarar(currency.format(valor), oculto)
  const [comissoes, setComissoes] = useState<Map<number, number>>(new Map())
  const [vendedorDaVenda, setVendedorDaVenda] = useState<Map<number, number>>(new Map())
  const [comprando, setComprando] = useState(false)
  // Conta que está sendo marcada como paga/recebida (abre a confirmação com o comprovante opcional).
  const [baixa, setBaixa] = useState<Conta | null>(null)
  const [contas, setContas] = useState<Conta[]>([])
  const [payroll, setPayroll] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [actionError, setActionError] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [deletion, setDeletion] = useState<Conta | null>(null)
  const [deleteError, setDeleteError] = useState('')
  // null = formulário fechado; { conta } = editando; { kind } = nova conta daquele tipo
  const [editor, setEditor] = useState<{ conta?: Conta; kind?: ContaKind } | null>(null)
  const [range, setRange] = useState<DateRange>(() => {
    const [y, m] = today.split('-').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` }
  })
  const [tab, setTab] = useState<ContasTab>('todas')

  useEffect(() => {
    let active = true
    // KPIs e filtros são calculados aqui na tela, então buscamos a lista inteira (limit=1000).
    Promise.all([
      api<Paginated<ContaReceberApi>>('/financeiro/contas-receber?limit=1000'),
      api<Paginated<ContaPagarApi>>('/financeiro/contas-pagar?limit=1000'),
      // Folha salarial: soma fixa dos ativos, não entra como conta até alguém lançá-la.
      // Todos os funcionários (a comissão também vale para quem já saiu); a folha só conta os ativos.
      api<Paginated<FuncionarioApi>>('/funcionarios?limit=1000'),
      // Para saber quem vendeu cada venda (comissão das contas a receber).
      api<Paginated<VendaApi>>('/vendas?limit=1000'),
    ])
      .then(([receber, pagar, funcionarios, vendas]) => {
        if (!active) return
        // Contas canceladas não entram nas contas do caixa.
        setContas([
          ...receber.items.filter((c) => c.status !== 'cancelado').map(fromContaReceber),
          ...pagar.items.filter((c) => c.status !== 'cancelado').map(fromContaPagar),
        ])
        setPayroll(funcionarios.items.filter((f) => f.ativo).reduce((sum, f) => sum + Number(f.salario), 0))
        setComissoes(new Map(funcionarios.items.map((f) => [f.id, Number(f.comissao)])))
        setVendedorDaVenda(new Map(vendas.items.map((v) => [v.id, v.funcionario_id])))
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt])

  const periodContas = useMemo(() => contas.filter((c) => inRange(c.dueDate, range)), [contas, range])
  const previousContas = useMemo(() => {
    const before = previousRange(range)
    return contas.filter((c) => inRange(c.dueDate, before))
  }, [contas, range])
  // Overdue accounts are shown regardless of the selected period
  const overdue = useMemo(() => contas.filter((c) => statusOf(c, today) === 'atrasado'), [contas, today])

  const current = summarize(periodContas)
  const previous = summarize(previousContas)

  const kpis: Kpi[] = [
    {
      label: 'Saldo previsto',
      value: current.saldo,
      helper: 'Tudo que entra menos tudo que sai no período',
      change: percentChange(current.saldo, previous.saldo),
      goodWhenUp: true,
    },
    {
      label: 'A receber',
      value: current.receberAberto,
      helper: `${current.receberAbertoCount} em aberto · ${fmt(current.recebido)} já recebido`,
      change: percentChange(current.receberAberto, previous.receberAberto),
      goodWhenUp: true,
    },
    {
      label: 'A pagar',
      value: current.pagarAberto + payroll,
      helper: `${current.pagarAbertoCount} em aberto · ${fmt(current.pago)} já pago`,
      change: percentChange(current.pagarAberto, previous.pagarAberto),
      goodWhenUp: false,
      highlight: payroll > 0 ? `Inclui ${fmt(payroll)} de folha salarial fixa prevista` : undefined,
    },
  ]

  const rows = useMemo(() => {
    if (tab === 'atrasadas') return sortContas(overdue)
    if (tab === 'todas') return sortContas(periodContas)
    return sortContas(periodContas.filter((c) => c.kind === tab))
  }, [tab, periodContas, overdue])

  const tabCounts: Record<ContasTab, number> = {
    todas: periodContas.length,
    receber: periodContas.filter((c) => c.kind === 'receber').length,
    pagar: periodContas.filter((c) => c.kind === 'pagar').length,
    atrasadas: overdue.length,
  }

  async function togglePaid(conta: Conta) {
    // O backend preenche a data de pagamento/recebimento com hoje e apaga a data ao voltar para pendente.
    const status = conta.paidAt ? 'pendente' : conta.kind === 'receber' ? 'recebido' : 'pago'
    const options = { method: 'PATCH', body: JSON.stringify({ status }) }
    setBusyKey(conta.key)
    setActionError('')
    try {
      const updated =
        conta.kind === 'receber'
          ? fromContaReceber(await api<ContaReceberApi>(contaPath(conta), options))
          : fromContaPagar(await api<ContaPagarApi>(contaPath(conta), options))
      setContas((prev) => prev.map((c) => (c.key === updated.key ? updated : c)))
      toast.success(
        status === 'pendente' ? 'Conta marcada como pendente.' : conta.kind === 'receber' ? 'Conta marcada como recebida.' : 'Conta marcada como paga.',
      )
    } catch (err) {
      setActionError(`Não foi possível atualizar "${conta.description}": ${(err as Error).message}`)
    } finally {
      setBusyKey(null)
    }
  }

  // Marcar como pago/recebido abre a confirmação (com o comprovante opcional); "Desfazer" é direto.
  function handleTogglePaid(conta: Conta) {
    if (conta.paidAt) void togglePaid(conta)
    else setBaixa(conta)
  }

  function baixaConfirmada(conta: Conta) {
    setContas((prev) => prev.map((c) => (c.key === conta.key ? conta : c)))
    setBaixa(null)
    toast.success(conta.kind === 'receber' ? 'Conta marcada como recebida.' : 'Conta marcada como paga.')
  }

  function saved(conta: Conta) {
    setContas((prev) =>
      prev.some((c) => c.key === conta.key) ? prev.map((c) => (c.key === conta.key ? conta : c)) : [...prev, conta],
    )
    toast.success(editor?.conta ? 'Conta atualizada com sucesso!' : 'Conta cadastrada com sucesso!')
    setEditor(null)
  }

  function askDelete(conta: Conta) {
    setDeleteError('')
    setDeletion(conta)
  }

  async function remove() {
    if (!deletion) return
    setBusyKey(deletion.key)
    try {
      await api<null>(contaPath(deletion), { method: 'DELETE' })
      setContas((prev) => prev.filter((c) => c.key !== deletion.key))
      setDeletion(null)
      toast.success('Conta excluída com sucesso!')
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setBusyKey(null)
    }
  }

  const deleting = deletion !== null && busyKey === deletion.key

  return (
    <div className="fx-page">
      <div className="fx-header">
        <DateRangePicker value={range} onChange={setRange} />

        <div className="fx-header-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setOculto(!oculto)}
            aria-pressed={oculto}
            title={oculto ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {oculto ? <EyeOff size={16} /> : <Eye size={16} />}
            {oculto ? 'Mostrar valores' : 'Ocultar valores'}
          </button>
          <button type="button" className="btn btn-receive" onClick={() => setEditor({ kind: 'receber' })}>
            <Plus size={16} />
            Conta a receber
          </button>
          <button type="button" className="btn btn-pay" onClick={() => setEditor({ kind: 'pagar' })}>
            <Plus size={16} />
            Conta a pagar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setComprando(true)}>
            <Plus size={16} />
            Compras
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="fx-error">
          Não foi possível carregar as contas: {error}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setLoading(true)
              setError('')
              setAttempt((v) => v + 1)
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="fx-error">
          {actionError}
        </div>
      )}

      <div className="kpi-row kpi-row-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card kpi-card fx-kpi">
            <div className="kpi-card-header">
              <h3>{kpi.label}</h3>
              <ChangeBadge change={kpi.change} goodWhenUp={kpi.goodWhenUp} />
            </div>
            <strong className="kpi-value">{loading ? <KpiSkeleton /> : fmt(kpi.value)}</strong>
            <p className="kpi-helper">{kpi.helper}</p>
            {kpi.highlight && <span className="fx-kpi-highlight">{kpi.highlight}</span>}
          </div>
        ))}

        <button
          type="button"
          className={`card kpi-card fx-kpi fx-kpi-late ${overdue.length === 0 ? 'fx-kpi-ok' : ''}`}
          onClick={() => setTab('atrasadas')}
        >
          <div className="kpi-card-header">
            <h3>Em atraso</h3>
            <span className={`trend-badge ${overdue.length > 0 ? 'trend-down' : 'trend-up'}`}>
              {overdue.length > 0 ? 'Atenção' : 'Em dia'}
            </span>
          </div>
          <strong className="kpi-value">{fmt(sum(overdue))}</strong>
          <p className="kpi-helper">
            {overdue.length > 0
              ? `${overdue.length} ${overdue.length === 1 ? 'conta' : 'contas'} · ver contas →`
              : 'Nenhuma conta vencida'}
          </p>
        </button>
      </div>

      <div className="fx-charts">
        {loading ? (
          <>
            <div className="card fx-chart-card">
              <ChartSkeleton height={240} />
            </div>
            <div className="card fx-chart-card">
              <ChartSkeleton height={240} />
            </div>
          </>
        ) : (
          <>
            <FluxoCaixaChart contas={periodContas} range={range} oculto={oculto} />
            <CategoriasChart contas={periodContas} oculto={oculto} />
          </>
        )}
      </div>

      <ContasTable
        rows={rows}
        today={today}
        tab={tab}
        tabCounts={tabCounts}
        onTabChange={setTab}
        onTogglePaid={handleTogglePaid}
        onEdit={(conta) => setEditor({ conta })}
        onDelete={askDelete}
        loading={loading}
        busyKey={busyKey}
        oculto={oculto}
        mostrarComissao={verComissao}
        comissaoDe={(conta) =>
          conta.kind === 'receber' && conta.originId !== null
            ? comissoes.get(vendedorDaVenda.get(conta.originId) ?? -1)
            : undefined
        }
      />

      {editor && (
        <ContaFormModal
          conta={editor.conta}
          kind={editor.kind}
          comissoes={verComissao ? comissoes : undefined}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}

      {baixa && (
        <BaixaContaModal conta={baixa} oculto={oculto} onClose={() => setBaixa(null)} onConfirmed={baixaConfirmada} />
      )}

      {comprando && (
        <CompraFormModal
          onClose={() => setComprando(false)}
          onSaved={(compra) => {
            setComprando(false)
            toast.success(
              compra.item_compra === 'produto'
                ? 'Compra registrada. A conta a pagar foi gerada automaticamente.'
                : 'Compra registrada com sucesso!',
            )
            // A compra de produtos gera conta a pagar: recarrega a lista.
            setLoading(true)
            setAttempt((v) => v + 1)
          }}
        />
      )}

      {deletion && (
        <Modal
          title="Confirmar exclusão"
          size="sm"
          busy={deleting}
          onClose={() => setDeletion(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" disabled={deleting} onClick={() => setDeletion(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={deleting} onClick={remove}>
                {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </>
          }
        >
          <p>Excluir a conta "{deletion.description}"? Essa ação não pode ser desfeita.</p>
          {deleteError && (
            <p role="alert" className="fx-error-text">
              {deleteError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
