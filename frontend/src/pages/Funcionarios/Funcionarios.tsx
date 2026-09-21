import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import { employees } from './funcionariosData'
import './Funcionarios.css'

const PAGE_SIZE = 10

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const sectors = [...new Set(employees.map((e) => e.sector))].sort()

type StatusFilter = 'todos' | 'ativos' | 'desligados'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Funcionarios() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('')
  const [status, setStatus] = useState<StatusFilter>('todos')

  const active = employees.filter((e) => e.status)
  const payroll = active.reduce((sum, e) => sum + e.salary, 0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees.filter(
      (e) =>
        (!sector || e.sector === sector) &&
        (status === 'todos' || (status === 'ativos') === e.status) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q)),
    )
  }, [query, sector, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="funcionarios-page">
      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Funcionários</h3>
          </div>
          <strong className="kpi-value">{employees.length}</strong>
          <p className="kpi-helper">Em {sectors.length} setores</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Ativos</h3>
            <span className="trend-badge trend-up">{Math.round((active.length / employees.length) * 100)}%</span>
          </div>
          <strong className="kpi-value">{active.length}</strong>
          <p className="kpi-helper">Da equipe total</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Desligados</h3>
          </div>
          <strong className="kpi-value">{employees.length - active.length}</strong>
          <p className="kpi-helper">Mantidos apenas no histórico</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Folha mensal</h3>
          </div>
          <strong className="kpi-value">{currency.format(payroll)}</strong>
          <p className="kpi-helper">Soma dos salários dos ativos</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <label className="func-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Nome, e-mail ou cargo"
            />
          </label>
          <select className="func-select" value={sector} onChange={(e) => resetPage(setSector)(e.target.value)} aria-label="Filtrar por setor">
            <option value="">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="func-select"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as StatusFilter)}
            aria-label="Filtrar por status"
          >
            <option value="todos">Todos os status</option>
            <option value="ativos">Ativos</option>
            <option value="desligados">Desligados</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button type="button" className="btn btn-primary">
            <Plus size={16} />
            Novo Funcionário
          </button>
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Setor</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>Salário</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <span className="employee-cell">
                    <span className="employee-avatar">{initials(employee.name)}</span>
                    {employee.name}
                  </span>
                </td>
                <td>{employee.email}</td>
                <td>{employee.phone}</td>
                <td>{employee.sector}</td>
                <td>{employee.position}</td>
                <td>
                  <span className={employee.status ? 'status-badge status-active' : 'status-badge status-inactive'}>
                    {employee.status ? 'Ativo' : 'Desligado'}
                  </span>
                </td>
                <td>{currency.format(employee.salary)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="row-action row-action-edit"
                      aria-label={`Editar ${employee.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="row-action row-action-delete"
                      aria-label={`Excluir ${employee.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="func-empty">
                  Nenhum funcionário encontrado para esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="funcionários"
        onPageChange={setPage}
      />
    </div>
  )
}
