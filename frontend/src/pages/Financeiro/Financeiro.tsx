import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { DateRangePicker } from '../../components/DateRangePicker'
import { ContasTable, type ContasTab } from './ContasTable'
import { CategoriasChart, FluxoCaixaChart } from './FinanceiroCharts'
import { initialContas, todayIso, type Conta } from './financeiroData'
import {
  currency,
  inRange,
  percentChange,
  previousRange,
  sortContas,
  statusOf,
  sum,
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
  const [contas, setContas] = useState<Conta[]>(initialContas)
  const [range, setRange] = useState<DateRange>(() => {
    const [y, m] = today.split('-').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` }
  })
  const [tab, setTab] = useState<ContasTab>('todas')

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
      helper: `${current.receberAbertoCount} em aberto · ${currency.format(current.recebido)} já recebido`,
      change: percentChange(current.receberAberto, previous.receberAberto),
      goodWhenUp: true,
    },
    {
      label: 'A pagar',
      value: current.pagarAberto,
      helper: `${current.pagarAbertoCount} em aberto · ${currency.format(current.pago)} já pago`,
      change: percentChange(current.pagarAberto, previous.pagarAberto),
      goodWhenUp: false,
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

  function togglePaid(id: number) {
    setContas((prev) => prev.map((c) => (c.id === id ? { ...c, paidAt: c.paidAt ? null : today } : c)))
  }

  return (
    <div className="fx-page">
      <div className="fx-header">
        <DateRangePicker value={range} onChange={setRange} />

        <button type="button" className="btn btn-primary">
          <Plus size={16} />
          Nova conta
        </button>
      </div>

      <div className="kpi-row kpi-row-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card kpi-card fx-kpi">
            <div className="kpi-card-header">
              <h3>{kpi.label}</h3>
              <ChangeBadge change={kpi.change} goodWhenUp={kpi.goodWhenUp} />
            </div>
            <strong className="kpi-value">{currency.format(kpi.value)}</strong>
            <p className="kpi-helper">{kpi.helper}</p>
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
          <strong className="kpi-value">{currency.format(sum(overdue))}</strong>
          <p className="kpi-helper">
            {overdue.length > 0
              ? `${overdue.length} ${overdue.length === 1 ? 'conta' : 'contas'} · ver contas →`
              : 'Nenhuma conta vencida'}
          </p>
        </button>
      </div>

      <div className="fx-charts">
        <FluxoCaixaChart contas={periodContas} range={range} />
        <CategoriasChart contas={periodContas} />
      </div>

      <ContasTable rows={rows} today={today} tab={tab} tabCounts={tabCounts} onTabChange={setTab} onTogglePaid={togglePaid} />
    </div>
  )
}
