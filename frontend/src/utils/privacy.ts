import { useSyncExternalStore } from 'react'

// "Ocultar valores": esconde os números de dinheiro da tela (útil para mostrar a tela a outras pessoas).
// A escolha fica salva no navegador.

const STORAGE_KEY = 'quickdrive-hide-values'
const listeners = new Set<() => void>()

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

let hidden = readStored()

export function setValoresOcultos(value: boolean) {
  hidden = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // sem persistência: vale só nesta sessão.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useValoresOcultos(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => hidden)
  return [value, setValoresOcultos]
}

export const MASCARA_VALOR = 'R$ ••••'

/** Devolve o texto do valor, ou a máscara quando os valores estão ocultos. */
export function mascarar(texto: string, oculto: boolean): string {
  return oculto ? MASCARA_VALOR : texto
}
