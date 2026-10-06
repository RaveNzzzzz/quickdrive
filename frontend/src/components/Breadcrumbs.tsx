import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './Breadcrumbs.css'

type Crumb = { label: string; to?: string }

// Nome de cada seção, igual ao que aparece na Sidebar.
const SECTION_LABELS: Record<string, string> = {
  estoque: 'Estoque',
  patio: 'Pátio',
  vendas: 'Vendas',
  clientes: 'Clientes',
  funil: 'Funil de Clientes',
  financeiro: 'Financeiro',
  funcionarios: 'Funcionários',
}

// Nome da tela de detalhe de cada seção (ex.: /patio/12).
const DETAIL_LABELS: Record<string, string> = {
  patio: 'Ficha do veículo',
}

function buildTrail(pathname: string): Crumb[] {
  const [section, detailId] = pathname.split('/').filter(Boolean)

  if (!section) return [{ label: 'Home' }]

  const trail: Crumb[] = [{ label: 'Home', to: '/' }]
  const sectionLabel = SECTION_LABELS[section] ?? section

  if (detailId) {
    trail.push({ label: sectionLabel, to: `/${section}` })
    trail.push({ label: DETAIL_LABELS[section] ?? 'Detalhes' })
  } else {
    trail.push({ label: sectionLabel })
  }

  return trail
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const trail = buildTrail(pathname)

  return (
    <nav className="breadcrumbs" aria-label="Você está em">
      <ol>
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1
          return (
            <li key={crumb.label}>
              {crumb.to && !isLast ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
              )}
              {!isLast && <ChevronRight size={12} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}