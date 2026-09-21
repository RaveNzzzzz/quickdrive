import { isoFromToday } from '../../utils/format'

export type VendaStatus = 'Pago' | 'Pendente' | 'Cancelada'

export type Venda = {
  id: number
  client: string
  note: string
  vehicle: string
  plate: string
  seller: string
  value: number
  status: VendaStatus
  date: string // YYYY-MM-DD
}

export const metaFaturamento = 450000
export const metaVendasFechadas = 9

export const sellers = ['Rafael B.', 'Júlia L.', 'Marina P.', 'Tiago M.']

type Seed = Omit<Venda, 'date'> & { daysAgo: number }

// Dates are relative to today so the period filters always have data
const seeds: Seed[] = [
  { id: 1, client: 'Marcos Vinícius', note: 'Financiamento Itaú', vehicle: 'Audi A5 S Line', plate: 'QDX-1122', seller: 'Júlia L.', value: 189900, status: 'Pago', daysAgo: 1 },
  { id: 2, client: 'Camila Ferraz', note: 'À vista · sinal pago', vehicle: 'Porsche 718 Cayman S', plate: 'QDA-4471', seller: 'Rafael B.', value: 412300, status: 'Pago', daysAgo: 4 },
  { id: 3, client: 'Eduardo Nascimento', note: 'Financiamento Santander', vehicle: 'BMW X1 sDrive20i', plate: 'QDE-9032', seller: 'Tiago M.', value: 228450, status: 'Pendente', daysAgo: 5 },
  { id: 4, client: 'Bianca Souza', note: 'Consórcio contemplado', vehicle: 'Toyota Corolla Altis', plate: 'QDT-7719', seller: 'Marina P.', value: 174900, status: 'Pago', daysAgo: 7 },
  { id: 5, client: 'Larissa Prado', note: 'Financiamento Santander', vehicle: 'Range Rover Evoque', plate: 'QDR-3308', seller: 'Marina P.', value: 298000, status: 'Pendente', daysAgo: 9 },
  { id: 6, client: 'Henrique Lobo', note: 'Financiamento Bradesco', vehicle: 'Volvo XC60 Inscription', plate: 'QDV-5560', seller: 'Rafael B.', value: 265000, status: 'Pago', daysAgo: 12 },
  { id: 7, client: 'Fernando Klein', note: 'À vista', vehicle: 'Mercedes GLA 200', plate: 'QDM-2245', seller: 'Rafael B.', value: 244900, status: 'Pago', daysAgo: 15 },
  { id: 8, client: 'Priscila Andrade', note: 'Financiamento Itaú', vehicle: 'Audi Q5 2.0 TFSI', plate: 'QDA-5521', seller: 'Júlia L.', value: 220000, status: 'Cancelada', daysAgo: 18 },
  { id: 9, client: 'Rodrigo Bastos', note: 'Entrada + troca', vehicle: 'Chevrolet Tracker Premier', plate: 'QDT-8842', seller: 'Tiago M.', value: 141500, status: 'Pago', daysAgo: 22 },
  { id: 10, client: 'Juliana Mesquita', note: 'Financiamento BV', vehicle: 'Audi Q3 Prestige', plate: 'QDA-6190', seller: 'Marina P.', value: 219000, status: 'Pendente', daysAgo: 26 },
  { id: 11, client: 'Diego Ramos', note: 'Financiamento Itaú', vehicle: 'Jeep Compass Limited', plate: 'QDJ-6633', seller: 'Tiago M.', value: 174900, status: 'Pago', daysAgo: 33 },
  { id: 12, client: 'Otávio Lima', note: 'Consórcio contemplado', vehicle: 'VW Nivus Highline', plate: 'QDN-1207', seller: 'Júlia L.', value: 129900, status: 'Pago', daysAgo: 41 },
  { id: 13, client: 'Renata Kubitschek', note: 'À vista', vehicle: 'Honda Civic Si', plate: 'QDC-4456', seller: 'Rafael B.', value: 149900, status: 'Pago', daysAgo: 48 },
  { id: 14, client: 'Danilo Ferraz', note: 'Financiamento Santander', vehicle: 'BMW 320i', plate: 'QDB-7741', seller: 'Marina P.', value: 189900, status: 'Cancelada', daysAgo: 55 },
  { id: 15, client: 'Ronaldo Cordeiro', note: 'À vista', vehicle: 'VW Polo GTS', plate: 'QDP-3312', seller: 'Tiago M.', value: 98500, status: 'Pago', daysAgo: 70 },
  { id: 16, client: 'Transportadora Way LTDA', note: 'Frota · 3 veículos', vehicle: 'Toyota Hilux SRX', plate: 'QDH-9087', seller: 'Júlia L.', value: 258700, status: 'Pago', daysAgo: 85 },
]

export const vendas: Venda[] = seeds.map(({ daysAgo, ...venda }) => ({
  ...venda,
  date: isoFromToday(-daysAgo),
}))

// Monthly revenue for the year chart (in R$)
export const faturamentoMensal = [
  { month: 'Jan', value: 512000 },
  { month: 'Fev', value: 176000 },
  { month: 'Mar', value: 331000 },
  { month: 'Abr', value: 208000 },
  { month: 'Mai', value: 418000 },
  { month: 'Jun', value: 112000 },
  { month: 'Jul', value: 578000 },
  { month: 'Ago', value: 154000 },
  { month: 'Set', value: 430540 },
  { month: 'Out', value: 0 },
  { month: 'Nov', value: 0 },
  { month: 'Dez', value: 0 },
]
