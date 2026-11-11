import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'contrast'

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'contrast', label: 'Alto contraste' },
]

const STORAGE_KEY = 'quickdrive-theme'
const listeners = new Set<() => void>()

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'contrast'
}

function readStored(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    // localStorage bloqueado (aba anônima etc.): segue com o padrão.
  }
  return 'light'
}

let current: Theme = readStored()

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

/** Aplica o tema salvo. Chamado uma vez ao iniciar (o index.html também aplica antes da página aparecer). */
export function initTheme() {
  apply(current)
}

export function setTheme(theme: Theme) {
  current = theme
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // sem persistência, mas o tema vale nesta sessão.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, () => current)
  return [theme, setTheme]
}
