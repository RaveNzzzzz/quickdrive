import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { dismissToast, subscribeToasts, type ToastItem } from '../utils/toast'
import './Toast.css'

/** Renderiza os avisos na tela. Fica uma vez só, em main.tsx. */
export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => subscribeToasts(setItems), [])

  return (
    <div className="toast-viewport" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          className={`toast toast-${item.kind}`}
          role={item.kind === 'error' ? 'alert' : 'status'}
        >
          {item.kind === 'success' ? <CircleCheck size={20} aria-hidden="true" /> : <CircleAlert size={20} aria-hidden="true" />}
          <p>{item.message}</p>
          <button type="button" onClick={() => dismissToast(item.id)} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
