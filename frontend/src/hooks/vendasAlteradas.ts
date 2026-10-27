import { useEffect, useState } from 'react'

// Aviso entre telas: quando uma venda é criada, editada ou excluída, quem mostra totais de vendas
// (como a barra de meta da Sidebar) busca os dados de novo, sem precisar recarregar a página.
const EVENTO = 'quickdrive:vendas-alteradas'

export function avisarVendasAlteradas() {
  window.dispatchEvent(new Event(EVENTO))
}

/** Número que aumenta a cada aviso. Use como dependência do useEffect que busca as vendas. */
export function useVersaoVendas() {
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    const aumentar = () => setVersao((v) => v + 1)
    window.addEventListener(EVENTO, aumentar)
    return () => window.removeEventListener(EVENTO, aumentar)
  }, [])
  return versao
}
