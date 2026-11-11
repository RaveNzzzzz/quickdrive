import { useRef, useState } from 'react'
import { Contrast, Moon, Sun } from 'lucide-react'
import { useDismiss } from './useDismiss'
import { THEMES, useTheme, type Theme } from '../utils/theme'

const ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, contrast: Contrast }

/** Botão da barra superior para escolher o tema (claro, escuro ou alto contraste). */
export function ThemeMenu() {
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const Current = ICONS[theme]

  return (
    <div className="topbar-menu-wrap" ref={ref}>
      <button
        type="button"
        className="topbar-icon-btn"
        aria-label="Tema do sistema"
        aria-expanded={open}
        title="Tema do sistema"
        onClick={() => setOpen((v) => !v)}
      >
        <Current size={18} />
      </button>

      {open && (
        <div className="topbar-dropdown topbar-theme-menu" role="menu">
          <div className="topbar-dropdown-header">
            <strong>Tema</strong>
          </div>
          <div className="topbar-theme-options">
            {THEMES.map(({ value, label }) => {
              const Icon = ICONS[value]
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === value}
                  className={`topbar-theme-btn ${theme === value ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(value)
                    setOpen(false)
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
