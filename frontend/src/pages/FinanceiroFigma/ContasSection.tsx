import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { Conta } from './financeiroFigmaData'

const PAGE_SIZE = 4

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export type ContasTab = {
  label: string
  tag: string | null
}

type ContasSectionProps = {
  title: string
  nameHeader: string
  createLabel: string
  tabs: ContasTab[]
  contas: Conta[]
  // Slice colors by tag; key order is the legend order
  chartColors: Record<string, string>
  pillClass: Record<string, string>
}

export function ContasSection({
  title,
  nameHeader,
  createLabel,
  tabs,
  contas,
  chartColors,
  pillClass,
}: ContasSectionProps) {
  const [tabIndex, setTabIndex] = useState(0)
  const [page, setPage] = useState(1)

  const activeTag = tabs[tabIndex].tag
  const filtered = activeTag ? contas.filter((c) => c.tag === activeTag) : contas
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const chartData = useMemo(
    () =>
      Object.keys(chartColors).map((tag) => ({
        tag,
        value: contas.filter((c) => c.tag === tag).reduce((sum, c) => sum + c.value, 0),
      })),
    [contas, chartColors],
  )

  function changeTab(index: number) {
    setTabIndex(index)
    setPage(1)
  }

  return (
    <div className="fin-row">
      <div className="fin-left">
        <div className="fin-tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              className={`fin-tab ${index === tabIndex ? 'active' : ''}`}
              onClick={() => changeTab(index)}
            >
              {tab.label}
              {tab.tag && (
                <span className="fin-tab-count">{contas.filter((c) => c.tag === tab.tag).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="card fin-table-card">
          <h3 className="fin-table-title">{title}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>{nameHeader}</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((conta) => (
                <tr key={conta.id}>
                  <td>
                    <strong className="fin-name">{conta.name}</strong>
                    <span className="fin-note">{conta.note}</span>
                  </td>
                  <td className="fin-value">{currency.format(conta.value)}</td>
                  <td>
                    <span className={`status-pill ${pillClass[conta.tag]}`}>{conta.tag}</span>
                  </td>
                  <td className="fin-date">{conta.date}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-action row-action-edit"
                        aria-label={`Editar ${conta.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="row-action row-action-delete"
                        aria-label={`Excluir ${conta.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination-controls fin-pagination">
            <button
              type="button"
              className="pagination-nav"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`pagination-page ${p === currentPage ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="pagination-nav"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="fin-right">
        <button type="button" className="btn btn-primary fin-create">
          {createLabel}
        </button>
        <div className="card fin-chart-card">
          <h3 className="fin-chart-title">{title}</h3>
          <div className="fin-chart-body">
            <div className="fin-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="tag"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {chartData.map((slice) => (
                      <Cell key={slice.tag} fill={chartColors[slice.tag]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="fin-legend">
              {chartData.map((slice) => (
                <li key={slice.tag}>
                  <span className="fin-legend-dot" style={{ background: chartColors[slice.tag] }} />
                  {slice.tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
