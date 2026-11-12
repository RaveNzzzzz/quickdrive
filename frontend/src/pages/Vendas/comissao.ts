import { currencyCents } from '../../utils/format'

const percentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Valor da comissão: valor da venda x percentual do vendedor, arredondado em centavos. */
export function valorComissao(valorVenda: number, percentualComissao: number): number {
  return Math.round(valorVenda * percentualComissao) / 100
}

/** "2,5%" */
export function formatarPercentual(percentualComissao: number): string {
  return `${percentual.format(percentualComissao)}%`
}

/** "2,5% · R$ 3.250,00" (vazio quando faltam dados). */
export function resumoComissao(valorVenda: number, percentualComissao: number | null | undefined): string {
  if (percentualComissao == null || !Number.isFinite(percentualComissao) || !Number.isFinite(valorVenda) || valorVenda <= 0) {
    return '—'
  }
  return `${formatarPercentual(percentualComissao)} · ${currencyCents.format(valorComissao(valorVenda, percentualComissao))}`
}
