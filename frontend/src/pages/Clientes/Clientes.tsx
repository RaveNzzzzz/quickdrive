import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import { currency, currencyCents, daysFromToday, initials } from '../../utils/format'
import {
  clientes,
  type ClienteEstagio,
  type ClienteTipo,
} from './clientesData'
import './Clientes.css'

const PAGE_SIZE = 8

type Tab = 'Todos' | ClienteEstagio

const tabs: Tab[] = ['Todos', 'Cliente Ativo', 'Em Negociação', 'Inativo']

const tabLabels: Record<Tab, string> = {
  Todos: 'Todos',
  'Cliente Ativo': 'Ativos',
  'Em Negociação': 'Em negociação',
  Inativo: 'Inativos',
}

const estagioClass: Record<ClienteEstagio, string> = {
  'Cliente Ativo': 'cl-pill-ativo',
  'Em Negociação': 'cl-pill-negociacao',
  Inativo: 'cl-pill-inativo',
}

type Sort = 'recentes' | 'ltv' | 'nome'

function lastContactLabel(iso: string) {
  const days = -daysFromToday(iso)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}

export default function Clientes() {
  const [tab, setTab] = useState<Tab>('Todos')
  const [tipo, setTipo] = useState<ClienteTipo | ''>('')
  const [sort, setSort] = useState<Sort>('recentes')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const ativos = clientes.filter((c) => c.estagio === 'Cliente Ativo')
  const emNegociacao = clientes.filter((c) => c.estagio === 'Em Negociação')
  const ltvTotal = clientes.reduce((sum, c) => sum + c.ltv, 0)
  const compradores = clientes.filter((c) => c.vehicles > 0)
  const ltvMedio = compradores.length ? ltvTotal / compradores.length : 0
  // Inactive customers that used to buy, worth reactivating
  const reativar = clientes.filter((c) => c.estagio === 'Inativo' && c.vehicles > 0)

  const counts = useMemo(() => {
    const base = {} as Record<Tab, number>
    for (const t of tabs) base[t] = clientes.filter((c) => t === 'Todos' || c.estagio === t).length
    return base
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = clientes
      .filter((c) => tab === 'Todos' || c.estagio === tab)
      .filter((c) => !tipo || c.tipo === tipo)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.document.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      )

    return list.sort((a, b) => {
      if (sort === 'ltv') return b.ltv - a.ltv
      if (sort === 'nome') return a.name.localeCompare(b.name, 'pt-BR')
      return b.lastContact.localeCompare(a.lastContact)
    })
  }, [tab, tipo, sort, query])

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
    <div className="cl-page">
      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Total de clientes</h3>
          </div>
          <strong className="kpi-value">{clientes.length}</strong>
          <p className="kpi-helper">{ativos.length} ativos · {clientes.length - ativos.length} outros</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Em negociação</h3>
            <span className="trend-badge trend-neutral">Funil</span>
          </div>
          <strong className="kpi-value">{emNegociacao.length}</strong>
          <p className="kpi-helper">Ainda sem veículo comprado</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>LTV médio</h3>
          </div>
          <strong className="kpi-value">{currency.format(ltvMedio)}</strong>
          <p className="kpi-helper">Por cliente que já comprou</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Para reativar</h3>
            <span className={`trend-badge ${reativar.length ? 'trend-down' : 'trend-up'}`}>
              {reativar.length ? 'Oportunidade' : 'Ok'}
            </span>
          </div>
          <strong className="kpi-value">{reativar.length}</strong>
          <p className="kpi-helper">Inativos que já compraram conosco</p>
        </div>
      </div>

      <div className="card cl-table-card">
        <div className="cl-toolbar">
          <div className="cl-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={`cl-tab ${tab === t ? 'active' : ''}`}
                onClick={() => resetPage(setTab)(t)}
              >
                {tabLabels[t]}
                <span className="cl-tab-count">{counts[t]}</span>
              </button>
            ))}
          </div>

          <div className="cl-filters">
            <label className="cl-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => resetPage(setQuery)(e.target.value)}
                placeholder="Nome, documento ou e-mail"
              />
            </label>
            <select className="cl-select" value={tipo} onChange={(e) => resetPage(setTipo)(e.target.value as ClienteTipo | '')} aria-label="Filtrar por tipo">
              <option value="">Todos os tipos</option>
              <option>Pessoa Física</option>
              <option>Pessoa Jurídica</option>
            </select>
            <select className="cl-select" value={sort} onChange={(e) => resetPage(setSort)(e.target.value as Sort)} aria-label="Ordenar por">
              <option value="recentes">Contato mais recente</option>
              <option value="ltv">Maior LTV</option>
              <option value="nome">Nome (A–Z)</option>
            </select>
            <button type="button" className="btn btn-primary">
              <Plus size={16} />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="cl-table-scroll">
          <table className="data-table cl-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Contato</th>
                <th>Estágio</th>
                <th>Veículos</th>
                <th>LTV</th>
                <th>Responsável</th>
                <th>Última interação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((cliente) => (
                <tr key={cliente.id}>
                  <td>
                    <span className="cl-person">
                      <span className="cl-avatar">{initials(cliente.name)}</span>
                      <span>
                        <strong className="cl-name">{cliente.name}</strong>
                        <span className="cl-note">{cliente.document}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`cl-tipo ${cliente.tipo === 'Pessoa Jurídica' ? 'cl-tipo-pj' : ''}`}>
                      {cliente.tipo}
                    </span>
                  </td>
                  <td>
                    <strong className="cl-name">{cliente.email}</strong>
                    <span className="cl-note">{cliente.phone}</span>
                  </td>
                  <td>
                    <span className={`cl-pill ${estagioClass[cliente.estagio]}`}>{cliente.estagio}</span>
                  </td>
                  <td>{cliente.vehicles === 1 ? '1 veículo' : `${cliente.vehicles} veículos`}</td>
                  <td className="cl-ltv">{currencyCents.format(cliente.ltv)}</td>
                  <td>{cliente.owner}</td>
                  <td>
                    <strong className="cl-name">{lastContactLabel(cliente.lastContact)}</strong>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="row-action row-action-edit" aria-label={`Editar ${cliente.name}`}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="row-action row-action-delete" aria-label={`Excluir ${cliente.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="cl-empty">
                    Nenhum cliente encontrado para esses filtros.
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
        itemLabel="clientes"
        onPageChange={setPage}
      />
    </div>
  )
}
