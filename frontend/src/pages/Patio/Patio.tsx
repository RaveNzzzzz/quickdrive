import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowDownWideNarrow, Car, ChevronRight, Plus, Search, X } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import { api, apiUrl } from '../../api/client'
import type { Paginated, VeiculoApi } from '../../types'
import {
  lotCapacity,
  staleThresholdDays,
  targetAverageDays,
  type PatioStatus,
} from './patioData'
import { VeiculoFormModal } from './VeiculoFormModal'
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

// Formato que a tela usa (o mesmo dos dados fixos que existiam antes).
type PatioVehicle = {
  id: number
  name: string
  status: PatioStatus
  vaga: string
  bodyType: string
  year: number
  engine: string
  plate: string
  km: number
  daysInLot: number
  price: number
  imageUrl: string | null
}

// Status que a API devolve -> texto que a tela mostra.
// "vendido" e "manutencao" não estão aqui de propósito: não aparecem no pátio.
const statusFromApi: Record<string, PatioStatus | undefined> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  preparacao: 'Preparação',
}

// Converte um veículo da API para o formato da tela.
function toPatioVehicle(v: VeiculoApi): PatioVehicle | null {
  const status = statusFromApi[v.status]
  if (!status) return null

  const daysInLot = Math.max(
    0,
    Math.floor((Date.now() - new Date(v.data_entrada).getTime()) / 86_400_000),
  )

  return {
    id: v.id,
    name: `${v.marca} ${v.modelo}`,
    status,
    vaga: v.vaga,
    bodyType: v.carroceria,
    year: v.ano_modelo,
    engine: v.motorizacao,
    plate: v.placa,
    km: v.quilometragem,
    daysInLot,
    price: v.valor,
    imageUrl: v.imagem_url ? apiUrl(v.imagem_url) : null,
  }
}

export default function Patio() {
  const [patioVehicles, setPatioVehicles] = useState<PatioVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('Todos')
  const [query, setQuery] = useState('')
  const [sortByDays, setSortByDays] = useState(false)
  const [page, setPage] = useState(1)

  // Busca os veículos na API quando a página abre.
  useEffect(() => {
    api<Paginated<VeiculoApi>>('/veiculos?limit=1000')
      .then((data) =>
        setPatioVehicles(
          data.items.map(toPatioVehicle).filter((v): v is PatioVehicle => v !== null),
        ),
      )
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Aviso vindo de outra tela (ex.: depois de excluir um veículo na ficha).
  useEffect(() => {
    const state = location.state as { notice?: string } | null
    if (state?.notice) {
      setNotice(state.notice)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  // O aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  function handleCreated(saved: VeiculoApi, warning?: string) {
    const item = toPatioVehicle(saved)
    if (item) setPatioVehicles((prev) => [item, ...prev])
    setCreating(false)
    setNotice(
      warning ??
        (item
          ? 'Veículo adicionado ao pátio.'
          : 'Veículo cadastrado. Com esse status, ele não aparece no pátio.'),
    )
  }

  const counts = useMemo(() => {
    const base: Record<Tab, number> = { Todos: 0, Disponível: 0, Reservado: 0, Preparação: 0 }
    for (const vehicle of patioVehicles) {
      base.Todos++
      base[vehicle.status]++
    }
    return base
  }, [patioVehicles])

  const totalValue = useMemo(
    () => patioVehicles.reduce((sum, vehicle) => sum + vehicle.price, 0),
    [patioVehicles],
  )

  const averageDays = useMemo(
    () =>
      patioVehicles.length
        ? Math.round(patioVehicles.reduce((sum, v) => sum + v.daysInLot, 0) / patioVehicles.length)
        : 0,
    [patioVehicles],
  )

  const staleCount = useMemo(
    () => patioVehicles.filter((v) => v.daysInLot >= staleThresholdDays).length,
    [patioVehicles],
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
  }, [patioVehicles, tab, query, sortByDays])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function changeTab(next: Tab) {
    setTab(next)
    setPage(1)
  }

  return (
    <div className="patio-page">
      {notice && (
        <div className="patio-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}

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
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
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

            <div className={`vehicle-photo ${vehicle.imageUrl ? 'has-image' : ''}`}>
              {vehicle.imageUrl ? (
                <img src={vehicle.imageUrl} alt={`Foto de ${vehicle.name}`} loading="lazy" />
              ) : (
                <Car size={32} />
              )}
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
              <Link to={`/patio/${vehicle.id}`} className="vehicle-link">
                Ver ficha
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        ))}

        {loading && <p className="patio-empty">Carregando…</p>}

        {error && (
          <p className="patio-empty" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && pageItems.length === 0 && (
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

      {creating && (
        <VeiculoFormModal mode="create" onClose={() => setCreating(false)} onSaved={handleCreated} />
      )}
    </div>
  )
}