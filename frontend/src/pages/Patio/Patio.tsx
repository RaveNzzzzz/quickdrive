import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpDown, Car, Check, ChevronRight, Plus, Search } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import { SearchableSelect } from '../../components/SearchableSelect'
import { useDismiss } from '../../components/useDismiss'
import { api, apiUrl } from '../../api/client'
import { toast } from '../../utils/toast'
import { KpiSkeleton, Skeleton } from '../../components/Skeleton'
import type { OpcaoApi, Paginated, VeiculoApi } from '../../types'
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

// Os vendidos só aparecem quando a aba "Vendidos" é escolhida (não entram em "Todos" nem nos indicadores).
const tabs: Tab[] = ['Todos', 'Disponível', 'Reservado', 'Preparação', 'Vendido']
const tabLabel: Record<Tab, string> = {
  Todos: 'Todos',
  Disponível: 'Disponível',
  Reservado: 'Reservado',
  Preparação: 'Preparação',
  Vendido: 'Vendidos',
}

type SortKey = 'padrao' | 'az' | 'za' | 'dias-desc' | 'dias-asc' | 'km-desc' | 'km-asc'

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'padrao', label: 'Mais recentes (padrão)' },
  { value: 'az', label: 'A–Z' },
  { value: 'za', label: 'Z–A' },
  { value: 'dias-desc', label: 'Mais tempo no pátio' },
  { value: 'dias-asc', label: 'Menos tempo no pátio' },
  { value: 'km-desc', label: 'Maior quilometragem' },
  { value: 'km-asc', label: 'Menor quilometragem' },
]

const statusClass: Record<PatioStatus, string> = {
  Disponível: 'patio-status-disponivel',
  Reservado: 'patio-status-reservado',
  Preparação: 'patio-status-preparacao',
  Vendido: 'patio-status-vendido',
}

