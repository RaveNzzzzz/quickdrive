import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { staleThresholdDays } from '../pages/Patio/patioData'
import type { AlertaApi } from '../types'

/** Alertas do pátio calculados pela API (usados no card da Home e no sino do topo). */
export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaApi[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    // Manda o mesmo limite de "parado" da tela do Pátio, para os números baterem.
    api<AlertaApi[]>(`/veiculos/alertas?dias=${staleThresholdDays}`)
      .then((data) => {
        if (active) setAlertas(data)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  return { alertas, error }
}

/** Para onde o alerta leva ao clicar: a ficha do veículo, o pátio, ou nenhum lugar. */
export function alertaLink(alerta: AlertaApi): string | null {
  if (alerta.veiculo_id !== null) return `/patio/${alerta.veiculo_id}`
  if (alerta.tipo === 'parados') return '/patio'
  return null
}

/** Identifica o alerta para marcar como lido. Muda quando o texto muda (ex.: 2 → 3 veículos). */
export const alertaKey = (alerta: AlertaApi) => `${alerta.tipo}:${alerta.titulo}`
