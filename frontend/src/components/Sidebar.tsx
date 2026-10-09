import { NavLink } from 'react-router-dom'
import { kpis, metaMensal } from '../pages/Home/homeData'
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
  const vendido = kpis.find((k) => k.label === 'Vendas')?.value ?? 0
  const progress = Math.min(100, Math.round((vendido / metaMensal) * 100))

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
          {currency.format(vendido)} de {currency.format(metaMensal)}
        </p>
      </div>
    </aside>
  )
}
