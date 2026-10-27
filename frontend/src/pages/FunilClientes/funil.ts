import type { EtapaApi } from '../../types'

/** A partir de quantos dias na mesma etapa a negociação conta como parada (o backend usa o mesmo: DIAS_PARADA). */
export const staleThresholdDays = 8

/** Vendidas e perdidas aparecem no quadro por este número de dias depois de encerradas. */
export const diasEncerradas = 30

/** Período usado nos indicadores do topo (conversão, tempo médio, motivo de perda). */
export const diasIndicadores = 90

/** Quantos cartões cada coluna mostra antes do "Mostrar mais" (e quantos a mais a cada clique). */
export const cartoesPorColuna = 8
/** Vendido e Perdido são só para consulta: mostram menos. */
export const cartoesPorColunaEncerrada = 5

export type Etapa = {
  id: EtapaApi
  title: string
  helper: string
  /** Cor da bolinha da coluna (sempre uma variável do index.css). */
  color: string
}

export const etapas: Etapa[] = [
  { id: 'interesse', title: 'Interesse', helper: 'Primeiro contato', color: 'var(--text-muted)' },
  { id: 'test_drive', title: 'Test drive', helper: 'Agendado ou feito', color: 'color-mix(in srgb, var(--accent) 45%, var(--surface))' },
  { id: 'negociacao', title: 'Negociação', helper: 'Proposta na mesa', color: 'var(--accent)' },
  { id: 'credito', title: 'Crédito', helper: 'Em análise', color: 'var(--warning)' },
  { id: 'vendido', title: 'Vendido', helper: `Últimos ${diasEncerradas} dias`, color: 'var(--success)' },
  { id: 'perdido', title: 'Perdido', helper: `Últimos ${diasEncerradas} dias`, color: 'var(--danger)' },
]

export const etapaTitulo = Object.fromEntries(etapas.map((e) => [e.id, e.title])) as Record<EtapaApi, string>

export const etapasAbertas: EtapaApi[] = ['interesse', 'test_drive', 'negociacao', 'credito']

export const ehAberta = (etapa: EtapaApi) => etapasAbertas.includes(etapa)

// Mesmos valores de OrigemNegociacao (backend/sales/enums.py).
export const origens = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site próprio' },
  { value: 'loja', label: 'Loja física' },
  { value: 'olx', label: 'Portal OLX' },
  { value: 'webmotors', label: 'Portal Webmotors' },
  { value: 'outro', label: 'Outro' },
]

export const origemLabel: Record<string, string> = Object.fromEntries(origens.map((o) => [o.value, o.label]))

// Mesmos valores de MotivoPerda (backend/sales/enums.py).
export const motivosPerda = [
  { value: 'preco', label: 'Preço' },
  { value: 'credito', label: 'Crédito negado' },
  { value: 'concorrente', label: 'Comprou em outro lugar' },
  { value: 'desistiu', label: 'Desistiu da compra' },
  { value: 'sem_retorno', label: 'Sem retorno' },
  { value: 'outro', label: 'Outro' },
]

export const motivoLabel: Record<string, string> = Object.fromEntries(motivosPerda.map((m) => [m.value, m.label]))

const UM_DIA = 86_400_000

/** Dias inteiros desde uma data/hora ISO até agora (0 = hoje). */
export function diasDesde(iso: string, agora = Date.now()) {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / UM_DIA))
}

/** "AAAA-MM-DD" -> "DD/MM" */
export function diaMes(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}
