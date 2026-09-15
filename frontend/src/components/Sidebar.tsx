import { NavLink } from 'react-router-dom'
import {
  Home,
  Package,
  Car,
  ShoppingCart,
  Users,
  Filter,
  Wallet,
  UserCog,
} from 'lucide-react'

type NavItem = {
  label: string
  path: string
  icon: React.ComponentType<{ size?: number }>
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Visão Geral',
    items: [{ label: 'Home', path: '/', icon: Home }],
  },
  {
    title: 'Veículos',
    items: [
      { label: 'Estoque', path: '/estoque', icon: Package },
      { label: 'Pátio', path: '/patio', icon: Car },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { label: 'Vendas', path: '/vendas', icon: ShoppingCart },
      { label: 'Clientes', path: '/clientes', icon: Users },
      { label: 'Funil de Clientes', path: '/funil', icon: Filter },
    ],
  },
  {
    title: 'Finanças',
    items: [{ label: 'Financeiro', path: '/financeiro', icon: Wallet }],
  },
  {
    title: 'Equipe',
    items: [{ label: 'Funcionários', path: '/funcionarios', icon: UserCog }],
  },
]

export function Sidebar() {
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
        {navGroups.map((group) => (
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
    </aside>
  )
}