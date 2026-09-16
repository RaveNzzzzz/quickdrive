import { Search, Bell, ChevronRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

type TopbarProps = {
  title: string
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function Topbar({ title }: TopbarProps) {
  const { user } = useAuth()
  const initial = user?.username?.charAt(0).toUpperCase() ?? '?'

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <nav className="topbar-breadcrumb" aria-label="breadcrumb">
          <span>{title}</span>
          <ChevronRight size={14} />
        </nav>
        <h1>{title}</h1>
        <p className="topbar-date">{capitalize(dateFormatter.format(new Date()))}</p>
      </div>

      <div className="topbar-actions">
        <button className="topbar-icon-btn" aria-label="Buscar" type="button">
          <Search size={18} />
        </button>
        <button className="topbar-icon-btn" aria-label="Notificações" type="button">
          <Bell size={18} />
        </button>
        <div className="topbar-user">
          <span className="topbar-avatar">{initial}</span>
          <div>
            <strong>{user?.username ?? 'Usuário'}</strong>
            <p>Administrador</p>
          </div>
        </div>
      </div>
    </header>
  )
}
