import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toProducts } from '../src/pages/Estoque/estoqueData.ts'

const products = [
  { id: 1, nome: 'Shampoo', especificacao: '', categoria_id: 1 },
  { id: 2, nome: 'Estepe', especificacao: '', categoria_id: 2 },
]
const categories = [{ id: 1, nome: 'Limpeza' }, { id: 2, nome: 'Peça' }]

test('saldo soma apenas lotes do produto, incluindo lotes sem validade e zerados', () => {
  const lots = [
    { id: 1, produto_id: 1, numero_lote: 'A', quantidade: 5, data_validade: null },
    { id: 2, produto_id: 1, numero_lote: 'B', quantidade: 3, data_validade: '2027-01-01' },
    { id: 3, produto_id: 2, numero_lote: 'A', quantidade: 20, data_validade: null },
    { id: 4, produto_id: 1, numero_lote: 'C', quantidade: 0, data_validade: null },
  ]
  const rows = toProducts(products, categories, lots)
  assert.equal(rows[0].quantity, 8)
  assert.equal(rows[0].lots.length, 3)
  assert.equal(rows[1].quantity, 20)
  assert.equal(rows[0].category, 'Limpeza')
  // Remover um lote precisa reduzir o saldo, sem afetar outro produto.
  const afterDelete = toProducts(products, categories, lots.filter(l => l.id !== 1))
  assert.equal(afterDelete[0].quantity, 3)
  assert.equal(afterDelete[1].quantity, 20)
})

test('produto sem lote tem saldo zero e categoria ausente tem indicação explícita', () => {
  const rows = toProducts(products, [], [])
  assert.equal(rows[0].quantity, 0)
  assert.deepEqual(rows[0].lots, [])
  assert.equal(rows[0].category, 'Categoria indisponível')
  assert.deepEqual(toProducts([], categories, []), [])
})
