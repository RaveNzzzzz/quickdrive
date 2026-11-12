import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Pencil } from 'lucide-react'
import { apiBlob } from '../../api/client'
import { Modal } from '../../components/Modal'
import { Skeleton } from '../../components/Skeleton'
import { mascarar } from '../../utils/privacy'
import { comprovantePath, currencyCents, dueHint, formatDate, statusLabel, statusOf, type Conta } from './financeiroUtils'

type Props = {
  conta: Conta
  today: string
  /** Valores escondidos (botão "Ocultar valores"). */
  oculto: boolean
  /** Comissão do vendedor já formatada (só para quem gerencia, em conta a receber de uma venda). */
  comissao?: string | null
  onClose: () => void
  onEdit: (conta: Conta) => void
}

type Arquivo = { url: string; tipo: string }

/** Todos os detalhes da conta da listagem, com o comprovante embaixo (foto na tela; PDF só como link). */
export function ContaDetalhesModal({ conta, today, oculto, comissao, onClose, onEdit }: Props) {
  const status = statusOf(conta, today)
  const receber = conta.kind === 'receber'
  const [arquivo, setArquivo] = useState<Arquivo | null>(null)
  const [carregando, setCarregando] = useState(!!conta.hasProof)
  const [erro, setErro] = useState('')

  // Baixa o comprovante (com o token de acesso) e cria um endereço temporário para exibir/abrir.
  useEffect(() => {
    if (!conta.hasProof) return
    let ativo = true
    let url: string | null = null
    apiBlob(comprovantePath(conta))
      .then((blob) => {
        if (!ativo) return
        url = URL.createObjectURL(blob)
        setArquivo({ url, tipo: blob.type })
      })
      .catch((err: Error) => {
        if (ativo) setErro(err.message)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [conta])

  const ehImagem = arquivo?.tipo.startsWith('image/') ?? false

  return (
    <Modal
      title="Detalhes da conta"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose()
              onEdit(conta)
            }}
          >
            <Pencil size={14} />
            Editar
          </button>
        </>
      }
    >
      <div className="fx-details">
        <h3 className="fx-details-title">{conta.description}</h3>
        <dl className="fx-details-grid">
          <div>
            <dt>{receber ? 'Receita' : 'Despesa'}</dt>
            <dd>{conta.note}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>
              <span className={`fx-kind fx-kind-${conta.kind}`}>{receber ? 'Receber' : 'Pagar'}</span>
            </dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{conta.category}</dd>
          </div>
          <div>
            <dt>Valor</dt>
            <dd className={`fx-amount-${conta.kind}`}>
              <strong>
                {conta.kind === 'pagar' ? '− ' : ''}
                {mascarar(currencyCents.format(conta.amount), oculto)}
              </strong>
            </dd>
          </div>
          <div>
            <dt>Vencimento</dt>
            <dd>
              {formatDate(conta.dueDate)} <small>({dueHint(conta, today)})</small>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`fx-pill fx-pill-${status}`}>{statusLabel(status, conta.kind)}</span>
            </dd>
          </div>
          {conta.paidAt && (
            <div>
              <dt>{receber ? 'Data do recebimento' : 'Data do pagamento'}</dt>
              <dd>{formatDate(conta.paidAt)}</dd>
            </div>
          )}
          {comissao && (
            <div>
              <dt>Comissão do vendedor</dt>
              <dd>{comissao}</dd>
            </div>
          )}
        </dl>

        <section className="fx-details-proof" aria-label="Comprovante de pagamento">
          <h4>Comprovante de pagamento</h4>
          {!conta.hasProof ? (
            <p className="fx-details-empty">Nenhum comprovante anexado.</p>
          ) : carregando ? (
            <Skeleton height={180} radius={12} />
          ) : erro ? (
            <p className="fx-error-text" role="alert">
              Não foi possível carregar o comprovante: {erro}
            </p>
          ) : arquivo ? (
            ehImagem ? (
              <>
                <img className="fx-proof-img" src={arquivo.url} alt={`Comprovante: ${conta.proofName}`} />
                <a className="fx-proof-link" href={arquivo.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} />
                  Abrir {conta.proofName} em outra aba
                </a>
              </>
            ) : (
              <a className="fx-proof-link" href={arquivo.url} target="_blank" rel="noopener noreferrer">
                <FileText size={16} />
                {conta.proofName}
                <ExternalLink size={14} />
              </a>
            )
          ) : null}
        </section>
      </div>
    </Modal>
  )
}