// Formato que a tela usa (o mesmo dos dados fixos que existiam antes).
type PatioVehicle = {
  id: number
  name: string
  brandId: number
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
// "manutencao" não está aqui de propósito: não aparece no pátio. "vendido" só aparece na aba própria.
const statusFromApi: Record<string, PatioStatus | undefined> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  preparacao: 'Preparação',
  vendido: 'Vendido',
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
    brandId: v.marca_id,
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
  const location = useLocation()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('Todos')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('padrao')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  useDismiss(sortRef, sortOpen, () => setSortOpen(false))
  const [brandFilter, setBrandFilter] = useState('')
  const [brands, setBrands] = useState<OpcaoApi[]>([])
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

  // Marcas cadastradas no sistema (opções do filtro de marca).
  useEffect(() => {
    api<OpcaoApi[]>('/veiculos/opcoes/marcas')
      .then(setBrands)
      .catch(() => setBrands([]))
  }, [])

  // Aviso vindo de outra tela (ex.: depois de excluir um veículo na ficha).
  useEffect(() => {
    const state = location.state as { notice?: string } | null
    if (state?.notice) {
      toast.success(state.notice)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  function handleCreated(saved: VeiculoApi, warning?: string) {
    const item = toPatioVehicle(saved)
    if (item) setPatioVehicles((prev) => [item, ...prev])
    setCreating(false)
    if (warning) toast.error(warning)
    else
      toast.success(
        item
          ? 'Veículo adicionado ao pátio.'
          : 'Veículo cadastrado. Com esse status, ele não aparece no pátio.',
      )
  }

  // Quem ainda está no pátio. Os vendidos ficam de fora dos indicadores e de "Todos".
  const inLot = useMemo(() => patioVehicles.filter((v) => v.status !== 'Vendido'), [patioVehicles])

  const counts = useMemo(() => {
    const base: Record<Tab, number> = { Todos: 0, Disponível: 0, Reservado: 0, Preparação: 0, Vendido: 0 }
    for (const vehicle of patioVehicles) {
      if (vehicle.status !== 'Vendido') base.Todos++
      base[vehicle.status]++
    }
    return base
  }, [patioVehicles])

  const totalValue = useMemo(
    () => inLot.reduce((sum, vehicle) => sum + vehicle.price, 0),
    [inLot],
  )

  const averageDays = useMemo(
    () =>
      inLot.length ? Math.round(inLot.reduce((sum, v) => sum + v.daysInLot, 0) / inLot.length) : 0,
    [inLot],
  )

  const staleCount = useMemo(
    () => inLot.filter((v) => v.daysInLot >= staleThresholdDays).length,
    [inLot],
  )

  const freeSpots = lotCapacity - inLot.length

  const filtered = useMemo(() => {
    let list = tab === 'Todos' ? inLot : patioVehicles.filter((v) => v.status === tab)

    if (brandFilter) list = list.filter((v) => String(v.brandId) === brandFilter)

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.plate.toLowerCase().includes(q) ||
          v.vaga.toLowerCase().includes(q),
      )
    }

    const ordenar: Partial<Record<SortKey, (a: PatioVehicle, b: PatioVehicle) => number>> = {
      az: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      za: (a, b) => b.name.localeCompare(a.name, 'pt-BR'),
      'dias-desc': (a, b) => b.daysInLot - a.daysInLot,
      'dias-asc': (a, b) => a.daysInLot - b.daysInLot,
      'km-desc': (a, b) => b.km - a.km,
      'km-asc': (a, b) => a.km - b.km,
    }
    const comparar = ordenar[sort]
    if (comparar) list = [...list].sort(comparar)

    return list
  }, [patioVehicles, inLot, tab, query, sort, brandFilter])

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
          <strong className="kpi-value">{loading ? <KpiSkeleton width={60} /> : inLot.length}</strong>
          <p className="kpi-helper">Capacidade de {lotCapacity} vagas</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Valor imobilizado</h3>
            <span className="trend-badge trend-neutral">Tabela</span>
          </div>
          <strong className="kpi-value">{loading ? <KpiSkeleton /> : currency.format(totalValue)}</strong>
          <p className="kpi-helper">Soma do preço de tabela</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Permanência média</h3>
            <span className={`trend-badge ${averageDays <= targetAverageDays ? 'trend-up' : 'trend-down'}`}>
              {averageDays <= targetAverageDays ? 'Na meta' : 'Fora da meta'}
            </span>
          </div>
          <strong className="kpi-value">{loading ? <KpiSkeleton width={80} /> : `${averageDays} dias`}</strong>
          <p className="kpi-helper">Meta interna: até {targetAverageDays} dias</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Parados há {staleThresholdDays}+ dias</h3>
            <span className={`trend-badge ${staleCount > 0 ? 'trend-down' : 'trend-up'}`}>
              {staleCount > 0 ? 'Atenção' : 'Ok'}
            </span>
          </div>
          <strong className="kpi-value">{loading ? <KpiSkeleton width={40} /> : staleCount}</strong>
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
              {tabLabel[t]}
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
          <div className="patio-brand-filter">
            <SearchableSelect
              value={brandFilter}
              onChange={(value) => {
                setBrandFilter(value)
                setPage(1)
              }}
              options={[{ value: '', label: 'Todas as marcas' }, ...brands.map((b) => ({ value: String(b.id), label: b.nome }))]}
              placeholder="Todas as marcas"
              disabled={brands.length === 0}
            />
          </div>
          <div className="patio-sort" ref={sortRef}>
            <button
              type="button"
              className={`btn btn-outline ${sort !== 'padrao' ? 'active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((v) => !v)}
            >
              <ArrowUpDown size={16} />
              {sort === 'padrao' ? 'Ordenar' : sortOptions.find((o) => o.value === sort)?.label}
            </button>
            {sortOpen && (
              <div className="patio-sort-menu" role="menu">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sort === option.value}
                    className={sort === option.value ? 'active' : ''}
                    onClick={() => {
                      setSort(option.value)
                      setSortOpen(false)
                      setPage(1)
                    }}
                  >
                    {option.label}
                    {sort === option.value && <Check size={14} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
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

        {loading &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card vehicle-card" aria-hidden="true">
              <Skeleton width="40%" height={12} />
              <Skeleton width="70%" height={20} style={{ marginTop: 10 }} />
              <Skeleton width="55%" height={12} style={{ marginTop: 8 }} />
              <Skeleton height={150} radius={12} style={{ marginTop: 14 }} />
              <div className="skeleton-stack" style={{ marginTop: 14 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="45%" height={14} />
              </div>
            </div>
          ))}

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