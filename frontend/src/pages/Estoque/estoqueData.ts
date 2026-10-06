import type { CategoriaProdutoApi, LoteApi, ProdutoApi } from '../../types'

export type Product = ProdutoApi & { category: string; quantity: number; lots: LoteApi[] }

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
