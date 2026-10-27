import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import type { Paginated, StatusVendaApi, VendaApi } from '../../types'
import {
  currency,
  currencyCents,
  currencyCompact,
  daysFromToday,
  downloadCsv,
  formatDate,
  formatPercent,
  initials,
  percentChange,
} from '../../utils/format'
import { formaPagamentoLabel } from './formasPagamento'
import { VendaFormModal } from './VendaFormModal'
import './Vendas.css'

const PAGE_SIZE = 8

// As metas ainda não ficam no banco.
const metaFaturamento = 450000
const metaVendasFechadas = 9

type VendaStatus = 'Pago' | 'Pendente' | 'Cancelada'

type Venda = {
  /** Como a API devolveu (o formulário de edição usa os ids e valores originais). */
  raw: VendaApi
  id: number
  client: string
  note: string
  vehicle: string
  plate: string
  seller: string
  value: number
  status: VendaStatus
  date: string // YYYY-MM-DD
}

const statusLabel: Record<StatusVendaApi, VendaStatus> = {
  pago: 'Pago',
  pendente: 'Pendente',
  cancelada: 'Cancelada',
}

function fromApi(venda: VendaApi): Venda {
  return {
    raw: venda,
    id: venda.id,
    client: venda.cliente,
    note: formaPagamentoLabel[venda.forma_pagamento] ?? venda.forma_pagamento,
    vehicle: venda.veiculo,
    plate: venda.placa,
    seller: venda.funcionario,
    value: venda.valor_venda,
    status: statusLabel[venda.status],
    date: venda.data_venda,
  }
}

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Faturamento (vendas pagas) de cada mês do ano atual
function monthlyRevenue(list: Venda[]) {
  const year = String(new Date().getFullYear())
  const totals = monthNames.map((month) => ({ month, value: 0 }))
  for (const venda of list) {
    if (venda.status !== 'Pago' || !venda.date.startsWith(year)) continue
    totals[Number(venda.date.slice(5, 7)) - 1].value += venda.value
  }
  return totals
}

type Tab = 'Todas' | 'Pagas' | 'Pendentes' | 'Canceladas'

const tabStatus: Record<Tab, VendaStatus | null> = {
  Todas: null,
  Pagas: 'Pago',
  Pendentes: 'Pendente',
  Canceladas: 'Cancelada',
}

const tabs = Object.keys(tabStatus) as Tab[]

