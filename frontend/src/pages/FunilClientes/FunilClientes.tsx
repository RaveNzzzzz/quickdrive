import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Modal } from '../../components/Modal'
import { avisarAlertasMudaram } from '../../hooks/useAlertas'
import type { EtapaApi, NegociacaoApi, Paginated } from '../../types'
import { currency } from '../../utils/format'
import { todayIso } from '../Financeiro/financeiroUtils'
import {
  cartoesPorColuna,
  cartoesPorColunaEncerrada,
  diasDesde,
  diasEncerradas,
  diasIndicadores,
  ehAberta,
  etapas,
  motivoLabel,
  origens,
} from './funil'
import { NegociacaoCard } from './NegociacaoCard'
import { NegociacaoFormModal } from './NegociacaoFormModal'
import { PerdaModal } from './PerdaModal'
import { RegistrarVenda } from './RegistrarVenda'
import './FunilClientes.css'

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (value >= 1000) return `R$ ${Math.round(value / 1000)} mil`
  return currency.format(value)
}

/** Valor usado nas somas: a proposta ou, sem ela, o preço anunciado do carro. */
const valorDe = (n: NegociacaoApi) => n.valor_proposta ?? n.veiculo_valor ?? 0

type Editor = { negociacao?: NegociacaoApi; etapa?: EtapaApi }

