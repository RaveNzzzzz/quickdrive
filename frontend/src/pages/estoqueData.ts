export type Product = {
  id: number
  name: string
  category: string
  unitPrice: number
  quantity: number
}

const page1: Omit<Product, 'id'>[] = [
  { name: 'Shampoo 2L', category: 'Limpeza', unitPrice: 189, quantity: 3 },
  { name: 'Estepe', category: 'Peça', unitPrice: 215, quantity: 6 },
  { name: 'Cheiro Eucalipto', category: 'Limpeza', unitPrice: 22, quantity: 15 },
  { name: 'Revitalizador de Pneus 1.5L', category: 'Manutenção', unitPrice: 74.9, quantity: 3 },
  { name: 'Shampoo 2L', category: 'Limpeza', unitPrice: 189, quantity: 3 },
  { name: 'Estepe', category: 'Peça', unitPrice: 215, quantity: 6 },
  { name: 'Cheiro Eucalipto', category: 'Limpeza', unitPrice: 22, quantity: 15 },
  { name: 'Shampoo 2L', category: 'Limpeza', unitPrice: 74.9, quantity: 3 },
  { name: 'Revitalizador de Pneus 1.5L', category: 'Manutenção', unitPrice: 189, quantity: 3 },
  { name: 'Estepe', category: 'Peça', unitPrice: 215, quantity: 6 },
  { name: 'Cheiro Eucalipto', category: 'Limpeza', unitPrice: 22, quantity: 15 },
  { name: 'Revitalizador de Pneus 1.5L', category: 'Manutenção', unitPrice: 74.9, quantity: 3 },
]

export const products: Product[] = Array.from({ length: 30 }, (_, i) => {
  const item = page1[i % page1.length]
  return { id: i + 1, ...item }
})
