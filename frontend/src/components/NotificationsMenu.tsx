import { useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { alerts } from '../pages/Home/homeData'
import { useDismiss } from './useDismiss'

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<number[]>([])
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  const unread = alerts.filter((a) => !readIds.includes(a.id))

  return (
    <div className="topbar-menu-wrap" ref={ref}>
      <button
        className="topbar-icon-btn"
        aria-label={`Notificações${unread.length ? `, ${unread.length} não lidas` : ''}`}
        aria-expanded={open}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread.length > 0 && <span className="topbar-badge">{unread.length}</span>}
      </button>

      {open && (
        <div className="topbar-dropdown topbar-notifications">
          <div className="topbar-dropdown-header">
            <strong>Notificações</strong>
            {unread.length > 0 && (
              <button type="button" className="topbar-link" onClick={() => setReadIds(alerts.map((a) => a.id))}>
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul>
            {alerts.map((alert) => (
              <li key={alert.id} className={readIds.includes(alert.id) ? 'read' : ''}>
                <span className={`alert-dot alert-dot-${alert.level}`} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.subtitle}</p>
                </div>
              </li>
            ))}
          </ul>

          {unread.length === 0 && <p className="topbar-dropdown-empty">Tudo em dia por aqui.</p>}
        </div>
      )}
    </div>
  )
}
