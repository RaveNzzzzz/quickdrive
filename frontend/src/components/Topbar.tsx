import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { GlobalSearch } from './GlobalSearch'
import { NotificationsMenu } from './NotificationsMenu'
import { UserMenu } from './UserMenu'
import { findPage } from './navigation'
import './Topbar.css'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function Topbar() {
  const { pathname } = useLocation()
  const page = findPage(pathname)
  const title = page?.label ?? 'QuickDrive'
  const isHome = pathname === '/'
  const [searchOpen, setSearchOpen] = useState(false)

  // Ctrl/Cmd + K opens the search from anywhere
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <nav className="topbar-breadcrumb" aria-label="breadcrumb">
          <Link to="/">Home</Link>
          {!isHome && (
            <>
              <ChevronRight size={14} />
              <span aria-current="page">{title}</span>
            </>
          )}
        </nav>
        <h1>{title}</h1>
        <p className="topbar-date">
          {capitalize(dateFormatter.format(new Date()))}
          {page?.description && <span> · {page.description}</span>}
        </p>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-search-btn" onClick={() => setSearchOpen(true)}>
          <Search size={16} />
          Buscar
          <kbd>Ctrl K</kbd>
        </button>
        <NotificationsMenu />
        <UserMenu />
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
