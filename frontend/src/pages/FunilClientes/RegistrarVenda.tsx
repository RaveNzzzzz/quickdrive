import { useState } from 'react'
import { api } from '../../api/client'
import { Modal } from '../../components/Modal'
import { avisarVendasAlteradas } from '../../hooks/vendasAlteradas'
import type { NegociacaoApi, VendaApi } from '../../types'
import { ClienteFormModal } from '../Clientes/ClienteFormModal'
import { VendaFormModal } from '../Vendas/VendaFormModal'

type Props = {
  negociacao: NegociacaoApi
  onClose: () => void
  /** Chamado com a negociação já em "Vendido". */
  onDone: (negociacao: NegociacaoApi) => void
  /** Chamado quando a negociação muda no meio do caminho (ex.: ganhou um cliente), mesmo se o usuário desistir depois. */
  onChange: (negociacao: NegociacaoApi) => void
}

/**
 * "Registrar venda" de uma negociação, em até 3 passos:
 * 1) se ainda for só um interessado, cadastra o cliente completo e liga à negociação;
 * 2) registra a venda (mesmo formulário da tela de Vendas, já preenchido);
 * 3) liga a venda à negociação, que vai para "Vendido".
 */
export function RegistrarVenda({ negociacao: inicial, onClose, onDone, onChange }: Props) {
  const [negociacao, setNegociacao] = useState(inicial)
  // A venda criada no passo 2. Se o passo 3 falhar, tentamos ligar de novo sem criar outra venda.
  const [venda, setVenda] = useState<VendaApi | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function ligarCliente(clienteId: number) {
    const atualizada = await api<NegociacaoApi>(`/negociacoes/${negociacao.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ cliente_id: clienteId }),
    })
    setNegociacao(atualizada)
    onChange(atualizada)
  }

  async function ganhar(vendaCriada: VendaApi) {
    setVenda(vendaCriada)
    setBusy(true)
    setError('')
    try {
      const vendida = await api<NegociacaoApi>(`/negociacoes/${negociacao.id}/ganhar`, {
        method: 'POST',
        body: JSON.stringify({ venda_id: vendaCriada.id }),
      })
      onDone(vendida)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ligar a venda à negociação.')
    } finally {
      setBusy(false)
    }
  }

  // Passo 1: o interessado ainda não tem cadastro completo.
  if (!negociacao.cliente_id) {
    return (
      <>
        <ClienteFormModal
          inicial={{ nome: negociacao.nome_interessado, telefone: negociacao.telefone }}
          aviso="Passo 1 de 2: para registrar a venda, o interessado precisa virar cliente com cadastro completo."
          textoSalvar="Cadastrar e continuar"
          onClose={onClose}
          onSaved={(cliente) => {
            ligarCliente(cliente.id).catch((err: Error) =>
              setError(`Cliente cadastrado, mas não foi possível ligá-lo à negociação: ${err.message}`),
            )
          }}
        />
        {error && (
          <Modal title="Algo deu errado" size="sm" onClose={onClose}>
            <p className="funil-error-text" role="alert">
              {error}
            </p>
          </Modal>
        )}
      </>
    )
  }

  // Passo 2: registrar a venda.
  if (!venda) {
    return (
      <VendaFormModal
        aviso={`${inicial.cliente_id ? 'Registre' : 'Passo 2 de 2: registre'} a venda da negociação com ${negociacao.nome}.`}
        inicial={{
          veiculoId: negociacao.veiculo_id,
          clienteId: negociacao.cliente_id,
          funcionarioId: negociacao.funcionario_id,
          valor: negociacao.valor_proposta ?? negociacao.veiculo_valor,
        }}
        onClose={onClose}
        onSaved={(vendaCriada) => {
          avisarVendasAlteradas()
          ganhar(vendaCriada)
        }}
      />
    )
  }

  // Passo 3: ligando a venda (ou mostrando o erro, com opção de tentar de novo).
  return (
    <Modal
      title="Registrar venda"
      size="sm"
      onClose={onClose}
      busy={busy}
      footer={
        error ? (
          <>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Fechar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => ganhar(venda)}>
              Tentar de novo
            </button>
          </>
        ) : undefined
      }
    >
      {error ? (
        <>
          <p>A venda foi registrada, mas não foi possível marcar a negociação como vendida.</p>
          <p className="funil-error-text" role="alert">
            {error}
          </p>
        </>
      ) : (
        <p>Ligando a venda à negociação…</p>
      )}
    </Modal>
  )
}
