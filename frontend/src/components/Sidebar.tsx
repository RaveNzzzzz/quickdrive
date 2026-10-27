import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { api } from '../api/client'
import { useVersaoVendas } from '../hooks/vendasAlteradas'
import { todayIso } from '../pages/Financeiro/financeiroUtils'
import { metaFaturamento } from '../pages/Vendas/metas'
import type { Paginated, VendaApi } from '../types'
import { navGroups } from './navigation'
import './Sidebar.css'
import { useAuth } from '../auth/AuthContext'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())

export function Sidebar() {
  const { user } = useAuth()
  const visibleGroups = navGroups.map(group => ({ ...group, items: group.items.filter(item =>
    user?.pode_gerenciar || !['/financeiro', '/funcionarios'].includes(item.path)) })).filter(group => group.items.length)
  // null enquanto carrega
  const [vendido, setVendido] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const versaoVendas = useVersaoVendas()

  useEffect(() => {
    let active = true
    const mes = todayIso().slice(0, 7) // "AAAA-MM"
    api<Paginated<VendaApi>>('/vendas?status=pago&limit=1000')
      .then((data) => {
        if (!active) return
        const doMes = data.items.filter((v) => v.data_venda.startsWith(mes))
        setVendido(doMes.reduce((total, v) => total + v.valor_venda, 0))
        setError(false)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [versaoVendas])

  const progress = Math.min(100, Math.round(((vendido ?? 0) / metaFaturamento) * 100))

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-badge">QD</span>
        <div>
          <strong>QuickDrive</strong>
          <p>Gestor de Estacionamentos</p>
        </div>
      </div>

      <nav>
        {visibleGroups.map((group) => (
          <div key={group.title} className="sidebar-group">
            <span className="sidebar-group-title">{group.title}</span>
            {group.items.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-goal">
        <span>Meta de {monthName}</span>
        <strong>{progress}%</strong>
        <div className="sidebar-goal-bar">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p>
          {error
            ? 'Não foi possível carregar as vendas'
            : vendido === null
              ? 'Carregando…'
              : `${currency.format(vendido)} de ${currency.format(metaFaturamento)}`}
        </p>
      </div>
    </aside>
  )
}
