import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Clock, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../utils/toast'
import { Skeleton } from '../../components/Skeleton'
import { Modal } from '../../components/Modal'
import type { VeiculoApi } from '../../types'
import { VeiculoCarrossel } from './VeiculoCarrossel'
import { VeiculoFormModal } from './VeiculoFormModal'
import { statusLabel } from './veiculoStatus'
import { DocumentosModal } from './DocumentosModal'
import { CustoPreparacaoModal } from './CustoPreparacaoModal'
import './Veiculo.css'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR')

// "2026-09-20" -> "20/09/2026" (sem passar por Date, para não "voltar um dia" por causa do fuso).
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// "2026-08-02T09:40:00Z" -> "02/08/2026 · 09:40" (no fuso do navegador)
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR')
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} · ${hora}`
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function VeiculoFicha() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [veiculo, setVeiculo] = useState<VeiculoApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editingDocs, setEditingDocs] = useState(false)
  const [addingCusto, setAddingCusto] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    api<VeiculoApi>(`/veiculos/${id}`)
      .then(setVeiculo)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!veiculo) return
    setDeleting(true)
    setDeleteError('')

    try {
      await api<null>(`/veiculos/${veiculo.id}`, { method: 'DELETE' })
      navigate('/patio', {
        replace: true,
        state: { notice: `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa}) foi excluído.` },
      })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Não foi possível excluir o veículo.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="ficha-page" role="status" aria-busy="true" aria-label="Carregando ficha">
        <div className="ficha-main">
          <div className="card ficha-gallery">
            <Skeleton height={300} radius={16} />
            <div className="skeleton-thumbs">
              <Skeleton height={64} radius={10} />
              <Skeleton height={64} radius={10} />
              <Skeleton height={64} radius={10} />
              <Skeleton height={64} radius={10} />
            </div>
          </div>
          <section className="card ficha-section">
            <Skeleton width="25%" height={20} />
            <div className="skeleton-specs">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="skeleton-stack" style={{ gap: 6 }}>
                  <Skeleton width="40%" height={10} />
                  <Skeleton width="70%" height={16} />
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="ficha-aside">
          <Skeleton height={190} radius={20} />
          <section className="card ficha-section">
            <Skeleton width="45%" height={20} />
            <div className="skeleton-stack" style={{ marginTop: 16 }}>
              <Skeleton height={18} />
              <Skeleton height={18} />
              <Skeleton height={18} />
            </div>
          </section>
          <section className="card ficha-section">
            <Skeleton width="55%" height={20} />
            <div className="skeleton-stack" style={{ marginTop: 16 }}>
              <Skeleton height={18} />
              <Skeleton height={18} />
            </div>
          </section>
        </aside>
      </div>
    )
  }

  if (error || !veiculo) {
    return (
      <div className="card ficha-state" role="alert">
        <p>Não foi possível abrir esta ficha{error ? `: ${error}` : '.'}</p>
        <Link to="/patio" className="btn btn-outline">
          Voltar ao pátio
        </Link>
      </div>
    )
  }

  const daysInLot = Math.max(
    0,
    Math.floor((Date.now() - new Date(veiculo.data_entrada).getTime()) / 86_400_000),
  )

  const custoAquisicao = veiculo.custo_aquisicao
  const margem = veiculo.valor > 0 ? ((veiculo.valor - custoAquisicao) / veiculo.valor) * 100 : 0
  const totalCustos = veiculo.custos_preparacao.reduce((sum, c) => sum + c.custo, 0)
  const { sinistro } = veiculo
  const anoFabricacao = veiculo.ano_fabricacao.slice(0, 4)

  async function removerCusto(id: number) {
    if (!veiculo) return
    try {
      await api<null>(`/veiculos/${veiculo.id}/custos-preparacao/${id}`, { method: 'DELETE' })
      setVeiculo({ ...veiculo, custos_preparacao: veiculo.custos_preparacao.filter((c) => c.id !== id) })
      toast.success(
        veiculo.custos_preparacao.find((c) => c.id === id)?.produtos.length
          ? 'Procedimento removido. Os produtos voltaram ao estoque.'
          : 'Procedimento removido com sucesso!',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível remover o custo.')
    }
  }

  function emBreve() {
    toast.error('Esta função ainda não está disponível.')
  }

  return (
    <div className="ficha-page">
      <div className="ficha-main">
        <div className="card ficha-gallery">
          <VeiculoCarrossel imagens={veiculo.imagens} alt={`${veiculo.marca} ${veiculo.modelo}`} />
        </div>

        <section className="card ficha-section">
          <div className="ficha-section-head">
            <h3>Especificações</h3>
            <span className={`ficha-status ficha-status-${veiculo.status}`}>
              {statusLabel(veiculo.status)}
            </span>
          </div>
          <dl className="ficha-dl">
            <Item label="Marca">{veiculo.marca}</Item>
            <Item label="Modelo">
              {veiculo.modelo}
              {veiculo.versao ? ` ${veiculo.versao}` : ''}
            </Item>
            <Item label="Ano">
              {anoFabricacao}/{veiculo.ano_modelo}
            </Item>
            <Item label="Placa">{veiculo.placa}</Item>
            <Item label="Km">{number.format(veiculo.quilometragem)}</Item>
            <Item label="Cor">{veiculo.cor}</Item>
            <Item label="Combustível">{veiculo.combustivel}</Item>
            <Item label="Câmbio">{veiculo.cambio}</Item>
            <Item label="Motor">{veiculo.motorizacao}</Item>
            <Item label="Portas">{veiculo.portas}</Item>
            <Item label="Capacidade">{veiculo.lugares}</Item>
            <Item label="Carroceria">{veiculo.carroceria}</Item>
            <Item label="Chassi">{veiculo.chassi}</Item>
            <Item label="RENAVAM">{veiculo.renavam}</Item>
            <Item label="Vaga">
              {veiculo.vaga ? (veiculo.vaga_posicao ? `${veiculo.vaga} · ${veiculo.vaga_posicao}` : veiculo.vaga) : '—'}
            </Item>
          </dl>
        </section>

        <section className="card ficha-section">
          <h3>Opcionais</h3>
          {veiculo.opcionais.length === 0 ? (
            <p className="ficha-vazio">Nenhum opcional cadastrado.</p>
          ) : (
            <ul className="ficha-chips">
              {veiculo.opcionais.map((o) => (
                <li key={o.id} className="ficha-chip">
                  {o.nome}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card ficha-section">
          <h3>Histórico de sinistro</h3>
          {!sinistro ? (
            <p className="ficha-vazio">Sem registro de sinistro para este veículo.</p>
          ) : (
            <>
              <ul className="ficha-chips">
                <li className={`ficha-chip ${sinistro.teve_sinistro ? 'ficha-chip-alerta' : 'ficha-chip-ok'}`}>
                  {sinistro.teve_sinistro ? 'Teve sinistro' : 'Sem sinistro'}
                </li>
                {sinistro.de_leilao && <li className="ficha-chip ficha-chip-alerta">Veio de leilão</li>}
                {sinistro.perda_total && <li className="ficha-chip ficha-chip-perigo">Perda total (PT)</li>}
              </ul>
              {sinistro.descricao && <p className="ficha-obs ficha-sinistro-desc">{sinistro.descricao}</p>}
            </>
          )}
        </section>

        <section className="card ficha-section">
          <h3>Observações</h3>
          <p className={veiculo.observacoes ? 'ficha-obs' : 'ficha-vazio'}>
            {veiculo.observacoes || 'Nenhuma observação.'}
          </p>
        </section>

        <div className="ficha-actions">
          <button type="button" className="btn ficha-btn-soft" onClick={() => setEditingDocs(true)}>
            Editar Documentos
          </button>
          <button type="button" className="btn ficha-btn-soft" onClick={emBreve}>
            Adicionar Revisão
          </button>
          <button type="button" className="btn ficha-btn-soft" onClick={() => setEditing(true)}>
            Editar Ficha Veículo
          </button>
          <button
            type="button"
            className="btn ficha-btn-danger"
            onClick={() => {
              setDeleteError('')
              setConfirmingDelete(true)
            }}
          >
            Excluir Veículo
          </button>
        </div>
      </div>

      <aside className="ficha-aside">
        <div className="ficha-price-card">
          <span className="ficha-price-label">Preço de tabela</span>
          <strong className="ficha-price">{currency.format(veiculo.valor)}</strong>
          <span className="ficha-cost">Custo de aquisição {currency.format(custoAquisicao)}</span>
          <div className="ficha-price-stats">
            <div>
              <span className="ficha-price-label">Margem prevista</span>
              <strong className="ficha-stat-accent">{margem.toFixed(1).replace('.', ',')}%</strong>
            </div>
            <div>
              <span className="ficha-price-label">No pátio há</span>
              <strong>{daysInLot} dias</strong>
            </div>
          </div>
        </div>

        <section className="card ficha-section">
          <h3>Documentação</h3>
          {veiculo.documentos.length === 0 ? (
            <p className="ficha-vazio">Nenhum documento cadastrado.</p>
          ) : (
            <ul className="ficha-docs">
              {veiculo.documentos.map((doc) => {
                const tipo = doc.regular ? 'ok' : 'pendente'
                return (
                  <li key={doc.id}>
                    <span className={`ficha-doc-icon ficha-doc-${tipo}`} aria-hidden="true">
                      {doc.regular ? <Check size={14} /> : <Clock size={14} />}
                    </span>
                    <span className="ficha-doc-name">{doc.nome}</span>
                    <span className={`ficha-doc-badge ficha-doc-${tipo}`}>{doc.situacao}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card ficha-section">
          <div className="ficha-section-head">
            <h3>Custos de preparação</h3>
            <span className="ficha-total">Total {currency.format(totalCustos)}</span>
          </div>
          {veiculo.custos_preparacao.length === 0 ? (
            <p className="ficha-vazio">Nenhum procedimento registrado.</p>
          ) : (
            <ul className="ficha-custos">
              {veiculo.custos_preparacao.map((c) => (
                <li key={c.id}>
                  <span className="ficha-custo-desc">{c.nome}</span>
                  <span className="ficha-custo-data">{formatDate(c.data)}</span>
                  <strong>{currency.format(c.custo)}</strong>
                  <button
                    type="button"
                    className="ficha-custo-remover"
                    onClick={() => void removerCusto(c.id)}
                    aria-label={`Remover procedimento ${c.nome}`}
                  >
                    <Trash2 size={14} />
                  </button>
                  {c.produtos.length > 0 && (
                    <div className="ficha-custo-produtos">
                      {c.produtos.map((p) => (
                        <span key={p.produto_id} className="ficha-custo-chip">
                          {p.nome} × {p.quantidade} · {currency.format(p.valor_total)}
                        </span>
                      ))}
                      {c.custo_servico > 0 && (
                        <span className="ficha-custo-chip ficha-custo-chip-servico">
                          Serviço · {currency.format(c.custo_servico)}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-outline ficha-add" onClick={() => setAddingCusto(true)}>
            <Plus size={16} />
            Adicionar procedimento
          </button>
        </section>

        <section className="card ficha-section">
          <h3>Histórico no pátio</h3>
          <ol className="ficha-historico">
            {veiculo.historico.map((h) => (
              <li key={h.id} className={h.positivo ? 'ficha-hist-success' : 'ficha-hist-info'}>
                <strong>{h.titulo}</strong>
                <span>{formatDateTime(h.data_hora)}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      {editing && (
        <VeiculoFormModal
          mode="edit"
          veiculo={veiculo}
          onClose={() => setEditing(false)}
          onSaved={(atualizado, warning) => {
            setVeiculo(atualizado)
            setEditing(false)
            if (warning) toast.error(warning)
            else toast.success('Veículo atualizado com sucesso!')
          }}
        />
      )}

      {editingDocs && (
        <DocumentosModal
          veiculoId={veiculo.id}
          documentos={veiculo.documentos}
          onClose={() => setEditingDocs(false)}
          onChange={(documentos) => setVeiculo({ ...veiculo, documentos })}
        />
      )}

      {addingCusto && (
        <CustoPreparacaoModal
          veiculoId={veiculo.id}
          onClose={() => setAddingCusto(false)}
          onSaved={(custo) => {
            setVeiculo({
              ...veiculo,
              custos_preparacao: [...veiculo.custos_preparacao, custo].sort(
                (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
              ),
            })
            setAddingCusto(false)
            toast.success(
              custo.produtos.length
                ? 'Procedimento adicionado. Os produtos saíram do estoque.'
                : 'Procedimento adicionado com sucesso!',
            )
          }}
        />
      )}

      {confirmingDelete && (
        <Modal
          title="Excluir veículo?"
          size="sm"
          busy={deleting}
          onClose={() => setConfirmingDelete(false)}
          footer={
            <>
              {deleteError && (
                <p className="vform-error" role="alert">
                  {deleteError}
                </p>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Excluindo…' : 'Excluir veículo'}
              </button>
            </>
          }
        >
          <p>
            O veículo{' '}
            <strong>
              {veiculo.marca} {veiculo.modelo} ({veiculo.placa})
            </strong>{' '}
            será excluído. Essa ação não pode ser desfeita.
          </p>
        </Modal>
      )}
    </div>
  )
}