export default function FunilClientes() {
  const { user } = useAuth()
  const gerente = !!user?.pode_gerenciar
  const meuId = user?.funcionario?.id ?? null
  const hoje = todayIso()

  const [negociacoes, setNegociacoes] = useState<NegociacaoApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [actionError, setActionError] = useState('')

  const [query, setQuery] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [origem, setOrigem] = useState('')
  // Quem não é gerente começa vendo só as próprias negociações (mas pode ver as de todos).
  const [somenteMinhas, setSomenteMinhas] = useState(!gerente && meuId !== null)
  // Quantos cartões cada coluna mostra agora (sem valor = o padrão). Muda com "Mostrar mais/menos".
  const [limites, setLimites] = useState<Partial<Record<EtapaApi, number>>>({})

  const [editor, setEditor] = useState<Editor | null>(null)
  const [perda, setPerda] = useState<NegociacaoApi | null>(null)
  const [registrando, setRegistrando] = useState<NegociacaoApi | null>(null)
  const [exclusao, setExclusao] = useState<NegociacaoApi | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [exclusaoErro, setExclusaoErro] = useState('')

  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overEtapa, setOverEtapa] = useState<EtapaApi | null>(null)
  const [overCardId, setOverCardId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    // Busca as abertas + as encerradas no período dos indicadores (as colunas mostram só as mais recentes).
    api<Paginated<NegociacaoApi>>(`/negociacoes?limit=1000&encerradas_dias=${diasIndicadores}`)
      .then((data) => {
        if (active) setNegociacoes(data.items)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt])

  const podeEditar = (n: NegociacaoApi) => gerente || n.funcionario_id === meuId

  const limitePadrao = (etapa: EtapaApi) => (ehAberta(etapa) ? cartoesPorColuna : cartoesPorColunaEncerrada)
  const limiteDe = (etapa: EtapaApi) => limites[etapa] ?? limitePadrao(etapa)

  /** Troca um filtro e recolhe as colunas (a lista mudou, então começa de novo do topo). */
  function filtrar<T>(setter: (valor: T) => void) {
    return (valor: T) => {
      setter(valor)
      setLimites({})
    }
  }

  // Vendedores que aparecem no filtro (tirados das próprias negociações, sem precisar da lista de funcionários).
  const vendedores = useMemo(() => {
    const mapa = new Map(negociacoes.map((n) => [n.funcionario_id, n.funcionario]))
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [negociacoes])

  // Filtros de vendedor e origem valem para o quadro e para os indicadores; a busca, só para o quadro.
  const filtradas = useMemo(
    () =>
      negociacoes.filter(
        (n) =>
          (!somenteMinhas || n.funcionario_id === meuId) &&
          (!vendedor || String(n.funcionario_id) === vendedor) &&
          (!origem || n.origem === origem),
      ),
    [negociacoes, somenteMinhas, meuId, vendedor, origem],
  )

  const visiveis = useMemo(() => {
    const q = query.trim().toLowerCase()
    return filtradas.filter(
      (n) =>
        (ehAberta(n.etapa) || diasDesde(n.etapa_desde) <= diasEncerradas) &&
        (!q ||
          n.nome.toLowerCase().includes(q) ||
          (n.veiculo ?? '').toLowerCase().includes(q) ||
          (n.veiculo_placa ?? '').toLowerCase().includes(q) ||
          n.funcionario.toLowerCase().includes(q)),
    )
  }, [filtradas, query])

  const indicadores = useMemo(() => {
    const abertas = filtradas.filter((n) => ehAberta(n.etapa))
    const vendidas = filtradas.filter((n) => n.etapa === 'vendido')
    const perdidas = filtradas.filter((n) => n.etapa === 'perdido')
    const encerradas = vendidas.length + perdidas.length
    const motivos = new Map<string, number>()
    for (const p of perdidas) motivos.set(p.motivo_perda, (motivos.get(p.motivo_perda) ?? 0) + 1)
    const principal = [...motivos.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      abertas: abertas.length,
      emAberto: abertas.reduce((s, n) => s + valorDe(n), 0),
      conversao: encerradas ? Math.round((vendidas.length / encerradas) * 100) : null,
      encerradas,
      // Do cadastro da negociação até entrar em "Vendido".
      tempoMedio: vendidas.length
        ? Math.round(
            vendidas.reduce((s, n) => s + diasDesde(n.created_at, new Date(n.etapa_desde).getTime()), 0) /
              vendidas.length,
          )
        : null,
      motivo: principal ? { label: motivoLabel[principal[0]] ?? principal[0], vezes: principal[1] } : null,
    }
  }, [filtradas])

  function atualizar(n: NegociacaoApi) {
    setNegociacoes((prev) => (prev.some((x) => x.id === n.id) ? prev.map((x) => (x.id === n.id ? n : x)) : [...prev, n]))
    avisarAlertasMudaram()
  }

  function recarregar() {
    setLoading(true)
    setError('')
    setAttempt((v) => v + 1)
  }

  /** Move na tela na hora (para o arrastar parecer instantâneo) e depois confirma na API. */
  async function mover(n: NegociacaoApi, etapa: EtapaApi, antesDe: number | null, motivo?: string) {
    setActionError('')
    setNegociacoes((prev) => {
      const resto = prev.filter((x) => x.id !== n.id)
      const movida = { ...n, etapa, etapa_desde: n.etapa === etapa ? n.etapa_desde : new Date().toISOString() }
      const indice = antesDe === null ? -1 : resto.findIndex((x) => x.id === antesDe)
      if (indice === -1) resto.push(movida)
      else resto.splice(indice, 0, movida)
      return resto
    })
    try {
      const salva = await api<NegociacaoApi>(`/negociacoes/${n.id}/mover`, {
        method: 'POST',
        body: JSON.stringify({ etapa, antes_de: antesDe, motivo_perda: motivo ?? null }),
      })
      setNegociacoes((prev) => prev.map((x) => (x.id === salva.id ? salva : x)))
      avisarAlertasMudaram()
    } catch (err) {
      setActionError(`Não foi possível mover "${n.nome}": ${(err as Error).message}`)
      recarregar() // volta o quadro para o que está salvo no banco
      throw err
    }
  }

  /** Decide o que fazer quando o cartão vai para uma etapa (pelo arrastar ou pelo menu). */
  function levarPara(n: NegociacaoApi, etapa: EtapaApi, antesDe: number | null = null) {
    if (n.etapa === 'vendido') {
      setActionError('Esta negociação já virou venda. Para reabrir, cancele a venda na tela de Vendas.')
      return
    }
    if (etapa === 'vendido') return setRegistrando(n)
    if (etapa === 'perdido' && n.etapa !== 'perdido') return setPerda(n)
    mover(n, etapa, antesDe).catch(() => {})
  }

  async function excluir() {
    if (!exclusao) return
    setExcluindo(true)
    try {
      await api<null>(`/negociacoes/${exclusao.id}`, { method: 'DELETE' })
      setNegociacoes((prev) => prev.filter((x) => x.id !== exclusao.id))
      setExclusao(null)
      setEditor(null)
      avisarAlertasMudaram()
    } catch (err) {
      setExclusaoErro((err as Error).message)
    } finally {
      setExcluindo(false)
    }
  }

  function pedirExclusao(n: NegociacaoApi) {
    setExclusaoErro('')
    setExclusao(n)
  }

  // --- Arrastar e soltar ---

  function endDrag() {
    setDraggingId(null)
    setOverEtapa(null)
    setOverCardId(null)
  }

  function handleDragStart(e: DragEvent, id: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(id))
    setDraggingId(id)
  }

  function handleColumnDragOver(e: DragEvent, etapa: EtapaApi) {
    if (draggingId === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverEtapa(etapa)
  }

  function handleCardDragOver(e: DragEvent, etapa: EtapaApi, cardId: number) {
    if (draggingId === null) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setOverEtapa(etapa)
    setOverCardId(cardId)
  }

  function handleDrop(e: DragEvent, etapa: EtapaApi, antesDe: number | null) {
    e.preventDefault()
    e.stopPropagation()
    const n = negociacoes.find((x) => x.id === draggingId)
    endDrag()
    if (!n || n.id === antesDe) return
    if (antesDe === null) {
      // Soltou no fim da coluna: abre a coluna até o fim, para o cartão não sumir na parte escondida.
      const total = visiveis.filter((x) => x.etapa === etapa).length + 1
      setLimites((l) => ({ ...l, [etapa]: Math.max(limiteDe(etapa), total) }))
    }
    levarPara(n, etapa, antesDe)
  }

  /** Pelo menu "Mover para", o cartão vai para o topo da coluna de destino (sempre visível). */
  function moverPeloMenu(n: NegociacaoApi, etapa: EtapaApi) {
    const primeiro = visiveis.find((x) => x.etapa === etapa && x.id !== n.id)
    levarPara(n, etapa, primeiro?.id ?? null)
  }

  const semFuncionario = meuId === null && !gerente

  return (
    <div className="funil-page">
      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Em negociação</h3>
            <span className="trend-badge trend-neutral">{indicadores.abertas} abertas</span>
          </div>
          <strong className="kpi-value">{loading ? '…' : currency.format(indicadores.emAberto)}</strong>
          <p className="kpi-helper">Soma das propostas (ou do preço anunciado)</p>
        </div>
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Taxa de conversão</h3>
          </div>
          <strong className="kpi-value">{indicadores.conversao === null ? '—' : `${indicadores.conversao}%`}</strong>
          <p className="kpi-helper">
            Vendidas entre as {indicadores.encerradas} encerradas nos últimos {diasIndicadores} dias
          </p>
        </div>
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Tempo até vender</h3>
          </div>
          <strong className="kpi-value">
            {indicadores.tempoMedio === null ? '—' : `${indicadores.tempoMedio} dias`}
          </strong>
          <p className="kpi-helper">Média do primeiro contato até a venda</p>
        </div>
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Principal motivo de perda</h3>
          </div>
          <strong className="kpi-value funil-kpi-text">{indicadores.motivo?.label ?? '—'}</strong>
          <p className="kpi-helper">
            {indicadores.motivo
              ? `${indicadores.motivo.vezes} ${indicadores.motivo.vezes === 1 ? 'vez' : 'vezes'} nos últimos ${diasIndicadores} dias`
              : 'Nenhuma perda no período'}
          </p>
        </div>
      </div>

      <div className="funil-toolbar">
        <div className="funil-toolbar-left">
          <label className="funil-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => filtrar(setQuery)(e.target.value)}
              placeholder="Cliente, veículo, placa ou vendedor"
              aria-label="Buscar negociação"
            />
          </label>
          {meuId !== null && (
            <label className="funil-check">
              <input type="checkbox" checked={somenteMinhas} onChange={(e) => filtrar(setSomenteMinhas)(e.target.checked)} />
              Só as minhas
            </label>
          )}
          {!somenteMinhas && (
            <select
              className="funil-select"
              value={vendedor}
              onChange={(e) => filtrar(setVendedor)(e.target.value)}
              aria-label="Filtrar por vendedor"
            >
              <option value="">Todos os vendedores</option>
              {vendedores.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          )}
          <select
            className="funil-select"
            value={origem}
            onChange={(e) => filtrar(setOrigem)(e.target.value)}
            aria-label="Filtrar por origem"
          >
            <option value="">Todas as origens</option>
            {origens.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditor({ etapa: 'interesse' })}
          disabled={semFuncionario}
          title={semFuncionario ? 'Sua conta não está ligada a um funcionário' : undefined}
        >
          <Plus size={16} />
          Nova negociação
        </button>
      </div>

      {error && (
        <div role="alert" className="funil-error">
          Não foi possível carregar o funil: {error}
          <button type="button" className="btn btn-outline" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="funil-error">
          {actionError}
          <button type="button" className="btn btn-outline" onClick={() => setActionError('')}>
            Ok
          </button>
        </div>
      )}

      <div className="funil-board">
        {etapas.map((etapa) => {
          const cards = visiveis.filter((n) => n.etapa === etapa.id)
          const total = cards.reduce((s, n) => s + valorDe(n), 0)
          const limite = limiteDe(etapa.id)
          const restantes = cards.length - limite
          const isOver = overEtapa === etapa.id && draggingId !== null
          const aberta = ehAberta(etapa.id)

          return (
            <section
              key={etapa.id}
              aria-label={`Etapa ${etapa.title}`}
              className={`funil-column ${isOver ? 'funil-column-over' : ''} ${aberta ? '' : 'funil-column-closed'}`}
              onDragOver={(e) => handleColumnDragOver(e, etapa.id)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setOverEtapa((s) => (s === etapa.id ? null : s))
                  setOverCardId(null)
                }
              }}
              onDrop={(e) => handleDrop(e, etapa.id, null)}
            >
              <header className="funil-column-header">
                <div className="funil-column-title">
                  <span className="funil-dot" style={{ background: etapa.color }} />
                  <h3>{etapa.title}</h3>
                  <span className="funil-count">{cards.length}</span>
                </div>
                <div className="funil-column-total">
                  <strong>{compactCurrency(total)}</strong>
                  <span>{etapa.helper}</span>
                </div>
              </header>

              <div className="funil-cards">
                {loading && cards.length === 0 && <p className="funil-empty">Carregando…</p>}
                {!loading && cards.length === 0 && (
                  <p className="funil-empty">
                    {etapa.id === 'vendido'
                      ? 'Arraste para cá para registrar a venda.'
                      : etapa.id === 'perdido'
                        ? 'Arraste para cá para marcar como perdida.'
                        : 'Nenhuma negociação.'}
                  </p>
                )}
                {cards.slice(0, limite).map((n) => (
                  <NegociacaoCard
                    key={n.id}
                    negociacao={n}
                    hoje={hoje}
                    podeEditar={podeEditar(n)}
                    arrastando={draggingId === n.id}
                    soltarAntes={overCardId === n.id && draggingId !== n.id}
                    onAbrir={() => setEditor({ negociacao: n })}
                    onMover={(destino) => moverPeloMenu(n, destino)}
                    onRegistrarVenda={() => setRegistrando(n)}
                    onPerder={() => setPerda(n)}
                    onExcluir={() => pedirExclusao(n)}
                    onDragStart={(e) => handleDragStart(e, n.id)}
                    onDragEnd={endDrag}
                    onDragOver={(e) => handleCardDragOver(e, etapa.id, n.id)}
                    onDrop={(e) => handleDrop(e, etapa.id, n.id)}
                  />
                ))}
                {(restantes > 0 || limite > limitePadrao(etapa.id)) && (
                  <div className="funil-paginacao">
                    {restantes > 0 && (
                      <button
                        type="button"
                        className="funil-mais"
                        onClick={() =>
                          setLimites((l) => ({ ...l, [etapa.id]: limite + limitePadrao(etapa.id) }))
                        }
                      >
                        Mostrar mais ({restantes})
                      </button>
                    )}
                    {limite > limitePadrao(etapa.id) && cards.length > limitePadrao(etapa.id) && (
                      <button
                        type="button"
                        className="funil-mais funil-menos"
                        onClick={() => setLimites((l) => ({ ...l, [etapa.id]: undefined }))}
                      >
                        Mostrar menos
                      </button>
                    )}
                  </div>
                )}
              </div>

              {aberta && !semFuncionario && (
                <button type="button" className="funil-add" onClick={() => setEditor({ etapa: etapa.id })}>
                  <Plus size={14} />
                  Adicionar
                </button>
              )}
            </section>
          )
        })}
      </div>

      {editor && (
        <NegociacaoFormModal
          negociacao={editor.negociacao}
          etapaInicial={editor.etapa}
          podeEditar={!editor.negociacao || podeEditar(editor.negociacao)}
          onClose={() => setEditor(null)}
          onSaved={(n) => {
            atualizar(n)
            setEditor(null)
          }}
          onDelete={(n) => {
            // Fecha o formulário antes de abrir a confirmação, para não ficarem dois pop-ups abertos.
            setEditor(null)
            pedirExclusao(n)
          }}
        />
      )}

      {perda && (
        <PerdaModal
          negociacao={perda}
          onClose={() => setPerda(null)}
          onConfirm={async (motivo) => {
            await mover(perda, 'perdido', null, motivo)
            setPerda(null)
          }}
        />
      )}

      {registrando && (
        <RegistrarVenda
          negociacao={registrando}
          onClose={() => setRegistrando(null)}
          onChange={atualizar}
          onDone={(n) => {
            atualizar(n)
            setRegistrando(null)
          }}
        />
      )}

      {exclusao && (
        <Modal
          title="Excluir negociação"
          size="sm"
          busy={excluindo}
          onClose={() => setExclusao(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" disabled={excluindo} onClick={() => setExclusao(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={excluindo} onClick={excluir}>
                {excluindo ? 'Excluindo…' : 'Excluir'}
              </button>
            </>
          }
        >
          <p>Excluir a negociação com {exclusao.nome}? Essa ação não pode ser desfeita.</p>
          <p>Se ela só não deu certo, prefira "Marcar como perdida": assim o motivo entra nos indicadores.</p>
          {exclusaoErro && (
            <p role="alert" className="funil-error-text">
              {exclusaoErro}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
