import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Search, UserMinus, X, FileText } from 'lucide-react'
import { Pagination } from '../../components/Pagination'
import { Modal } from '../../components/Modal'
import { listAll, listFuncionarios, type CargoApi, type FuncionarioApi, type SetorApi } from './funcionariosData'
import { FuncionarioFormModal } from './FuncionarioFormModal'
import { DesligamentoModal } from './DesligamentoModal'
import './Funcionarios.css'

const PAGE_SIZE = 10
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
type StatusFilter = 'todos' | 'ativos' | 'desligados'
const formatDate = (date: string) => date.split('-').reverse().join('/')

export default function Funcionarios() {
  const [employees, setEmployees] = useState<FuncionarioApi[]>([])
  const [sectors, setSectors] = useState<SetorApi[]>([])
  const [cargos, setCargos] = useState<CargoApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('')
  const [status, setStatus] = useState<StatusFilter>('todos')
  const [editor, setEditor] = useState<FuncionarioApi | 'new' | null>(null)
  const [offboarding, setOffboarding] = useState<FuncionarioApi | null>(null)
  const [history, setHistory] = useState<FuncionarioApi | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listFuncionarios(), listAll<SetorApi>('/setores'), listAll<CargoApi>('/cargos')])
      .then(([employees, sectors, cargos]) => {
        if (active) { setEmployees(employees); setSectors(sectors); setCargos(cargos) }
      }).catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const activeEmployees = employees.filter(e => e.ativo)
  const payroll = activeEmployees.reduce((sum, e) => sum + Number(e.salario), 0)
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    return employees.filter(e => (!sector || String(e.cargo.setor.id) === sector) &&
      (status === 'todos' || (status === 'ativos') === e.ativo) &&
      (!q || [e.pessoa.nome, e.pessoa.email, e.cargo.nome].some(s => s.toLocaleLowerCase('pt-BR').includes(q))))
  }, [employees, query, sector, status])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const unavailable = loading || !!error

  function saved(employee: FuncionarioApi) {
    setEmployees(prev => [...prev.filter(e => e.id !== employee.id), employee].sort((a,b) => a.pessoa.nome.localeCompare(b.pessoa.nome)))
    setNotice(employee.ativo ? 'Funcionário salvo com sucesso.' : 'Funcionário desligado. O acesso da conta vinculada foi bloqueado.')
    setEditor(null); setOffboarding(null)
  }

  return <div className="funcionarios-page">
    {notice && <div className="func-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={16} /></button></div>}
    <div className="kpi-row kpi-row-4">
      <div className="card kpi-card"><div className="kpi-card-header"><h3>Funcionários</h3></div><strong className="kpi-value">{unavailable ? '—' : employees.length}</strong><p className="kpi-helper">Em {sectors.length} setores cadastrados</p></div>
      <div className="card kpi-card"><div className="kpi-card-header"><h3>Ativos</h3><span className="trend-badge trend-up">{unavailable ? '—' : `${employees.length ? Math.round(activeEmployees.length / employees.length * 100) : 0}%`}</span></div><strong className="kpi-value">{unavailable ? '—' : activeEmployees.length}</strong><p className="kpi-helper">Da equipe total</p></div>
      <div className="card kpi-card"><div className="kpi-card-header"><h3>Desligados</h3></div><strong className="kpi-value">{unavailable ? '—' : employees.length - activeEmployees.length}</strong><p className="kpi-helper">Mantidos no histórico</p></div>
      <div className="card kpi-card"><div className="kpi-card-header"><h3>Folha mensal</h3></div><strong className="kpi-value">{unavailable ? '—' : currency.format(payroll)}</strong><p className="kpi-helper">Soma dos salários dos ativos</p></div>
    </div>
    <div className="toolbar"><div className="toolbar-left">
      <label className="func-search"><Search size={16} /><input aria-label="Buscar funcionário" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder="Nome, e-mail ou cargo" /></label>
      <select className="func-select" value={sector} onChange={e => { setSector(e.target.value); setPage(1) }} aria-label="Filtrar por setor"><option value="">Todos os setores</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
      <select className="func-select" value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(1) }} aria-label="Filtrar por status"><option value="todos">Todos os status</option><option value="ativos">Ativos</option><option value="desligados">Desligados</option></select>
    </div><div className="toolbar-right"><Link className="btn btn-outline" to="/funcionarios/cargos">Ver cargos</Link><Link className="btn btn-outline" to="/funcionarios/setores">Ver setores</Link><button type="button" className="btn btn-primary" disabled={unavailable} onClick={() => setEditor('new')}><Plus size={16} />Novo Funcionário</button></div></div>
    {error && <div className="func-error" role="alert">Não foi possível carregar a equipe: {error} <button className="btn btn-outline" onClick={() => { setLoading(true); setError(''); setAttempt(v => v+1) }}>Tentar novamente</button></div>}
    <div className="card table-card"><table className="data-table"><thead><tr><th>Funcionário</th><th>E-mail</th><th>Telefone</th><th>Setor</th><th>Cargo</th><th>Status</th><th>Salário</th><th>Ações</th></tr></thead><tbody>
      {!unavailable && pageItems.map(e => <tr key={e.id}>
        <td><span className="employee-cell"><span className="employee-avatar">{e.pessoa.nome.trim().split(/\s+/).slice(0,2).map(p => p[0]).join('').toUpperCase()}</span>{e.pessoa.nome}</span></td>
        <td>{e.pessoa.email}</td><td>{e.pessoa.telefone}</td><td>{e.cargo.setor.nome}</td><td>{e.cargo.nome}</td>
        <td><span className={e.ativo ? 'status-badge status-active' : 'status-badge status-inactive'}>{e.ativo ? 'Ativo' : 'Desligado'}</span></td><td>{currency.format(Number(e.salario))}</td>
        <td><div className="row-actions">{e.ativo ? <>
          <button className="row-action row-action-edit" aria-label={`Editar ${e.pessoa.nome}`} onClick={() => setEditor(e)}><Pencil size={15} /></button>
          <button className="row-action row-action-delete" aria-label={`Desligar ${e.pessoa.nome}`} onClick={() => setOffboarding(e)}><UserMinus size={15} /></button>
        </> : <button className="row-action" aria-label={`Ver desligamento de ${e.pessoa.nome}`} onClick={() => setHistory(e)}><FileText size={15} /></button>}</div></td>
      </tr>)}
      {(unavailable || !pageItems.length) && <tr><td colSpan={8} className="func-empty">{loading ? 'Carregando…' : error ? 'Equipe indisponível.' : 'Nenhum funcionário encontrado para esses filtros.'}</td></tr>}
    </tbody></table></div>
    {!unavailable && <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} itemLabel="funcionários" onPageChange={setPage} />}
    {editor && <FuncionarioFormModal employee={editor === 'new' ? undefined : editor} cargos={cargos} setores={sectors} onClose={() => setEditor(null)} onSaved={saved} />}
    {offboarding && <DesligamentoModal employee={offboarding} onClose={() => setOffboarding(null)} onSaved={saved} />}
    {history && <Modal title={`Desligamento de ${history.pessoa.nome}`} onClose={() => setHistory(null)}>
      {history.desligamento ? <dl className="func-history"><dt>Data</dt><dd>{formatDate(history.desligamento.data_desligamento)}</dd><dt>Motivo</dt><dd>{history.desligamento.motivo}</dd><dt>Observações</dt><dd>{history.desligamento.observacoes || 'Não informadas'}</dd></dl> : <p>Funcionário inativo sem registro de desligamento disponível.</p>}
    </Modal>}
  </div>
}
