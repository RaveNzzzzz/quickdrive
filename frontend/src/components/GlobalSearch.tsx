import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '../api/client'
import type { Paginated, VeiculoApi, ProdutoApi, CategoriaProdutoApi } from '../types'
import { listFuncionarios } from '../pages/Funcionarios/funcionariosData'

import { navItems } from './navigation'
import { useAuth } from '../auth/AuthContext'

type Result = {
  key: string
  group: string
  title: string
  subtitle: string
  path: string
}

// Veículos e produtos vêm da API sempre que a busca abre.
type VehiclesState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; items: Result[] }

const pageResults: Result[] = navItems.map((item) => ({
  key: `page-${item.path}`,
  group: 'Páginas',
  title: item.label,
  subtitle: item.description,
  path: item.path,
}))

function toVehicleResult(v: VeiculoApi): Result {
  return {
    key: `patio-${v.id}`,
    group: 'Pátio',
    title: `${v.marca} ${v.modelo}`,
    subtitle: [v.placa, v.vaga].filter(Boolean).join(' · '),
    path: `/patio/${v.id}`,
  }
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type GlobalSearchProps = {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { user } = useAuth()
  const canManage = !!user?.pode_gerenciar
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [vehicles, setVehicles] = useState<VehiclesState>({ status: 'loading' })
  const [stock, setStock] = useState<VehiclesState>({ status: 'loading' })
  const [team, setTeam] = useState<VehiclesState>({ status: 'loading' })

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    let ignore = false
    api<Paginated<VeiculoApi>>('/veiculos?limit=1000')
      .then((data) => {
        if (!ignore) setVehicles({ status: 'ok', items: data.items.map(toVehicleResult) })
      })
      .catch(() => {
        if (!ignore) setVehicles({ status: 'error' })
      })
    Promise.all([api<ProdutoApi[]>('/estoque/produtos'), api<CategoriaProdutoApi[]>('/estoque/categorias')])
      .then(([products, categories]) => {
        if (!ignore) setStock({ status: 'ok', items: products.map(p => ({
          key: `estoque-${p.id}`, group: 'Estoque', title: p.nome,
          subtitle: categories.find(c => c.id === p.categoria_id)?.nome ?? '', path: '/estoque',
        })) })
      }).catch(() => { if (!ignore) setStock({ status: 'error' }) })
    if (canManage) listFuncionarios().then(employees => {
      if (!ignore) setTeam({ status: 'ok', items: employees.map(e => ({
        key: `func-${e.id}`, group: 'Funcionários', title: e.pessoa.nome,
        subtitle: `${e.cargo.nome} · ${e.cargo.setor.nome}`, path: '/funcionarios',
      })) })
    }).catch(() => { if (!ignore) setTeam({ status: 'error' }) })
    return () => {
      ignore = true
    }
  }, [open, canManage])

  const results = useMemo(() => {
    const q = normalize(query.trim())
    const pages = pageResults.filter(r => canManage || !['/financeiro', '/funcionarios'].includes(r.path))
    if (!q) return pages
    const vehicleResults = vehicles.status === 'ok' ? vehicles.items : []
    return [...pages, ...vehicleResults, ...(stock.status === 'ok' ? stock.items : []), ...(canManage && team.status === 'ok' ? team.items : [])]
      .filter((r) => normalize(`${r.title} ${r.subtitle} ${r.group}`).includes(q))
      .slice(0, 8)
  }, [query, vehicles, stock, team, canManage])

  if (!open) return null

  function close() {
    setQuery('')
    setActive(0)
    setVehicles({ status: 'loading' })
    setStock({ status: 'loading' })
    setTeam({ status: 'loading' })
    onClose()
  }

  function go(result: Result) {
    navigate(result.path)
    close()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) go(results[active])
  }

  return (
    <div className="gsearch-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="gsearch" role="dialog" aria-modal="true" aria-label="Busca global">
        <label className="gsearch-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, veículos, produtos ou funcionários"
          />
          <kbd>Esc</kbd>
        </label>

        <ul className="gsearch-results">
          {results.map((result, index) => (
            <li key={result.key}>
              <button
                type="button"
                className={index === active ? 'active' : ''}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(result)}
              >
                <span className="gsearch-group">{result.group}</span>
                <span className="gsearch-title">{result.title}</span>
                <span className="gsearch-subtitle">{result.subtitle}</span>
              </button>
            </li>
          ))}
          {query.trim() && vehicles.status === 'loading' && (
            <li className="gsearch-empty">Carregando veículos…</li>
          )}
          {query.trim() && vehicles.status === 'error' && (
            <li className="gsearch-empty">Não foi possível carregar os veículos.</li>
          )}
          {query.trim() && stock.status === 'loading' && <li className="gsearch-empty">Carregando produtos…</li>}
          {query.trim() && stock.status === 'error' && <li className="gsearch-empty">Não foi possível carregar os produtos.</li>}
          {canManage && query.trim() && team.status === 'loading' && <li className="gsearch-empty">Carregando funcionários…</li>}
          {canManage && query.trim() && team.status === 'error' && <li className="gsearch-empty">Não foi possível carregar os funcionários.</li>}
          {results.length === 0 && <li className="gsearch-empty">Nada encontrado para "{query}".</li>}
        </ul>
      </div>
    </div>
  )
}
