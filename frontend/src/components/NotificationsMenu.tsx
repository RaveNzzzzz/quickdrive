import { SkeletonText } from './Skeleton'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { alertaKey, alertaLink, useAlertas } from '../hooks/useAlertas'
import { useDismiss } from './useDismiss'

const READ_KEYS_STORAGE = 'quickdrive:notificacoes-lidas'

function lerLidas(): string[] {
  try {
    const salvo = localStorage.getItem(READ_KEYS_STORAGE)
    return salvo ? (JSON.parse(salvo) as string[]) : []
  } catch {
    return []
  }
}

function salvarLidas(keys: string[]) {
  try {
    localStorage.setItem(READ_KEYS_STORAGE, JSON.stringify(keys))
  } catch {
    // Sem localStorage (aba privada, etc.): só não persiste entre recarregamentos.
  }
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [readKeys, setReadKeys] = useState<string[]>(lerLidas)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  const { alertas, error } = useAlertas()
  const lista = alertas ?? []
  const unread = lista.filter((a) => !readKeys.includes(alertaKey(a)))

  function marcarLida(key: string) {
    setReadKeys((prev) => {
      if (prev.includes(key)) return prev
      const proximo = [...prev, key]
      salvarLidas(proximo)
      return proximo
    })
  }

  function marcarTodasLidas() {
    const proximo = lista.map(alertaKey)
    setReadKeys(proximo)
    salvarLidas(proximo)
  }

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
              <button type="button" className="topbar-link" onClick={marcarTodasLidas}>
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul>
            {lista.map((alerta) => {
              const link = alertaLink(alerta)
              const key = alertaKey(alerta)
              const conteudo = (
                <>
                  <span className={`alert-dot alert-dot-${alerta.nivel}`} />
                  <div>
                    <strong>{alerta.titulo}</strong>
                    <p>{alerta.subtitulo}</p>
                  </div>
                </>
              )
              return (
                <li
                  key={key}
                  className={readKeys.includes(key) ? 'read' : ''}
                  onClick={() => marcarLida(key)}
                >
                  {link ? (
                    <Link to={link} className="topbar-notification-link" onClick={() => setOpen(false)}>
                      {conteudo}
                    </Link>
                  ) : (
                    conteudo
                  )}
                </li>
              )
            })}
          </ul>

          {error ? (
            <p className="topbar-dropdown-empty">Não foi possível carregar as notificações.</p>
          ) : alertas === null ? (
            <div className="topbar-dropdown-empty" aria-label="Carregando notificações">
              <SkeletonText lines={3} />
            </div>
          ) : (
            unread.length === 0 && <p className="topbar-dropdown-empty">Tudo em dia por aqui.</p>
          )}
        </div>
      )}
    </div>
  )
}
