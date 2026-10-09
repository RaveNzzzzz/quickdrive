import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Search } from 'lucide-react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { listAll, listFuncionarios, type CargoApi, type SetorApi } from './funcionariosData'
import './Funcionarios.css'

function isCargo(item: CargoApi | SetorApi): item is CargoApi {
  return 'setor' in item
}

export default function Cargos({ setores = false }: { setores?: boolean }) {
  const [cargos, setCargos] = useState<CargoApi[]>([])
  const [sectors, setSectors] = useState<SetorApi[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<CargoApi | SetorApi | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([listAll<CargoApi>('/cargos'), listAll<SetorApi>('/setores'), listFuncionarios()])
      .then(([roles, sectors, employees]) => {
        if (!active) return
        setCargos(roles); setSectors(sectors)
        const totals: Record<number, number> = {}
        employees.filter(e => e.ativo).forEach(e => { totals[e.cargo.id] = (totals[e.cargo.id] ?? 0) + 1 })
        setCounts(totals)
      }).catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const filtered = (setores ? sectors : cargos).filter(item =>
    item.nome.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, totalPages)
  function saved(item: CargoApi | SetorApi) {
    if (isCargo(item)) setCargos(prev => [...prev.filter(c => c.id !== item.id), item].sort((a,b) => a.nome.localeCompare(b.nome)))
    else setSectors(prev => [...prev.filter(s => s.id !== item.id), item].sort((a,b) => a.nome.localeCompare(b.nome)))
    setEditor(null); setNotice(`${setores ? 'Setor' : 'Cargo'} salvo com sucesso.`)
  }
  return <div className="funcionarios-page">
    <h2>{setores ? 'Setores' : 'Cargos'}</h2>
    <div className="toolbar"><div className="toolbar-left">
      <Link className="btn btn-outline" to="/funcionarios"><ArrowLeft size={16} />Funcionários</Link>
      <label className="func-search"><Search size={16} /><input aria-label={setores ? 'Buscar setor' : 'Buscar cargo'} placeholder={setores ? 'Buscar setor' : 'Buscar cargo'} value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label>
    </div><div className="toolbar-right">
      <Link className="btn btn-outline" to={setores ? '/funcionarios/cargos' : '/funcionarios/setores'}>{setores ? 'Ver cargos' : 'Ver setores'}</Link>
      <button className="btn btn-primary" disabled={loading || !!error} onClick={() => setEditor('new')}><Plus size={16} />{setores ? 'Novo setor' : 'Novo cargo'}</button>
    </div></div>
    {notice && <p className="func-notice" role="status">{notice}</p>}
    {error && <div className="func-error" role="alert">{error} <button className="btn btn-outline" onClick={() => { setError(''); setLoading(true); setAttempt(v => v+1) }}>Tentar novamente</button></div>}
    <div className="card table-card"><table className="data-table"><thead><tr><th>{setores ? 'Setor' : 'Cargo'}</th><th>{setores ? 'Cargos vinculados' : 'Setor'}</th>{!setores && <th>Papel de acesso</th>}<th>Funcionários ativos</th><th>Ações</th></tr></thead><tbody>
      {!loading && !error && filtered.slice((currentPage-1)*10, currentPage*10).map(item => <tr key={item.id}>
        <td>{item.nome}</td><td>{isCargo(item) ? item.setor.nome : cargos.filter(c => c.setor.id === item.id).map(c => c.nome).join(', ') || 'Nenhum cargo cadastrado'}</td>{isCargo(item) && <td>{{ COMUM: 'Comum', GERENTE: 'Gerente', ADMINISTRADOR: 'Administrador' }[item.papel_acesso]}</td>}
        <td>{isCargo(item) ? counts[item.id] ?? 0 : cargos.filter(c => c.setor.id === item.id).reduce((sum,c) => sum+(counts[c.id] ?? 0),0)}</td>
        <td><button className="row-action row-action-edit" aria-label={`Editar ${item.nome}`} onClick={() => setEditor(item)}><Pencil size={15} /></button></td>
      </tr>)}
      {(loading || error || !filtered.length) && <tr><td colSpan={setores ? 4 : 5} className="func-empty">{loading ? 'Carregando…' : error ? 'Listagem indisponível.' : 'Nenhum registro encontrado.'}</td></tr>}
    </tbody></table></div>
    {!loading && !error && <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={10} itemLabel={setores ? 'setores' : 'cargos'} onPageChange={setPage} />}
    {editor && <Editor setores={setores} item={editor === 'new' ? undefined : editor} sectors={sectors} onClose={() => setEditor(null)} onSaved={saved} />}
  </div>
}

function Editor({ setores, item, sectors, onClose, onSaved }: {
  setores: boolean; item?: CargoApi | SetorApi; sectors: SetorApi[]; onClose: () => void; onSaved: (item: CargoApi | SetorApi) => void
}) {
  const id = useId()
  const [nome, setNome] = useState(item?.nome ?? '')
  const [descricao, setDescricao] = useState(item && 'descricao' in item ? item.descricao : '')
  const [sector, setSector] = useState(item && isCargo(item) ? String(item.setor.id) : '')
  const [role, setRole] = useState(item && isCargo(item) ? item.papel_acesso : 'COMUM')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!nome.trim()) { setError('Informe o nome.'); return }
    setSaving(true); setError('')
    const path = setores ? '/setores' : '/cargos'
    try {
      onSaved(await api<CargoApi | SetorApi>(item ? `${path}/${item.id}` : path, {
        method: item ? 'PATCH' : 'POST', body: JSON.stringify({ nome: nome.trim(), ...(!setores ? { descricao: descricao.trim(), setor_id: Number(sector), papel_acesso: role } : {}) }),
      }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.'); setSaving(false) }
  }
  return <Modal title={`${item ? 'Editar' : 'Novo'} ${setores ? 'setor' : 'cargo'}`} busy={saving} onClose={onClose} footer={<>
    <button className="btn btn-outline" disabled={saving} onClick={onClose}>Cancelar</button>
    <button className="btn btn-primary" type="submit" form={id} disabled={saving || (!setores && !sectors.length)}>{saving ? 'Salvando…' : 'Salvar'}</button>
  </>}><form id={id} className="func-form" onSubmit={submit}>
    {error && <p className="func-error" role="alert">{error}</p>}
    <label className="func-form-field"><span>Nome</span><input required maxLength={100} disabled={saving} value={nome} onChange={e => setNome(e.target.value)} /></label>
    {!setores && <>
      <label className="func-form-field"><span>Papel de acesso</span><select disabled={saving} value={role} onChange={e => setRole(e.target.value as CargoApi['papel_acesso'])}><option value="COMUM">Comum</option><option value="GERENTE">Gerente</option><option value="ADMINISTRADOR">Administrador</option></select></label>
      <p>Gerente e administrador podem acessar Financeiro e Funcionários.</p>
      <label className="func-form-field"><span>Setor</span><select required disabled={saving} value={sector} onChange={e => setSector(e.target.value)}><option value="">Selecione</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
      {!sectors.length && <p>Cadastre um setor em “Ver setores” antes de criar o cargo.</p>}
      <label className="func-form-field"><span>Descrição (opcional)</span><textarea maxLength={200} disabled={saving} value={descricao} onChange={e => setDescricao(e.target.value)} /></label>
    </>}
  </form></Modal>
}

