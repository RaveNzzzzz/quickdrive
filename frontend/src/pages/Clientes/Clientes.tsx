import { useEffect, useMemo, useState } from 'react'
import { Pencil, PhoneCall, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import type { ClienteApi, Paginated } from '../../types'
import {
  currency,
  currencyCents,
  daysFromToday,
  formatarDocumento,
  formatarTelefone,
  initials,
} from '../../utils/format'
import { ClienteFormModal } from './ClienteFormModal'
import './Clientes.css'

const PAGE_SIZE = 8

type Estagio = 'Cliente Ativo' | 'Em Negociação' | 'Inativo'
type Tipo = 'FISICA' | 'JURIDICA'
type Tab = 'Todos' | Estagio

const tabs: Tab[] = ['Todos', 'Cliente Ativo', 'Em Negociação', 'Inativo']

const tabLabels: Record<Tab, string> = {
  Todos: 'Todos',
  'Cliente Ativo': 'Ativos',
  'Em Negociação': 'Em negociação',
  Inativo: 'Inativos',
}

const estagioClass: Record<Estagio, string> = {
  'Cliente Ativo': 'cl-pill-ativo',
  'Em Negociação': 'cl-pill-negociacao',
  Inativo: 'cl-pill-inativo',
}

type Sort = 'recentes' | 'ltv' | 'nome'

/** Inativo vem do cadastro; "em negociação", de uma negociação aberta no Funil de Vendas. */
function estagioDe(c: ClienteApi): Estagio {
  if (!c.ativo) return 'Inativo'
  return c.em_negociacao ? 'Em Negociação' : 'Cliente Ativo'
}

/** Data e hora ISO -> "AAAA-MM-DD" no fuso de quem está usando. */
function diaLocal(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lastContactLabel(iso: string | null) {
  if (!iso) return 'sem registro'
  const days = -daysFromToday(diaLocal(iso))
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const [tab, setTab] = useState<Tab>('Todos')
  const [tipo, setTipo] = useState<Tipo | ''>('')
  const [sort, setSort] = useState<Sort>('recentes')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // null = fechado; {} = novo cliente; { cliente } = editando
  const [editor, setEditor] = useState<{ cliente?: ClienteApi } | null>(null)
  const [inativando, setInativando] = useState<ClienteApi | null>(null)
  const [inativarErro, setInativarErro] = useState('')

  useEffect(() => {
    let active = true
    // A API lista só os ativos por padrão; a tela precisa dos inativos também (aba "Inativos" e KPI "Para reativar").
    Promise.all([
      api<Paginated<ClienteApi>>('/clientes?limit=1000'),
      api<Paginated<ClienteApi>>('/clientes?ativo=false&limit=1000'),
    ])
      .then(([ativos, inativos]) => {
        if (active) setClientes([...ativos.items, ...inativos.items])
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

  const ativos = clientes.filter((c) => estagioDe(c) === 'Cliente Ativo')
  const emNegociacao = clientes.filter((c) => estagioDe(c) === 'Em Negociação')
  const compradores = clientes.filter((c) => c.veiculos_comprados > 0)
  const ltvMedio = compradores.length ? compradores.reduce((s, c) => s + c.ltv, 0) / compradores.length : 0
  // Inativos que já compraram: vale a pena tentar trazer de volta.
  const reativar = clientes.filter((c) => !c.ativo && c.veiculos_comprados > 0)

  const counts = useMemo(() => {
    const base = {} as Record<Tab, number>
    for (const t of tabs) base[t] = clientes.filter((c) => t === 'Todos' || estagioDe(c) === t).length
    return base
  }, [clientes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigitos = q.replace(/\D/g, '')
    const list = clientes
      .filter((c) => tab === 'Todos' || estagioDe(c) === tab)
      .filter((c) => !tipo || c.pessoa.tipo_pessoa === tipo)
      .filter(
        (c) =>
          !q ||
          c.pessoa.nome.toLowerCase().includes(q) ||
          c.pessoa.email.toLowerCase().includes(q) ||
          (qDigitos !== '' && (c.pessoa.cpf_cnpj.includes(qDigitos) || c.pessoa.telefone.includes(qDigitos))),
      )

    return list.sort((a, b) => {
      if (sort === 'ltv') return b.ltv - a.ltv
      if (sort === 'nome') return a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR')
      // Mais recentes primeiro; quem nunca teve contato registrado vai para o fim.
      return (b.ultima_interacao ?? '').localeCompare(a.ultima_interacao ?? '')
    })
  }, [clientes, tab, tipo, sort, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function substituir(cliente: ClienteApi) {
    setClientes((prev) =>
      prev.some((c) => c.id === cliente.id) ? prev.map((c) => (c.id === cliente.id ? cliente : c)) : [cliente, ...prev],
    )
  }

  /** Ações de uma linha (registrar contato, reativar, inativar): todas devolvem o cliente atualizado. */
  async function acao(cliente: ClienteApi, caminho: string, descricao: string) {
    setBusyId(cliente.id)
    setActionError('')
    try {
      substituir(await api<ClienteApi>(`/clientes/${cliente.id}/${caminho}`, { method: 'POST' }))
      return true
    } catch (err) {
      setActionError(`Não foi possível ${descricao} ${cliente.pessoa.nome}: ${(err as Error).message}`)
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function confirmarInativacao() {
    if (!inativando) return
    setInativarErro('')
    setBusyId(inativando.id)
    try {
      substituir(await api<ClienteApi>(`/clientes/${inativando.id}/inativar`, { method: 'POST' }))
      setInativando(null)
    } catch (err) {
      setInativarErro((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const inativandoAgora = inativando !== null && busyId === inativando.id

  return (
    <div className="cl-page">
      {error && (
        <div role="alert" className="cl-error">
          Não foi possível carregar os clientes: {error}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setLoading(true)
              setError('')
              setAttempt((v) => v + 1)
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="cl-error">
          {actionError}
          <button type="button" className="btn btn-outline" onClick={() => setActionError('')}>
            Ok
          </button>
        </div>
      )}

      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Total de clientes</h3>
          </div>
          <strong className="kpi-value">{loading ? '…' : clientes.length}</strong>
          <p className="kpi-helper">
            {ativos.length} ativos · {clientes.length - ativos.length} outros
          </p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Em negociação</h3>
            <span className="trend-badge trend-neutral">Funil</span>
          </div>
          <strong className="kpi-value">{loading ? '…' : emNegociacao.length}</strong>
          <p className="kpi-helper">Com negociação aberta no Funil de Vendas</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>LTV médio</h3>
          </div>
          <strong className="kpi-value">{loading ? '…' : currency.format(ltvMedio)}</strong>
          <p className="kpi-helper">Quanto cada cliente que já comprou gastou na loja</p>
        </div>

        <div className="card kpi-card">
          <div className="kpi-card-header">
            <h3>Para reativar</h3>
            <span className={`trend-badge ${reativar.length ? 'trend-down' : 'trend-up'}`}>
              {reativar.length ? 'Oportunidade' : 'Ok'}
            </span>
          </div>
          <strong className="kpi-value">{loading ? '…' : reativar.length}</strong>
          <p className="kpi-helper">Inativos que já compraram conosco</p>
        </div>
      </div>

      <div className="card cl-table-card">
        <div className="cl-toolbar">
          <div className="cl-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={`cl-tab ${tab === t ? 'active' : ''}`}
                onClick={() => resetPage(setTab)(t)}
              >
                {tabLabels[t]}
                <span className="cl-tab-count">{counts[t]}</span>
              </button>
            ))}
          </div>

          <div className="cl-filters">
            <label className="cl-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => resetPage(setQuery)(e.target.value)}
                placeholder="Nome, documento, e-mail ou telefone"
                aria-label="Buscar cliente"
              />
            </label>
            <select
              className="cl-select"
              value={tipo}
              onChange={(e) => resetPage(setTipo)(e.target.value as Tipo | '')}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos os tipos</option>
              <option value="FISICA">Pessoa Física</option>
              <option value="JURIDICA">Pessoa Jurídica</option>
            </select>
            <select
              className="cl-select"
              value={sort}
              onChange={(e) => resetPage(setSort)(e.target.value as Sort)}
              aria-label="Ordenar por"
            >
              <option value="recentes">Contato mais recente</option>
              <option value="ltv">Maior LTV</option>
              <option value="nome">Nome (A–Z)</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>
              <Plus size={16} />
              Novo cliente
            </button>
          </div>
        </div>

        <div className="cl-table-scroll">
          <table className="data-table cl-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Contato</th>
                <th>Estágio</th>
                <th>Veículos</th>
                <th>LTV</th>
                <th>Responsável</th>
                <th>Última interação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((cliente) => {
                const { pessoa } = cliente
                const estagio = estagioDe(cliente)
                const pj = pessoa.tipo_pessoa === 'JURIDICA'
                const ocupado = busyId === cliente.id
                return (
                  <tr key={cliente.id}>
                    <td>
                      <span className="cl-person">
                        <span className="cl-avatar">{initials(pessoa.nome.replace('[TESTE]', ''))}</span>
                        <span>
                          <strong className="cl-name">{pessoa.nome}</strong>
                          <span className="cl-note">
                            {pj ? 'CNPJ' : 'CPF'} {formatarDocumento(pessoa.cpf_cnpj)}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`cl-tipo ${pj ? 'cl-tipo-pj' : ''}`}>{pj ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
                    </td>
                    <td>
                      <strong className="cl-name">{pessoa.email}</strong>
                      <span className="cl-note">{formatarTelefone(pessoa.telefone)}</span>
                    </td>
                    <td>
                      <span className={`cl-pill ${estagioClass[estagio]}`}>{estagio}</span>
                    </td>
                    <td>{cliente.veiculos_comprados === 1 ? '1 veículo' : `${cliente.veiculos_comprados} veículos`}</td>
                    <td className="cl-ltv">{currencyCents.format(cliente.ltv)}</td>
                    <td>{cliente.responsavel ?? '—'}</td>
                    <td>
                      <strong className="cl-name">{lastContactLabel(cliente.ultima_interacao)}</strong>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="row-action row-action-edit"
                          aria-label={`Editar ${pessoa.nome}`}
                          title="Editar"
                          onClick={() => setEditor({ cliente })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="row-action row-action-edit"
                          aria-label={`Registrar contato hoje com ${pessoa.nome}`}
                          title="Registrar contato hoje"
                          disabled={ocupado}
                          onClick={() => acao(cliente, 'interacao', 'registrar o contato com')}
                        >
                          <PhoneCall size={15} />
                        </button>
                        {cliente.ativo ? (
                          <button
                            type="button"
                            className="row-action row-action-delete"
                            aria-label={`Inativar ${pessoa.nome}`}
                            title="Inativar"
                            disabled={ocupado}
                            onClick={() => {
                              setInativarErro('')
                              setInativando(cliente)
                            }}
                          >
                            <UserX size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="row-action row-action-edit"
                            aria-label={`Reativar ${pessoa.nome}`}
                            title="Reativar"
                            disabled={ocupado}
                            onClick={() => acao(cliente, 'reativar', 'reativar')}
                          >
                            <UserCheck size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="cl-empty">
                    {loading ? 'Carregando…' : 'Nenhum cliente encontrado para esses filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="clientes"
        onPageChange={setPage}
      />

      {editor && (
        <ClienteFormModal
          cliente={editor.cliente}
          onClose={() => setEditor(null)}
          onSaved={(cliente) => {
            substituir(cliente)
            setEditor(null)
          }}
        />
      )}

      {inativando && (
        <Modal
          title="Inativar cliente"
          size="sm"
          busy={inativandoAgora}
          onClose={() => setInativando(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-outline"
                disabled={inativandoAgora}
                onClick={() => setInativando(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={inativandoAgora} onClick={confirmarInativacao}>
                {inativandoAgora ? 'Inativando…' : 'Inativar'}
              </button>
            </>
          }
        >
          <p>
            Inativar {inativando.pessoa.nome}? Ele sai das listas de seleção (vendas, funil), mas o histórico de compras
            continua guardado. Dá para reativar depois na aba "Inativos".
          </p>
          {inativando.em_negociacao && (
            <p>Atenção: este cliente tem uma negociação aberta no Funil de Vendas.</p>
          )}
          {inativarErro && (
            <p role="alert" className="cl-error-text">
              {inativarErro}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
