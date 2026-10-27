import type { ContaPagarApi, ContaReceberApi } from '../../types'

export type ContaKind = 'receber' | 'pagar'

export type Conta = {
  /** Único na tela: uma conta a receber e uma a pagar podem ter o mesmo id no banco. */
  key: string
  id: number
  kind: ContaKind
  /** Id da receita (conta a receber) ou da despesa (conta a pagar). */
  parentId: number
  description: string
  note: string
  category: string
  amount: number
  dueDate: string // YYYY-MM-DD
  paidAt: string | null // YYYY-MM-DD
}

// A API devolve as contas em dois formatos; a tela trabalha com um só.
export function fromContaReceber(conta: ContaReceberApi): Conta {
  return {
    key: `receber-${conta.id}`,
    id: conta.id,
    kind: 'receber',
    parentId: conta.receita_id,
    description: conta.descricao,
    note: conta.receita,
    category: conta.categoria,
    amount: conta.valor,
    dueDate: conta.data_vencimento,
    paidAt: conta.data_recebimento,
  }
}

export function fromContaPagar(conta: ContaPagarApi): Conta {
  return {
    key: `pagar-${conta.id}`,
    id: conta.id,
    kind: 'pagar',
    parentId: conta.despesa_id,
    description: conta.descricao,
    note: conta.despesa,
    category: conta.categoria,
    amount: conta.valor,
    dueDate: conta.data_vencimento,
    paidAt: conta.data_pagamento,
  }
}

/** Caminho da conta na API, ex.: /financeiro/contas-receber/3 */
export function contaPath(conta: Conta) {
  return `/financeiro/contas-${conta.kind}/${conta.id}`
}

export function todayIso() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export type ContaStatus = 'pago' | 'atrasado' | 'hoje' | 'pendente'

export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export const currencyCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const currencyCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function toUtc(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Positive when `iso` is after `today`
export function daysFrom(today: string, iso: string) {
  return Math.round((toUtc(iso) - toUtc(today)) / 86_400_000)
}

export function statusOf(conta: Conta, today: string): ContaStatus {
  if (conta.paidAt) return 'pago'
  const diff = daysFrom(today, conta.dueDate)
  if (diff < 0) return 'atrasado'
  if (diff === 0) return 'hoje'
  return 'pendente'
}

export function statusLabel(status: ContaStatus, kind: ContaKind) {
  switch (status) {
    case 'pago':
      return kind === 'receber' ? 'Recebido' : 'Pago'
    case 'atrasado':
      return 'Atrasado'
    case 'hoje':
      return 'Vence hoje'
    default:
      return 'Pendente'
  }
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function dueHint(conta: Conta, today: string) {
  if (conta.paidAt) return `${conta.kind === 'receber' ? 'Recebido' : 'Pago'} em ${formatDate(conta.paidAt).slice(0, 5)}`
  const diff = daysFrom(today, conta.dueDate)
  if (diff === 0) return 'vence hoje'
  if (diff === 1) return 'vence amanhã'
  if (diff > 1) return `em ${diff} dias`
  return diff === -1 ? '1 dia em atraso' : `${-diff} dias em atraso`
}

export type DateRange = { from: string; to: string }

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function inRange(iso: string, range: DateRange) {
  return iso >= range.from && iso <= range.to
}

// The period of the same length right before `range`
export function previousRange(range: DateRange): DateRange {
  const length = daysFrom(range.from, range.to) + 1
  const to = addDays(range.from, -1)
  return { from: addDays(to, -(length - 1)), to }
}

export function sum(list: Conta[]) {
  return list.reduce((total, c) => total + c.amount, 0)
}

// Unpaid first (earliest due date on top, so overdue leads), then paid ones
export function sortContas(list: Conta[]) {
  return [...list].sort((a, b) => {
    if (!!a.paidAt !== !!b.paidAt) return a.paidAt ? 1 : -1
    return a.dueDate.localeCompare(b.dueDate)
  })
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
