import { useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useDismiss } from './useDismiss'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  const name = user?.username ?? 'Usuário'
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="topbar-menu-wrap" ref={ref}>
      <button type="button" className="topbar-user" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="topbar-avatar">{initial}</span>
        <div>
          <strong>{name}</strong>
          <p>Administrador</p>
        </div>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="topbar-dropdown topbar-user-menu">
          <div className="topbar-dropdown-header">
            <div>
              <strong>{name}</strong>
              {user?.email && <p>{user.email}</p>}
            </div>
          </div>
          <button type="button" className="topbar-menu-item topbar-menu-danger" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
