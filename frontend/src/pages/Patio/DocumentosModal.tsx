import { useId, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../utils/toast'
import { Modal } from '../../components/Modal'
import type { DocumentoVeiculoApi } from '../../types'
import './Veiculo.css'

type Props = {
  veiculoId: number
  documentos: DocumentoVeiculoApi[]
  onClose: () => void
  /** Chamado a cada mudança, com a lista já atualizada. */
  onChange: (documentos: DocumentoVeiculoApi[]) => void
}

export function DocumentosModal({ veiculoId, documentos, onClose, onChange }: Props) {
  const uid = useId()
  const [nome, setNome] = useState('')
  const [situacao, setSituacao] = useState('')
  const [regular, setRegular] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const base = `/veiculos/${veiculoId}/documentos`

  async function executar(sucesso: string, acao: () => Promise<DocumentoVeiculoApi[]>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      onChange(await acao())
      toast.success(sucesso)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o documento.')
    } finally {
      setBusy(false)
    }
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!nome.trim() || !situacao.trim()) {
      setError('Informe o nome e a situação do documento.')
      return
    }
    void executar('Documento adicionado com sucesso!', async () => {
      const criado = await api<DocumentoVeiculoApi>(base, {
        method: 'POST',
        body: JSON.stringify({ nome, situacao, regular }),
      })
      setNome('')
      setSituacao('')
      setRegular(true)
      return [...documentos, criado]
    })
  }

  function alternar(doc: DocumentoVeiculoApi) {
    void executar('Documento atualizado com sucesso!', async () => {
      const atualizado = await api<DocumentoVeiculoApi>(`${base}/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nome: doc.nome, situacao: doc.situacao, regular: !doc.regular }),
      })
      return documentos.map((d) => (d.id === doc.id ? atualizado : d))
    })
  }

  function remover(doc: DocumentoVeiculoApi) {
    void executar('Documento removido com sucesso!', async () => {
      await api<null>(`${base}/${doc.id}`, { method: 'DELETE' })
      return documentos.filter((d) => d.id !== doc.id)
    })
  }

  return (
    <Modal
      title="Editar documentos"
      size="md"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="vform-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose} disabled={busy}>
            Concluir
          </button>
        </>
      }
    >
      {documentos.length === 0 ? (
        <p className="vform-hint">Nenhum documento cadastrado para este veículo.</p>
      ) : (
        <ul className="docmodal-list">
          {documentos.map((doc) => (
            <li key={doc.id}>
              <span className="docmodal-nome">{doc.nome}</span>
              <button
                type="button"
                className={`ficha-doc-badge ${doc.regular ? 'ficha-doc-ok' : 'ficha-doc-pendente'}`}
                onClick={() => alternar(doc)}
                disabled={busy}
                title="Clique para alternar entre regular e pendente"
              >
                {doc.situacao}
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => remover(doc)}
                disabled={busy}
                aria-label={`Remover ${doc.nome}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="vform docmodal-form" onSubmit={handleAdd}>
        <div className="vform-grid">
          <div className="vform-field">
            <label htmlFor={`${uid}-nome`}>Documento</label>
            <input
              id={`${uid}-nome`}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              maxLength={60}
              placeholder="Ex.: CRLV 2026"
              autoComplete="off"
            />
          </div>
          <div className="vform-field">
            <label htmlFor={`${uid}-situacao`}>Situação</label>
            <input
              id={`${uid}-situacao`}
              value={situacao}
              onChange={(event) => setSituacao(event.target.value)}
              maxLength={30}
              placeholder="Ex.: Em dia, Pago, Pendente"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="docmodal-actions">
          <label className="docmodal-check">
            <input type="checkbox" checked={regular} onChange={(event) => setRegular(event.target.checked)} />
            Regular (desmarque se houver pendência)
          </label>
          <button type="submit" className="btn btn-outline" disabled={busy}>
            Adicionar documento
          </button>
        </div>
      </form>
    </Modal>
  )
}