const periods = [
  { value: 30, label: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias' },
  { value: 0, label: 'Todo o período' },
]

const statusClass: Record<VendaStatus, string> = {
  Pago: 'vd-pill-pago',
  Pendente: 'vd-pill-pendente',
  Cancelada: 'vd-pill-cancelada',
}

function inWindow(venda: Venda, from: number, to: number) {
  // days ago: from (older bound, exclusive of `to`) ... e.g. 0..30
  const ago = -daysFromToday(venda.date)
  return ago >= to && ago < from
}

function summarize(list: Venda[]) {
  const pagas = list.filter((v) => v.status === 'Pago')
  const faturamento = pagas.reduce((sum, v) => sum + v.value, 0)
  const abertas = list.filter((v) => v.status === 'Pendente')
  return {
    faturamento,
    fechadas: pagas.length,
    ticket: pagas.length ? faturamento / pagas.length : 0,
    aReceber: abertas.reduce((sum, v) => sum + v.value, 0),
    abertas: abertas.length,
  }
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null
  return <span className={`trend-badge ${value >= 0 ? 'trend-up' : 'trend-down'}`}>{formatPercent(value)}</span>
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [deletion, setDeletion] = useState<Venda | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  // null = formulário fechado; { venda } = editando; {} = nova venda
  const [editor, setEditor] = useState<{ venda?: VendaApi } | null>(null)
  const [period, setPeriod] = useState(30)
  const [tab, setTab] = useState<Tab>('Todas')
  const [query, setQuery] = useState('')
  const [seller, setSeller] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    // KPIs e filtros são calculados aqui na tela, então buscamos a lista inteira (limit=1000).
    api<Paginated<VendaApi>>('/vendas?limit=1000')
      .then((data) => {
        if (active) setVendas(data.items.map(fromApi))
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

  const sellers = useMemo(() => [...new Set(vendas.map((v) => v.seller))].sort(), [vendas])
  const faturamentoMensal = useMemo(() => monthlyRevenue(vendas), [vendas])

  const inPeriod = useMemo(
    () => (period === 0 ? vendas : vendas.filter((v) => inWindow(v, period, 0))),
    [vendas, period],
  )
  const previous = useMemo(
    () => (period === 0 ? null : vendas.filter((v) => inWindow(v, period * 2, period))),
    [vendas, period],
  )

  const current = summarize(inPeriod)
  const before = previous ? summarize(previous) : null

  const tabCounts = useMemo(() => {
    const counts = {} as Record<Tab, number>
    for (const t of tabs) {
      counts[t] = inPeriod.filter((v) => !tabStatus[t] || v.status === tabStatus[t]).length
    }
    return counts
  }, [inPeriod])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const status = tabStatus[tab]
    return inPeriod
      .filter((v) => !status || v.status === status)
      .filter((v) => !seller || v.seller === seller)
      .filter(
        (v) =>
          !q ||
          v.client.toLowerCase().includes(q) ||
          v.vehicle.toLowerCase().includes(q) ||
          v.plate.toLowerCase().includes(q),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [inPeriod, tab, seller, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const currentMonth = new Date().getMonth()
  const metaPct = Math.min(100, Math.round((current.faturamento / metaFaturamento) * 100))

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function exportCsv() {
    downloadCsv(
      'vendas.csv',
      ['Cliente', 'Veículo', 'Placa', 'Vendedor', 'Valor', 'Status', 'Data'],
      filtered.map((v) => [v.client, v.vehicle, v.plate, v.seller, v.value, v.status, formatDate(v.date)]),
    )
  }

  function saved(venda: VendaApi) {
    const item = fromApi(venda)
    setVendas((prev) =>
      prev.some((v) => v.id === item.id) ? prev.map((v) => (v.id === item.id ? item : v)) : [item, ...prev],
    )
    setEditor(null)
  }

  async function remove() {
    if (!deletion) return
    setDeleting(true)
    try {
      // Se a venda tiver contas a receber, a API recusa (409) e a mensagem aparece no pop-up.
      await api<null>(`/vendas/${deletion.id}`, { method: 'DELETE' })
      setVendas((prev) => prev.filter((v) => v.id !== deletion.id))
      setDeletion(null)
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="vd-page">
      {error && (
        <div role="alert" className="vd-error">
          Não foi possível carregar as vendas: {error}
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

      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Faturamento</h3>
            <Change value={before && percentChange(current.faturamento, before.faturamento)} />
          </div>
          <strong className="kpi-value">{currency.format(current.faturamento)}</strong>
          <div className="vd-goal">
            <div className="vd-goal-bar">
              <div style={{ width: `${metaPct}%` }} />
            </div>
            <p className="kpi-helper">
              {metaPct}% da meta de {currencyCompact.format(metaFaturamento)}
            </p>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Vendas fechadas</h3>
            <Change value={before && percentChange(current.fechadas, before.fechadas)} />
          </div>
          <strong className="kpi-value">{current.fechadas}</strong>
          <p className="kpi-helper">Meta do mês: {metaVendasFechadas} veículos</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Ticket médio</h3>
            <Change value={before && percentChange(current.ticket, before.ticket)} />
          </div>
          <strong className="kpi-value">{currency.format(current.ticket)}</strong>
          <p className="kpi-helper">Por venda paga no período</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>A receber</h3>
            <span className="trend-badge trend-neutral">{current.abertas} abertas</span>
          </div>
          <strong className="kpi-value">{currency.format(current.aReceber)}</strong>
          <p className="kpi-helper">Vendas pendentes de pagamento</p>
        </div>
      </div>

      <div className="card vd-chart-card">
        <div className="vd-chart-header">
          <div>
            <h3>Faturamento por mês</h3>
            <p>Vendas pagas em {new Date().getFullYear()} comparadas à meta mensal</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={faturamentoMensal} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              tickFormatter={(v: number) => currencyCompact.format(v)}
            />
            <Tooltip formatter={(value) => currencyCents.format(Number(value))} cursor={{ fill: 'var(--bg)' }} />
            <ReferenceLine
              y={metaFaturamento}
              stroke="var(--danger)"
              strokeDasharray="5 5"
              label={{ value: `Meta ${currencyCompact.format(metaFaturamento)}`, position: 'insideTopRight', fill: 'var(--danger)', fontSize: 12 }}
            />
            <Bar dataKey="value" name="Faturamento" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {faturamentoMensal.map((item, index) => (
                <Cell key={item.month} fill={index === currentMonth ? 'var(--accent)' : '#b8ccff'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card vd-table-card">
        <div className="vd-toolbar">
          <div className="vd-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={`vd-tab ${tab === t ? 'active' : ''}`}
                onClick={() => resetPage(setTab)(t)}
              >
                {t}
                <span className="vd-tab-count">{tabCounts[t]}</span>
              </button>
            ))}
          </div>

          <div className="vd-filters">
            <label className="vd-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => resetPage(setQuery)(e.target.value)}
                placeholder="Cliente, veículo ou placa"
                aria-label="Buscar por cliente, veículo ou placa"
              />
            </label>
            <select className="vd-select" value={seller} onChange={(e) => resetPage(setSeller)(e.target.value)} aria-label="Filtrar por vendedor">
              <option value="">Todos os vendedores</option>
              {sellers.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="vd-select"
              value={period}
              onChange={(e) => resetPage(setPeriod)(Number(e.target.value))}
              aria-label="Período"
            >
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download size={16} />
              Exportar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>
              <Plus size={16} />
              Nova venda
            </button>
          </div>
        </div>

        <div className="vd-table-scroll">
          <table className="data-table vd-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Vendedor</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((venda) => (
                <tr key={venda.id} className={venda.status === 'Cancelada' ? 'vd-row-cancelada' : ''}>
                  <td>
                    <strong className="vd-name">{venda.client}</strong>
                    <span className="vd-note">{venda.note}</span>
                  </td>
                  <td>
                    <strong className="vd-name">{venda.vehicle}</strong>
                    <span className="vd-note">{venda.plate}</span>
                  </td>
                  <td>
                    <span className="vd-seller">
                      <span className="vd-avatar">{initials(venda.seller)}</span>
                      {venda.seller}
                    </span>
                  </td>
                  <td className="vd-value">{currencyCents.format(venda.value)}</td>
                  <td>
                    <span className={`vd-pill ${statusClass[venda.status]}`}>{venda.status}</span>
                  </td>
                  <td className="vd-date">{formatDate(venda.date)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action row-action-edit"
                        aria-label={`Editar venda de ${venda.client}`}
                        onClick={() => setEditor({ venda: venda.raw })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-delete"
                        aria-label={`Excluir venda de ${venda.client}`}
                        onClick={() => {
                          setDeleteError('')
                          setDeletion(venda)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="vd-empty">
                    {loading ? 'Carregando…' : 'Nenhuma venda encontrada para esses filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="vendas"
        onPageChange={setPage}
      />

      {editor && <VendaFormModal venda={editor.venda} onClose={() => setEditor(null)} onSaved={saved} />}

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
          <p>
            Excluir a venda do {deletion.vehicle} ({deletion.plate}) para {deletion.client}? Essa ação não pode ser
            desfeita.
          </p>
          <p>Se a venda não estiver cancelada, o veículo volta a ficar disponível no pátio.</p>
          {deleteError && (
            <p role="alert" className="vd-error-text">
              {deleteError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
