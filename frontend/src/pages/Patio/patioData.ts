export type PatioStatus = 'Disponível' | 'Reservado' | 'Preparação'

export type VeiculoApi = {
  id: number
  ano_modelo: number
  data_entrada: string
  quilometragem: number
  status: string
  valor: number
  modelo: string
  placa: string
  motorizacao: string
  vaga: string
  marca: string
  carroceria: string
}

export const lotCapacity = 12
export const staleThresholdDays = 45
export const targetAverageDays = 30

