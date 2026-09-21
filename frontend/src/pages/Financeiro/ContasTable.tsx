import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, MoreHorizontal, Pencil, Search, Trash2, Undo2 } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import type { Conta } from './financeiroData'
import {
  currencyCents,
  dueHint,
  formatDate,
  statusLabel,
  statusOf,
  sum,
  type ContaStatus,
} from './financeiroUtils'

const PAGE_SIZE = 8

export type ContasTab = 'todas' | 'receber' | 'pagar' | 'atrasadas'

const tabLabels: Record<ContasTab, string> = {
  todas: 'Todas',
  receber: 'A receber',
  pagar: 'A pagar',
  atrasadas: 'Atrasadas',
}

const statusFilters: { value: ContaStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'hoje', label: 'Vence hoje' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'pago', label: 'Pago / Recebido' },
]

type ContasTableProps = {
  rows: Conta[]
  today: string
  tab: ContasTab
  tabCounts: Record<ContasTab, number>
  onTabChange: (tab: ContasTab) => void
  onTogglePaid: (id: number) => void
}

export function ContasTable({ rows, today, tab, tabCounts, onTabChange, onTogglePaid }: ContasTableProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ContaStatus | 'todos'>('todos')
  const [page, setPage] = useState(1)
  const [openMenu, setOpenMenu] = useState<number | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = rows.filter((conta) => {
    if (status !== 'todos' && statusOf(conta, today) !== status) return false
    if (!q) return true
    return (
      conta.description.toLowerCase().includes(q) ||
      conta.note.toLowerCase().includes(q) ||
      conta.category.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const entradas = sum(filtered.filter((c) => c.kind === 'receber'))
  const saidas = sum(filtered.filter((c) => c.kind === 'pagar'))

  function changeTab(next: ContasTab) {
    onTabChange(next)
    setPage(1)
  }

  return (
    <>
      <div className="card fx-table-card">
        <div className="fx-toolbar">
          <div className="fx-tabs">
            {(Object.keys(tabLabels) as ContasTab[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`fx-tab ${tab === key ? 'active' : ''} ${key === 'atrasadas' ? 'fx-tab-danger' : ''}`}
                onClick={() => changeTab(key)}
              >
                {tabLabels[key]}
                <span className="fx-tab-count">{tabCounts[key]}</span>
              </button>
            ))}
          </div>

          <div className="fx-filters">
            <label className="fx-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar conta"
              />
            </label>
            <select
              className="fx-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ContaStatus | 'todos')
                setPage(1)
              }}
              aria-label="Filtrar por status"
            >
              {statusFilters.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fx-table-scroll">
          <table className="data-table fx-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th className="fx-right">Valor</th>
                <th>Status</th>
                <th className="fx-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((conta) => {
                const contaStatus = statusOf(conta, today)
                return (
                  <tr key={conta.id} className={contaStatus === 'atrasado' ? 'fx-row-late' : ''}>
                    <td>
                      <strong className="fx-name">{conta.description}</strong>
                      <span className="fx-note">{conta.note}</span>
                    </td>
                    <td>
                      <span className={`fx-kind fx-kind-${conta.kind}`}>
                        {conta.kind === 'receber' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {conta.kind === 'receber' ? 'Receber' : 'Pagar'}
                      </span>
                    </td>
                    <td>{conta.category}</td>
                    <td>
                      <strong className="fx-name">{formatDate(conta.dueDate)}</strong>
                      <span className={`fx-note ${contaStatus === 'atrasado' ? 'fx-note-danger' : ''}`}>
                        {dueHint(conta, today)}
                      </span>
                    </td>
                    <td className={`fx-right fx-amount fx-amount-${conta.kind}`}>
                      {conta.kind === 'pagar' ? '− ' : ''}
                      {currencyCents.format(conta.amount)}
                    </td>
                    <td>
                      <span className={`fx-pill fx-pill-${contaStatus}`}>
                        {statusLabel(contaStatus, conta.kind)}
                      </span>
                    </td>
                    <td className="fx-right">
                      <div className="fx-actions">
                        {conta.paidAt ? (
                          <button type="button" className="fx-undo" onClick={() => onTogglePaid(conta.id)}>
                            <Undo2 size={14} />
                            Desfazer
                          </button>
                        ) : (
                          <button type="button" className="fx-pay" onClick={() => onTogglePaid(conta.id)}>
                            <Check size={14} />
                            {conta.kind === 'receber' ? 'Marcar recebido' : 'Marcar pago'}
                          </button>
                        )}
                        <div className="fx-menu-wrap">
                          <button
                            type="button"
                            className="fx-more"
                            aria-label={`Mais ações para ${conta.description}`}
                            onClick={() => setOpenMenu(openMenu === conta.id ? null : conta.id)}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openMenu === conta.id && (
                            <>
                              <div className="fx-menu-backdrop" onClick={() => setOpenMenu(null)} />
                              <div className="fx-menu">
                                <button type="button" onClick={() => setOpenMenu(null)}>
                                  <Pencil size={14} />
                                  Editar
                                </button>
                                <button type="button" className="fx-menu-danger" onClick={() => setOpenMenu(null)}>
                                  <Trash2 size={14} />
                                  Excluir
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="fx-empty">
                    Nenhuma conta encontrada para esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="fx-totals">
          <span>
            Entradas <strong className="fx-amount-receber">{currencyCents.format(entradas)}</strong>
          </span>
          <span>
            Saídas <strong className="fx-amount-pagar">{currencyCents.format(saidas)}</strong>
          </span>
          <span>
            Saldo <strong>{currencyCents.format(entradas - saidas)}</strong>
          </span>
        </div>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="contas"
        onPageChange={setPage}
      />
    </>
  )
}
