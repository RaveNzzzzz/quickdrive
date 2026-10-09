import { useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useDismiss } from './useDismiss'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  const name = user?.username ?? 'Usuário'
  const cargo = user?.funcionario?.cargo
  const roleLabels = { COMUM: 'Comum', GERENTE: 'Gerente', ADMINISTRADOR: 'Administrador' }
  const role = cargo?.nome || (cargo ? roleLabels[cargo.papel_acesso] : user?.pode_gerenciar ? 'Administrador' : 'Usuário')
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="topbar-menu-wrap" ref={ref}>
      <button type="button" className="topbar-user" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="topbar-avatar">{initial}</span>
        <div>
          <strong>{name}</strong>
          <p>{role}</p>
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
          <button
            type="button"
            className="topbar-menu-item"
            onClick={() => {
              setOpen(false)
              navigate('/perfil')
            }}
          >
            <UserRound size={16} />
            Meu perfil
          </button>
          <button type="button" className="topbar-menu-item topbar-menu-danger" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
