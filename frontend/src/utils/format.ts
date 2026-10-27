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

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : (parts[0]?.charAt(1) ?? '')
  return (first + last).toUpperCase()
}

function isoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// YYYY-MM-DD for today shifted by `offsetDays` (negative = past)
export function isoFromToday(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return isoDate(date)
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Positive when `iso` is after today
export function daysFromToday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const today = new Date()
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((Date.UTC(y, m - 1, d) - utcToday) / 86_400_000)
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function formatPercent(change: number) {
  return `${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')}%`
}

// Downloads rows as a CSV file (semicolon-separated so Excel in pt-BR opens it correctly)
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const content = [header, ...rows].map((row) => row.map(escape).join(';')).join('\n')
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Deixa só os números (o backend guarda telefone, CPF, CNPJ e CEP assim). */
export const soDigitos = (texto: string) => texto.replace(/\D/g, '')

/** "11987654321" -> "(11) 98765-4321" */
export function formatarTelefone(telefone: string) {
  if (telefone.length === 11) return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
  if (telefone.length === 10) return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`
  return telefone
}

/** CPF (11 dígitos) ou CNPJ (14 dígitos) com pontos, barra e traço. */
export function formatarDocumento(documento: string) {
  if (documento.length === 11) return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (documento.length === 14) return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return documento
}
