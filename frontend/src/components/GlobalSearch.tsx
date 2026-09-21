import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { employees } from '../pages/Funcionarios/funcionariosData'
import { products } from '../pages/Estoque/estoqueData'
import { patioVehicles } from '../pages/Patio/patioData'
import { navItems } from './navigation'

type Result = {
  key: string
  group: string
  title: string
  subtitle: string
  path: string
}

const allResults: Result[] = [
  ...navItems.map((item) => ({
    key: `page-${item.path}`,
    group: 'Páginas',
    title: item.label,
    subtitle: item.description,
    path: item.path,
  })),
  ...patioVehicles.map((v) => ({
    key: `patio-${v.id}`,
    group: 'Pátio',
    title: v.name,
    subtitle: `${v.plate} · ${v.vaga}`,
    path: '/patio',
  })),
  ...[...new Map(products.map((p) => [p.name, p])).values()].map((p) => ({
    key: `estoque-${p.id}`,
    group: 'Estoque',
    title: p.name,
    subtitle: p.category,
    path: '/estoque',
  })),
  ...employees.map((e) => ({
    key: `func-${e.id}`,
    group: 'Funcionários',
    title: e.name,
    subtitle: `${e.position} · ${e.sector}`,
    path: '/funcionarios',
  })),
]

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type GlobalSearchProps = {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return allResults.filter((r) => r.group === 'Páginas')
    return allResults
      .filter((r) => normalize(`${r.title} ${r.subtitle} ${r.group}`).includes(q))
      .slice(0, 8)
  }, [query])

  if (!open) return null

  function close() {
    setQuery('')
    setActive(0)
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
          {results.length === 0 && <li className="gsearch-empty">Nada encontrado para "{query}".</li>}
        </ul>
      </div>
    </div>
  )
}
