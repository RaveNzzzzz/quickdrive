import { useMemo, useState } from 'react'
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import { products } from './estoqueData'
import './Estoque.css'

const PAGE_SIZE = 12
const LOW_STOCK = 3

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const categories = [...new Set(products.map((p) => p.category))].sort()

export default function Estoque() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)

  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0)
  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0)
  const lowStock = products.filter((p) => p.quantity <= LOW_STOCK)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!onlyLow || p.quantity <= LOW_STOCK) &&
        (!q || p.name.toLowerCase().includes(q)),
    )
  }, [query, category, onlyLow])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="estoque-page">
      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Itens cadastrados</h3>
          </div>
          <strong className="kpi-value">{products.length}</strong>
          <p className="kpi-helper">Em {categories.length} categorias</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Unidades em estoque</h3>
          </div>
          <strong className="kpi-value">{totalUnits}</strong>
          <p className="kpi-helper">Soma de todas as quantidades</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Valor em estoque</h3>
          </div>
          <strong className="kpi-value">{currency.format(totalValue)}</strong>
          <p className="kpi-helper">Valor unitário × quantidade</p>
        </div>

        <button
          type="button"
          className={`card kpi-card estoque-kpi-low ${onlyLow ? 'active' : ''}`}
          onClick={() => {
            setOnlyLow((v) => !v)
            setPage(1)
          }}
        >
          <div className="kpi-card-header">
            <h3>Estoque baixo</h3>
            <span className={`trend-badge ${lowStock.length ? 'trend-down' : 'trend-up'}`}>
              {lowStock.length ? 'Repor' : 'Ok'}
            </span>
          </div>
          <strong className="kpi-value">{lowStock.length}</strong>
          <p className="kpi-helper">
            {onlyLow ? 'Mostrando só esses itens · clique para limpar' : `Até ${LOW_STOCK} unidades · clique para filtrar`}
          </p>
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <label className="estoque-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar produto"
            />
          </label>
          <select
            className="estoque-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button type="button" className="btn btn-outline">
            Ver Categorias
          </button>
          <button type="button" className="btn btn-primary">
            <Plus size={16} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Valor unitário</th>
              <th>Quantidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((product) => (
              <tr key={product.id}>
                <td>
                  <span className="product-cell">
                    <span className="product-icon">
                      <Package size={16} />
                    </span>
                    {product.name}
                  </span>
                </td>
                <td>{product.category}</td>
                <td>{currency.format(product.unitPrice)}</td>
                <td>
                  <span className="estoque-qty">
                    {product.quantity}
                    {product.quantity <= LOW_STOCK && <span className="estoque-low">Baixo</span>}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="row-action row-action-edit"
                      aria-label={`Editar ${product.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="row-action row-action-delete"
                      aria-label={`Excluir ${product.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="estoque-empty">
                  Nenhum produto encontrado para esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="produtos"
        onPageChange={setPage}
      />
    </div>
  )
}
