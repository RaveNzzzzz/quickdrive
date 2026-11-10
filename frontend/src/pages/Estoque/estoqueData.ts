import type { CategoriaProdutoApi, LoteApi, ProdutoApi } from '../../types'
import { currencyCents } from '../../utils/format'

export type Product = ProdutoApi & { category: string; quantity: number; lots: LoteApi[] }

export function stockValue(products: Product[]) {
  let cents = 0n
  let priced = 0
  let missing = 0
  for (const product of products) {
    if (!product.quantity) continue
    if (product.valor_unitario == null) {
      missing += 1
      continue
    }
    const [reais, fraction = ''] = product.valor_unitario.split('.')
    const unitCents = BigInt(reais) * 100n + BigInt(fraction.padEnd(2, '0'))
    cents += unitCents * BigInt(product.quantity)
    priced += 1
  }
  const formatted = currencyCents.formatToParts(cents / 100n)
    .map(part => part.type === 'fraction' ? String(cents % 100n).padStart(2, '0') : part.value)
    .join('')
  return { value: missing && !priced ? '—' : formatted, missing }
}

export function toProducts(products: ProdutoApi[], categories: CategoriaProdutoApi[], lots: LoteApi[]): Product[] {
  return products.map((product) => {
    const productLots = lots.filter((lot) => lot.produto_id === product.id)
    return {
      ...product,
      category: categories.find((category) => category.id === product.categoria_id)?.nome ?? 'Categoria indisponível',
      quantity: productLots.reduce((sum, lot) => sum + lot.quantidade, 0),
      lots: productLots,
    }
  })
}
