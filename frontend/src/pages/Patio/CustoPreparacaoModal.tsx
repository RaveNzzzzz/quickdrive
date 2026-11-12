import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { Skeleton } from '../../components/Skeleton'
import type { CustoPreparacaoApi, LoteApi, ProdutoApi } from '../../types'
import { currencyCents } from '../../utils/format'
import { numeroParaValor, valorDigitado, valorParaNumero } from './veiculoLimites'
import './Veiculo.css'

type Props = {
  veiculoId: number
  onClose: () => void
  onSaved: (custo: CustoPreparacaoApi) => void
}

// Uma linha de "produto utilizado". `unitario` fica vazio até o usuário escolher o produto
// (aí recebe o valor cadastrado, que pode ser alterado).
type Linha = { key: number; produtoId: string; quantidade: string; unitario: string }

type ProdutoEstoque = ProdutoApi & { disponivel: number }

function hojeIso(): string {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

const arredondar = (valor: number) => Math.round(valor * 100) / 100

export function CustoPreparacaoModal({ veiculoId, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const [nome, setNome] = useState('')
  const [data, setData] = useState(hojeIso())
  const [servico, setServico] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [proximaChave, setProximaChave] = useState(1)
  const [estoque, setEstoque] = useState<ProdutoEstoque[] | null>(null)
  const [estoqueErro, setEstoqueErro] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Produtos do estoque com a quantidade disponível (soma dos lotes).
  useEffect(() => {
    let active = true
    Promise.all([api<ProdutoApi[]>('/estoque/produtos'), api<LoteApi[]>('/estoque/lotes')])
      .then(([produtos, lotes]) => {
        if (!active) return
        const disponivel = new Map<number, number>()
        for (const lote of lotes) disponivel.set(lote.produto_id, (disponivel.get(lote.produto_id) ?? 0) + lote.quantidade)
        setEstoque(
          produtos
            .map((p) => ({ ...p, disponivel: disponivel.get(p.id) ?? 0 }))
            .filter((p) => p.disponivel > 0),
        )
      })
      .catch((err: Error) => {
        if (active) setEstoqueErro(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  const porId = useMemo(() => new Map((estoque ?? []).map((p) => [p.id, p])), [estoque])

  const totalProdutos = linhas.reduce((soma, l) => soma + (Number(l.quantidade) || 0) * valorParaNumero(l.unitario), 0)
  const totalServico = valorParaNumero(servico)
  const total = arredondar(totalProdutos + totalServico)

  function atualizar(key: number, parcial: Partial<Linha>) {
    setLinhas((atual) => atual.map((l) => (l.key === key ? { ...l, ...parcial } : l)))
  }

  function escolherProduto(key: number, produtoId: string) {
    const produto = porId.get(Number(produtoId))
    atualizar(key, {
      produtoId,
      quantidade: '1',
      unitario: produto?.valor_unitario != null ? numeroParaValor(Number(produto.valor_unitario)) : '',
    })
  }

  function adicionarLinha() {
    setLinhas((atual) => [...atual, { key: proximaChave, produtoId: '', quantidade: '1', unitario: '' }])
    setProximaChave((n) => n + 1)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const descricao = nome.trim().replace(/\s+/g, ' ')
    if (!descricao) return setError('Informe a descrição do procedimento.')
    if (!data) return setError('Informe a data.')

    for (const linha of linhas) {
      const produto = porId.get(Number(linha.produtoId))
      const quantidade = Number(linha.quantidade)
      if (!produto) return setError('Escolha o produto em todas as linhas ou remova as linhas vazias.')
      if (!Number.isSafeInteger(quantidade) || quantidade < 1) return setError(`Informe a quantidade de ${produto.nome}.`)
      if (quantidade > produto.disponivel) {
        return setError(`Só há ${produto.disponivel} de ${produto.nome} em estoque.`)
      }
    }
    if (total <= 0) return setError('Informe o valor do serviço ou ao menos um produto com valor.')

    setError('')
    setSaving(true)
    try {
      const salvo = await api<CustoPreparacaoApi>(`/veiculos/${veiculoId}/custos-preparacao`, {
        method: 'POST',
        body: JSON.stringify({
          nome: descricao,
          custo: totalServico,
          data,
          produtos: linhas.map((l) => ({
            produto_id: Number(l.produtoId),
            quantidade: Number(l.quantidade),
            valor_unitario: valorParaNumero(l.unitario),
          })),
        }),
      })
      onSaved(salvo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o procedimento.')
      setSaving(false)
    }
  }

  const escolhidos = new Set(linhas.map((l) => l.produtoId))

  return (
    <Modal
      title="Adicionar procedimento"
      size="lg"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="vform-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Adicionar'}
          </button>
        </>
      }
    >
      <form id={formId} className="vform" onSubmit={submit}>
        <div className="vform-field">
          <label htmlFor={`${uid}-nome`}>Descrição do procedimento</label>
          <input
            id={`${uid}-nome`}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            maxLength={100}
            placeholder="Ex.: Polimento e higienização"
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        <div className="vform-grid">
          <div className="vform-field">
            <label htmlFor={`${uid}-servico`}>Valor do serviço (R$)</label>
            <input
              id={`${uid}-servico`}
              value={servico}
              onChange={(event) => setServico(valorDigitado(event.target.value))}
              inputMode="numeric"
              placeholder="0,00 (mão de obra, sem os produtos)"
              autoComplete="off"
            />
          </div>
          <div className="vform-field">
            <label htmlFor={`${uid}-data`}>Data</label>
            <input
              id={`${uid}-data`}
              type="date"
              value={data}
              max={hojeIso()}
              onChange={(event) => setData(event.target.value)}
              required
            />
          </div>
        </div>

        <fieldset>
          <legend>Produtos do estoque utilizados (opcional)</legend>

          {estoque === null && !estoqueErro && (
            <div className="skeleton-stack" aria-label="Carregando estoque">
              <Skeleton height={40} radius={10} />
            </div>
          )}
          {estoqueErro && <p className="vform-error">Não foi possível carregar o estoque: {estoqueErro}</p>}
          {estoque && estoque.length === 0 && <p className="vform-hint">Não há produtos com saldo no estoque.</p>}

          {linhas.length > 0 && (
            <ul className="proc-linhas">
              {linhas.map((linha) => {
                const produto = porId.get(Number(linha.produtoId))
                const subtotal = arredondar((Number(linha.quantidade) || 0) * valorParaNumero(linha.unitario))
                return (
                  <li key={linha.key} className="proc-linha">
                    <div className="vform-field proc-produto">
                      <label htmlFor={`${uid}-p-${linha.key}`}>Produto</label>
                      <select
                        id={`${uid}-p-${linha.key}`}
                        value={linha.produtoId}
                        onChange={(event) => escolherProduto(linha.key, event.target.value)}
                      >
                        <option value="">Selecione</option>
                        {(estoque ?? [])
                          .filter((p) => !escolhidos.has(String(p.id)) || String(p.id) === linha.produtoId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} — {p.disponivel} em estoque
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="vform-field">
                      <label htmlFor={`${uid}-q-${linha.key}`}>Quantidade</label>
                      <input
                        id={`${uid}-q-${linha.key}`}
                        type="number"
                        min={1}
                        max={produto?.disponivel}
                        step={1}
                        value={linha.quantidade}
                        onChange={(event) => atualizar(linha.key, { quantidade: event.target.value })}
                      />
                    </div>
                    <div className="vform-field">
                      <label htmlFor={`${uid}-v-${linha.key}`}>Valor unitário (R$)</label>
                      <input
                        id={`${uid}-v-${linha.key}`}
                        value={linha.unitario}
                        onChange={(event) => atualizar(linha.key, { unitario: valorDigitado(event.target.value) })}
                        inputMode="numeric"
                        placeholder="0,00"
                        autoComplete="off"
                      />
                    </div>
                    <div className="proc-subtotal" aria-live="polite">
                      <span>Subtotal</span>
                      <strong>{currencyCents.format(subtotal)}</strong>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setLinhas((atual) => atual.filter((l) => l.key !== linha.key))}
                      aria-label="Remover produto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={adicionarLinha}
            disabled={estoque === null || estoque.length === 0 || linhas.length >= estoque.length}
          >
            <Plus size={16} />
            Adicionar produto
          </button>
        </fieldset>

        <div className="proc-total" aria-live="polite">
          <div>
            <span>Serviço</span>
            <strong>{currencyCents.format(totalServico)}</strong>
          </div>
          <div>
            <span>Produtos</span>
            <strong>{currencyCents.format(arredondar(totalProdutos))}</strong>
          </div>
          <div className="proc-total-geral">
            <span>Custo total do procedimento</span>
            <strong>{currencyCents.format(total)}</strong>
          </div>
        </div>
        {linhas.length > 0 && <p className="vform-hint">Os produtos saem do estoque ao salvar (os lotes que vencem primeiro).</p>}
      </form>
    </Modal>
  )
}
