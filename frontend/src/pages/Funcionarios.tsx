import { useState } from 'react'
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Pagination } from '../components/Pagination'
import { employees } from './funcionariosData'
import './Funcionarios.css'

const PAGE_SIZE = 10

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

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
  const totalPages = Math.ceil(employees.length / PAGE_SIZE)
  const pageItems = employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="funcionarios-page">
      <div className="toolbar">
        <div className="toolbar-left">
          <button type="button" className="icon-btn" aria-label="Buscar funcionário">
            <Search size={18} />
          </button>
          <button type="button" className="select-btn">
            Setor
            <ChevronDown size={16} />
          </button>
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
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={employees.length}
        pageSize={PAGE_SIZE}
        itemLabel="funcionários"
        onPageChange={setPage}
      />
    </div>
  )
}