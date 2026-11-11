// Avisos rápidos (toasts) no canto superior direito. Pode ser chamado de qualquer lugar,
// inclusive fora de componentes (ex.: api/client.ts):  toast.success('Salvo!')  /  toast.error('Falhou')

export type ToastKind = 'success' | 'error'

export type ToastItem = { id: number; kind: ToastKind; message: string }

type Listener = (items: ToastItem[]) => void

const DURATION: Record<ToastKind, number> = { success: 4000, error: 6500 }
const MAX_VISIBLE = 4

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function emit() {
  listeners.forEach((listener) => listener(items))
}

export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  items = items.filter((item) => item.id !== id)
  emit()
}

function show(kind: ToastKind, message: string) {
  const text = message.trim()
  if (!text) return

  // A mesma mensagem já na tela só reinicia o tempo (evita pilha de avisos repetidos).
  const existing = items.find((item) => item.kind === kind && item.message === text)
  if (existing) {
    clearTimeout(timers.get(existing.id))
    timers.set(existing.id, setTimeout(() => dismissToast(existing.id), DURATION[kind]))
    return
  }

  const item: ToastItem = { id: nextId++, kind, message: text }
  items = [...items, item].slice(-MAX_VISIBLE)
  timers.set(item.id, setTimeout(() => dismissToast(item.id), DURATION[kind]))
  emit()
}

export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  listener(items)
  return () => {
    listeners.delete(listener)
  }
}
