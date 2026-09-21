export type ContaKind = 'receber' | 'pagar'

export type Conta = {
  id: number
  kind: ContaKind
  description: string
  note: string
  category: string
  amount: number
  dueDate: string // YYYY-MM-DD
  paidAt: string | null // YYYY-MM-DD
}

function isoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIso() {
  return isoDate(new Date())
}

// Sample dates are relative to today so "atrasado" / "vence hoje" always show up
function fromToday(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return isoDate(date)
}

type Seed = Omit<Conta, 'dueDate' | 'paidAt'> & { due: number; paid?: number }

const seeds: Seed[] = [
  // A receber
  { id: 1, kind: 'receber', description: 'Marcos Vinícius', note: 'Financiamento Itaú · parcela 2/12', category: 'Financiamento', amount: 41230, due: -2 },
  { id: 2, kind: 'receber', description: 'Camila Ferraz', note: 'À vista · sinal pago', category: 'À vista', amount: 620200, due: 3 },
  { id: 3, kind: 'receber', description: 'Eduardo Nascimento', note: 'Financiamento Santander · parcela 1/48', category: 'Financiamento', amount: 15630, due: 0 },
  { id: 4, kind: 'receber', description: 'Bianca Souza', note: 'Consórcio contemplado', category: 'Consórcio', amount: 532400, due: -9 },
  { id: 5, kind: 'receber', description: 'Larissa Prado', note: 'Financiamento Santander', category: 'Financiamento', amount: 298000, due: -12, paid: -12 },
  { id: 6, kind: 'receber', description: 'Henrique Lobo', note: 'Financiamento Bradesco · parcela 3/12', category: 'Financiamento', amount: 22100, due: 6 },
  { id: 7, kind: 'receber', description: 'Fernando Klein', note: 'À vista', category: 'À vista', amount: 244900, due: -5, paid: -5 },
  { id: 8, kind: 'receber', description: 'Priscila Andrade', note: 'Financiamento Itaú · parcela 3/12', category: 'Financiamento', amount: 22000, due: 15 },
  { id: 9, kind: 'receber', description: 'Rodrigo Bastos', note: 'Entrada + veículo na troca', category: 'À vista', amount: 141500, due: -35, paid: -35 },
  { id: 10, kind: 'receber', description: 'Juliana Mesquita', note: 'Financiamento BV', category: 'Financiamento', amount: 219000, due: -28, paid: -27 },
  { id: 11, kind: 'receber', description: 'Diego Ramos', note: 'Financiamento Itaú · parcela 1/36', category: 'Financiamento', amount: 18700, due: 33 },
  { id: 12, kind: 'receber', description: 'Otávio Lima', note: 'Consórcio contemplado', category: 'Consórcio', amount: 98000, due: -30 },

  // A pagar
  { id: 13, kind: 'pagar', description: 'Patrimônio Real', note: 'Aluguel do pátio', category: 'Aluguel', amount: 50000, due: -11, paid: -11 },
  { id: 14, kind: 'pagar', description: 'Enel', note: 'Energia', category: 'Contas de consumo', amount: 10000, due: -11, paid: -12 },
  { id: 15, kind: 'pagar', description: 'Lubricar', note: 'Troca de óleo dos veículos', category: 'Manutenção', amount: 20000, due: -14, paid: -14 },
  { id: 16, kind: 'pagar', description: 'DAE', note: 'Água', category: 'Contas de consumo', amount: 15400, due: 2 },
  { id: 17, kind: 'pagar', description: 'Posto Ipiranga', note: 'Combustível', category: 'Combustível', amount: 8300, due: -3 },
  { id: 18, kind: 'pagar', description: 'Lava Rápido Brilho', note: 'Estética e lavagem', category: 'Manutenção', amount: 6750, due: 0 },
  { id: 19, kind: 'pagar', description: 'Meta Ads', note: 'Anúncios', category: 'Marketing', amount: 12000, due: 5 },
  { id: 20, kind: 'pagar', description: 'Kalunga', note: 'Material de escritório', category: 'Administrativo', amount: 2100, due: 8 },
  { id: 21, kind: 'pagar', description: 'Folha de pagamento', note: 'Salários', category: 'Pessoal', amount: 84000, due: 9 },
  { id: 22, kind: 'pagar', description: 'Patrimônio Real', note: 'Aluguel do pátio', category: 'Aluguel', amount: 50000, due: 19 },
  { id: 23, kind: 'pagar', description: 'Enel', note: 'Energia', category: 'Contas de consumo', amount: 10400, due: 20 },
  { id: 24, kind: 'pagar', description: 'Patrimônio Real', note: 'Aluguel do pátio', category: 'Aluguel', amount: 50000, due: -42, paid: -42 },
  { id: 25, kind: 'pagar', description: 'Folha de pagamento', note: 'Salários', category: 'Pessoal', amount: 84000, due: -21, paid: -21 },
  { id: 26, kind: 'pagar', description: 'Meta Ads', note: 'Anúncios', category: 'Marketing', amount: 9500, due: -18, paid: -18 },
]

export const initialContas: Conta[] = seeds.map(({ due, paid, ...conta }) => ({
  ...conta,
  dueDate: fromToday(due),
  paidAt: paid === undefined ? null : fromToday(paid),
}))
