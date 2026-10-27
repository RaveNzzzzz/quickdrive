// Mesmos valores de FormaPagamento (backend/sales/enums.py). Se mudar lá, mude aqui.
export const formasPagamento = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'consorcio', label: 'Consórcio' },
]

export const formaPagamentoLabel: Record<string, string> = Object.fromEntries(
  formasPagamento.map((f) => [f.value, f.label]),
)
