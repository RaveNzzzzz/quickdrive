import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Car, ChevronRight, Plus, Search } from 'lucide-react'
import { Pagination } from '../components/Pagination'
import {
  lotCapacity,
  patioVehicles,
  staleThresholdDays,
  targetAverageDays,
  type PatioStatus,
} from './patioData'
import './Patio.css'

const PAGE_SIZE = 6

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR')

type Tab = 'Todos' | PatioStatus

const tabs: Tab[] = ['Todos', 'Disponível', 'Reservado', 'Preparação']

const statusClass: Record<PatioStatus, string> = {
  Disponível: 'patio-status-disponivel',
  Reservado: 'patio-status-reservado',
  Preparação: 'patio-status-preparacao',
}

export default function Patio() {
  const [tab, setTab] = useState<Tab>('Todos')
  const [query, setQuery] = useState('')
  const [sortByDays, setSortByDays] = useState(false)
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    const base: Record<Tab, number> = { Todos: 0, Disponível: 0, Reservado: 0, Preparação: 0 }
    for (const vehicle of patioVehicles) {
      base.Todos++
      base[vehicle.status]++
    }
    return base
  }, [])

  const totalValue = useMemo(
    () => patioVehicles.reduce((sum, vehicle) => sum + vehicle.price, 0),
    [],
  )
  const averageDays = useMemo(
    () => Math.round(patioVehicles.reduce((sum, v) => sum + v.daysInLot, 0) / patioVehicles.length),
    [],
  )
  const staleCount = useMemo(
    () => patioVehicles.filter((v) => v.daysInLot >= staleThresholdDays).length,
    [],
  )
  const freeSpots = lotCapacity - patioVehicles.length

  const filtered = useMemo(() => {
    let list = tab === 'Todos' ? patioVehicles : patioVehicles.filter((v) => v.status === tab)

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.plate.toLowerCase().includes(q) ||
          v.vaga.toLowerCase().includes(q),
      )
    }

    if (sortByDays) {
      list = [...list].sort((a, b) => b.daysInLot - a.daysInLot)
    }

    return list
  }, [tab, query, sortByDays])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function changeTab(next: Tab) {
    setTab(next)
    setPage(1)
  }

  return (
    <div className="patio-page">
      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Veículos no pátio</h3>
            <span className="trend-badge trend-neutral">{freeSpots} vagas</span>
          </div>
          <strong className="kpi-value">{patioVehicles.length}</strong>
          <p className="kpi-helper">Capacidade de {lotCapacity} vagas</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Valor imobilizado</h3>
            <span className="trend-badge trend-neutral">Tabela</span>
          </div>
          <strong className="kpi-value">{currency.format(totalValue)}</strong>
          <p className="kpi-helper">Soma do preço de tabela</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Permanência média</h3>
            <span className={`trend-badge ${averageDays <= targetAverageDays ? 'trend-up' : 'trend-down'}`}>
              {averageDays <= targetAverageDays ? 'Na meta' : 'Fora da meta'}
            </span>
          </div>
          <strong className="kpi-value">{averageDays} dias</strong>
          <p className="kpi-helper">Meta interna: até {targetAverageDays} dias</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Parados há {staleThresholdDays}+ dias</h3>
            <span className={`trend-badge ${staleCount > 0 ? 'trend-down' : 'trend-up'}`}>
              {staleCount > 0 ? 'Atenção' : 'Ok'}
            </span>
          </div>
          <strong className="kpi-value">{staleCount}</strong>
          <p className="kpi-helper kpi-helper-danger">Revisar precificação</p>
        </div>
      </div>

      <div className="card patio-toolbar">
        <div className="patio-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`patio-tab ${tab === t ? 'active' : ''}`}
              onClick={() => changeTab(t)}
            >
              {t}
              <span className="patio-tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>

        <div className="patio-toolbar-actions">
          <label className="patio-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Modelo, placa ou vaga"
            />
          </label>
          <button
            type="button"
            className={`btn btn-outline ${sortByDays ? 'active' : ''}`}
            onClick={() => setSortByDays((v) => !v)}
          >
            <ArrowDownWideNarrow size={16} />
            Mais tempo no pátio
          </button>
          <button type="button" className="btn btn-primary">
            <Plus size={16} />
            Adicionar Veículo
          </button>
        </div>
      </div>

      <div className="patio-grid">
        {pageItems.map((vehicle) => (
          <div key={vehicle.id} className="card vehicle-card">
            <div className="vehicle-card-top">
              <span className="vehicle-tag">
                {vehicle.vaga} · {vehicle.bodyType}
              </span>
              <span className={`patio-status ${statusClass[vehicle.status]}`}>{vehicle.status}</span>
            </div>

            <h3>{vehicle.name}</h3>
            <p className="vehicle-subtitle">
              {vehicle.year} · {vehicle.engine} · {vehicle.bodyType}
            </p>

            <div className="vehicle-photo">
              <Car size={32} />
            </div>

            <div className="vehicle-info-row">
              <div>
                <span className="vehicle-info-label">Placa</span>
                <strong>{vehicle.plate}</strong>
              </div>
              <div>
                <span className="vehicle-info-label">KM</span>
                <strong>{number.format(vehicle.km)}</strong>
              </div>
              <div>
                <span className="vehicle-info-label">No pátio</span>
                <strong>{vehicle.daysInLot} dias</strong>
              </div>
            </div>

            <div className="vehicle-card-footer">
              <div>
                <span className="vehicle-info-label">Preço de tabela</span>
                <strong className="vehicle-price">{currency.format(vehicle.price)}</strong>
              </div>
              <button type="button" className="vehicle-link">
                Ver ficha
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}

        {pageItems.length === 0 && (
          <p className="patio-empty">Nenhum veículo encontrado para esse filtro.</p>
        )}
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="veículos"
        onPageChange={setPage}
      />
    </div>
  )
}
