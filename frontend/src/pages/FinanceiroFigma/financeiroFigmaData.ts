export type Conta = {
  id: number
  name: string
  note: string
  value: number
  tag: string
  date: string
}

export const contasAReceber: Conta[] = [
  { id: 1, name: 'Marcos Vinícius', note: 'Financiamento Itaú', value: 412300, tag: 'Cliente', date: '10/08' },
  { id: 2, name: 'Camila Ferraz', note: 'À vista · sinal pago', value: 620200, tag: 'Pendente', date: '13/08' },
  { id: 3, name: 'Eduardo Nascimento', note: 'Financiamento Santander', value: 156300, tag: 'Cliente', date: '09/08' },
  { id: 4, name: 'Bianca Souza', note: 'Consórcio contemplado', value: 532400, tag: 'Cliente', date: '05/08' },
  { id: 5, name: 'Larissa Prado', note: 'Financiamento Santander', value: 298000, tag: 'Cliente', date: '04/08' },
  { id: 6, name: 'Henrique Lobo', note: 'Financiamento Bradesco', value: 265000, tag: 'Cliente', date: '02/08' },
  { id: 7, name: 'Fernando Klein', note: 'À vista', value: 244900, tag: 'Cliente', date: '30/07' },
  { id: 8, name: 'Priscila Andrade', note: 'Financiamento Itaú', value: 220000, tag: 'Cliente', date: '28/07' },
]

export const contasAPagar: Conta[] = [
  { id: 1, name: 'Patrimônio real', note: 'Aluguel', value: 50000, tag: 'Fixa', date: '10/08' },
  { id: 2, name: 'Enel', note: 'Energia', value: 10000, tag: 'Fixa', date: '10/08' },
  { id: 3, name: 'Lubricar', note: 'Óleo', value: 20000, tag: 'Variável', date: '07/08' },
  { id: 4, name: 'DAE', note: 'Água', value: 15400, tag: 'Fixa', date: '10/08' },
  { id: 5, name: 'Posto Ipiranga', note: 'Combustível', value: 8300, tag: 'Variável', date: '06/08' },
  { id: 6, name: 'Lava Rápido Brilho', note: 'Estética e lavagem', value: 6750, tag: 'Variável', date: '05/08' },
  { id: 7, name: 'Meta Ads', note: 'Anúncios', value: 12000, tag: 'Variável', date: '03/08' },
  { id: 8, name: 'Kalunga', note: 'Material de escritório', value: 2100, tag: 'Variável', date: '01/08' },
]

export const kpiTrend = 4.57
