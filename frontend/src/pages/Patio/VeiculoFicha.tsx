import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Car, Pencil, Trash2 } from 'lucide-react'
import { api, apiUrl } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { VeiculoApi } from '../../types'
import { VeiculoFormModal } from './VeiculoFormModal'
import { statusLabel } from './veiculoStatus'
import './Veiculo.css'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR')

// "2026-09-20" -> "20/09/2026" (sem passar por Date, para não "voltar um dia" por causa do fuso).
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
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
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api<VeiculoApi>(`/veiculos/${id}`)
      .then(setVeiculo)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // O aviso some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

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
      <div className="card ficha-state" role="status">
        Carregando ficha…
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

  return (
    <div className="ficha-page">
      {notice && (
        <div className="ficha-notice" role="status">
          {notice}
        </div>
      )}

      <div className="card ficha-header">
        <div className="ficha-header-main">
          <h2>
            {veiculo.marca} {veiculo.modelo}
          </h2>
          <p className="ficha-subtitle">
            {veiculo.versao} · {veiculo.ano_modelo} · {veiculo.placa}
          </p>
          <span className={`ficha-status ficha-status-${veiculo.status}`}>
            {statusLabel(veiculo.status)}
          </span>
        </div>

        <div className="ficha-header-actions">
          <button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            Editar
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => {
              setDeleteError('')
              setConfirmingDelete(true)
            }}
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      </div>

      <div className="ficha-layout">
        <aside className="card ficha-side">
          <div className={`ficha-photo ${veiculo.imagem_url ? 'has-image' : ''}`}>
            {veiculo.imagem_url ? (
              <img src={apiUrl(veiculo.imagem_url)} alt={`Foto de ${veiculo.marca} ${veiculo.modelo}`} />
            ) : (
              <Car size={48} aria-hidden="true" />
            )}
          </div>
          <div>
            <span className="ficha-side-label">Preço de tabela</span>
            <strong className="ficha-price">{currency.format(veiculo.valor)}</strong>
          </div>
          <div>
            <span className="ficha-side-label">Quilometragem</span>
            <strong>{number.format(veiculo.quilometragem)} km</strong>
          </div>
        </aside>

        <div className="ficha-sections">
          <section className="card ficha-section">
            <h3>Identificação</h3>
            <dl className="ficha-dl">
              <Item label="Placa">{veiculo.placa}</Item>
              <Item label="Chassi">{veiculo.chassi}</Item>
              <Item label="RENAVAM">{veiculo.renavam}</Item>
            </dl>
          </section>

          <section className="card ficha-section">
            <h3>Características</h3>
            <dl className="ficha-dl">
              <Item label="Marca">{veiculo.marca}</Item>
              <Item label="Modelo">{veiculo.modelo}</Item>
              <Item label="Versão">{veiculo.versao}</Item>
              <Item label="Cor">{veiculo.cor}</Item>
              <Item label="Ano do modelo">{veiculo.ano_modelo}</Item>
              <Item label="Fabricação">{formatDate(veiculo.ano_fabricacao)}</Item>
              <Item label="Motorização">{veiculo.motorizacao}</Item>
              <Item label="Câmbio">{veiculo.cambio}</Item>
              <Item label="Combustível">{veiculo.combustivel}</Item>
              <Item label="Carroceria">{veiculo.carroceria}</Item>
              <Item label="Portas">{veiculo.portas}</Item>
              <Item label="Lugares">{veiculo.lugares}</Item>
              <Item label="Porta-malas">{veiculo.porta_malas} L</Item>
            </dl>
          </section>

          <section className="card ficha-section">
            <h3>Situação no pátio</h3>
            <dl className="ficha-dl">
              <Item label="Status">{statusLabel(veiculo.status)}</Item>
              <Item label="Vaga">{veiculo.vaga || '—'}</Item>
              <Item label="Data de entrada">{formatDate(veiculo.data_entrada)}</Item>
              <Item label="Tempo no pátio">{daysInLot} dias</Item>
            </dl>
          </section>
        </div>
      </div>

      {editing && (
        <VeiculoFormModal
          mode="edit"
          veiculo={veiculo}
          onClose={() => setEditing(false)}
          onSaved={(atualizado, warning) => {
            setVeiculo(atualizado)
            setEditing(false)
            setNotice(warning ?? 'Alterações salvas.')
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