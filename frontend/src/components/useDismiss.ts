import { useEffect, type RefObject } from 'react'

// Calls onClose when the user clicks outside `ref` or presses Escape
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [ref, open, onClose])
}
