import { useState } from 'react'
import { ChevronDown, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Pagination } from '../components/Pagination'
import { products } from './estoqueData'
import './Estoque.css'

const PAGE_SIZE = 12

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export default function Estoque() {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(products.length / PAGE_SIZE)
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="estoque-page">
      <div className="toolbar">
        <div className="toolbar-left">
          <button type="button" className="icon-btn" aria-label="Buscar produto">
            <Search size={18} />
          </button>
          <button type="button" className="select-btn">
            Categorias
            <ChevronDown size={16} />
          </button>
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
                <td>{product.quantity}</td>
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
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={products.length}
        pageSize={PAGE_SIZE}
        itemLabel="produtos"
        onPageChange={setPage}
      />
    </div>
  )
}
