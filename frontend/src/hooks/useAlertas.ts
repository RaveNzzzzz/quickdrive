import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { staleThresholdDays } from '../pages/Patio/patioData'
import type { AlertaApi } from '../types'

// Aviso entre telas: o funil chama avisarAlertasMudaram() depois de mexer numa negociação,
// e o sino do topo / card da Home buscam os alertas de novo.
const EVENTO = 'quickdrive:alertas-mudaram'

export function avisarAlertasMudaram() {
  window.dispatchEvent(new Event(EVENTO))
}

/** Alertas do pátio e do funil calculados pela API (usados no card da Home e no sino do topo). */
export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaApi[] | null>(null)
  const [error, setError] = useState('')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    const aumentar = () => setVersao((v) => v + 1)
    window.addEventListener(EVENTO, aumentar)
    return () => window.removeEventListener(EVENTO, aumentar)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      // Manda o mesmo limite de "parado" da tela do Pátio, para os números baterem.
      api<AlertaApi[]>(`/veiculos/alertas?dias=${staleThresholdDays}`),
      // Se só os do funil falharem, os do pátio continuam aparecendo.
      api<AlertaApi[]>('/negociacoes/alertas').catch(() => [] as AlertaApi[]),
    ])
      .then(([patio, funil]) => {
        if (!active) return
        setAlertas([...funil, ...patio])
        setError('')
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [versao])

  return { alertas, error }
}

/** Para onde o alerta leva ao clicar: a ficha do veículo, o pátio, o funil, ou nenhum lugar. */
export function alertaLink(alerta: AlertaApi): string | null {
  if (alerta.tipo === 'contato' || alerta.tipo === 'funil_parado') return '/funil'
  if (alerta.veiculo_id !== null) return `/patio/${alerta.veiculo_id}`
  if (alerta.tipo === 'parados') return '/patio'
  return null
}

/** Identifica o alerta para marcar como lido. Muda quando o texto muda (ex.: 2 → 3 veículos). */
export const alertaKey = (alerta: AlertaApi) => `${alerta.tipo}:${alerta.titulo}`
