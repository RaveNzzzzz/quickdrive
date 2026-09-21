export type Kpi = {
  label: string
  value: number
  trend: number
  helper: string
}

export const kpis: Kpi[] = [
  { label: 'Compras', value: 255990, trend: -20.34, helper: 'vs. Julho/2026' },
  { label: 'Vendas', value: 430540, trend: 15.76, helper: 'vs. Julho/2026' },
]

export const metaMensal = 450000

export const caixa = {
  label: 'Caixa',
  value: 1230126,
  trend: 4.57,
  entradas: 430000,
  saidas: 255000,
}

export type ChartPoint = {
  month: string
  compras: number
  vendas: number
}

export const chartData: ChartPoint[] = [
  { month: 'Jan', compras: 42, vendas: 68 },
  { month: 'Fev', compras: 38, vendas: 30 },
  { month: 'Mar', compras: 68, vendas: 45 },
  { month: 'Abr', compras: 40, vendas: 62 },
  { month: 'Mai', compras: 55, vendas: 48 },
  { month: 'Jun', compras: 82, vendas: 60 },
  { month: 'Jul', compras: 45, vendas: 35 },
  { month: 'Ago', compras: 88, vendas: 40 },
  { month: 'Set', compras: 62, vendas: 45 },
  { month: 'Out', compras: 65, vendas: 90 },
]

export type PatioVehicle = {
  id: number
  name: string
}

export const patioVehicles: PatioVehicle[] = [
  { id: 1, name: 'Audi A5 S' },
  { id: 2, name: 'Porsche 718 Cayman S' },
  { id: 3, name: 'Porsche 718 Cayman S' },
]

export type Alert = {
  id: number
  level: 'danger' | 'warning'
  title: string
  subtitle: string
}

export const alerts: Alert[] = [
  {
    id: 1,
    level: 'danger',
    title: '3 veículos há +60 dias no pátio',
    subtitle: 'Considere revisar o preço',
  },
  {
    id: 2,
    level: 'warning',
    title: 'Manutenção pendente',
    subtitle: 'Porsche 718 Cayman S · placa QDX-1122',
  },
]

export type Transaction = {
  id: number
  client: string
  vehicle: string
  seller: string
  value: number
  status: 'Pago' | 'Pendente'
  date: string
}

export const transactions: Transaction[] = [
  {
    id: 1,
    client: 'Marcos Vinícius',
    vehicle: 'Audi A5 S Line',
    seller: 'Rafael B.',
    value: 189900,
    status: 'Pago',
    date: '13/08',
  },
  {
    id: 2,
    client: 'Camila Ferraz',
    vehicle: 'Porsche 718 Cayman S',
    seller: 'Julia L.',
    value: 412300,
    status: 'Pendente',
    date: '12/08',
  },
  {
    id: 3,
    client: 'Eduardo Nascimento',
    vehicle: 'BMW X1 sDrive20i',
    seller: 'Rafael B.',
    value: 228450,
    status: 'Pago',
    date: '10/08',
  },
  {
    id: 4,
    client: 'Bianca Souza',
    vehicle: 'Jeep Compass Limited',
    seller: 'Tiago M.',
    value: 174900,
    status: 'Pendente',
    date: '09/08',
  },
]
