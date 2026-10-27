import { useRef, useState, type DragEvent } from 'react'
import { Car, MoreHorizontal, Phone } from 'lucide-react'
import { useDismiss } from '../../components/useDismiss'
import type { EtapaApi, NegociacaoApi } from '../../types'
import { currency, formatarTelefone } from '../../utils/format'
import {
  diaMes,
  diasDesde,
  ehAberta,
  etapas,
  motivoLabel,
  origemLabel,
  staleThresholdDays,
} from './funil'

type Props = {
  negociacao: NegociacaoApi
  hoje: string
  podeEditar: boolean
  arrastando: boolean
  soltarAntes: boolean
  onAbrir: () => void
  onMover: (etapa: EtapaApi) => void
  onRegistrarVenda: () => void
  onPerder: () => void
  onExcluir: () => void
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}

function initials(name: string) {
  const parts = name.replace('[TESTE]', '').trim().split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : (parts[0]?.charAt(1) ?? '')
  return (first + last).toUpperCase()
}

export function NegociacaoCard(props: Props) {
  const { negociacao: n, hoje, podeEditar } = props
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useDismiss(menuRef, menuAberto, () => setMenuAberto(false))

  const aberta = ehAberta(n.etapa)
  const dias = diasDesde(n.etapa_desde)
  const parada = aberta && dias >= staleThresholdDays
  const contatoAtrasado = aberta && !!n.proximo_contato && n.proximo_contato < hoje
  const contatoHoje = aberta && n.proximo_contato === hoje
  const valor = n.valor_proposta ?? n.veiculo_valor
  // Vendido não sai pelo arrastar (só cancelando a venda).
  const arrastavel = podeEditar && n.etapa !== 'vendido'

  function escolher(acao: () => void) {
    setMenuAberto(false)
    acao()
  }

  return (
    <article
      draggable={arrastavel}
      onDragStart={arrastavel ? props.onDragStart : undefined}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      className={[
        'funil-card',
        arrastavel ? 'funil-card-draggable' : '',
        parada || contatoAtrasado ? 'funil-card-stale' : '',
        props.arrastando ? 'funil-card-dragging' : '',
        props.soltarAntes ? 'funil-card-drop-before' : '',
      ].join(' ')}
    >
      <div className="funil-card-head">
        <span className="funil-avatar" aria-hidden="true">
          {initials(n.nome)}
        </span>
        <div className="funil-card-person">
          <button type="button" className="funil-card-open" onClick={props.onAbrir}>
            {n.nome}
          </button>
          <span>
            {origemLabel[n.origem] ?? n.origem}
            {!n.cliente_id && ' · interessado'}
          </span>
        </div>
        <div className="funil-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="funil-more"
            aria-label={`Ações para ${n.nome}`}
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuAberto && (
            <div className="funil-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => escolher(props.onAbrir)}>
                {podeEditar ? 'Abrir / editar' : 'Ver detalhes'}
              </button>
              {podeEditar && n.etapa !== 'vendido' && (
                <>
                  <span className="funil-menu-title">Mover para</span>
                  {etapas
                    .filter((e) => ehAberta(e.id) && e.id !== n.etapa)
                    .map((e) => (
                      <button key={e.id} type="button" role="menuitem" onClick={() => escolher(() => props.onMover(e.id))}>
                        {e.title}
                      </button>
                    ))}
                  <span className="funil-menu-title">Encerrar</span>
                  <button type="button" role="menuitem" onClick={() => escolher(props.onRegistrarVenda)}>
                    Registrar venda
                  </button>
                  {n.etapa !== 'perdido' && (
                    <button type="button" role="menuitem" onClick={() => escolher(props.onPerder)}>
                      Marcar como perdida
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="funil-menu-danger"
                    onClick={() => escolher(props.onExcluir)}
                  >
                    Excluir
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="funil-vehicle">
        <Car size={14} aria-hidden="true" />
        {n.veiculo ? `${n.veiculo} · ${n.veiculo_placa}` : 'Veículo não escolhido'}
      </div>

      <div className="funil-card-row">
        <strong className="funil-price">{valor ? currency.format(valor) : '—'}</strong>
        <span className={parada ? 'funil-danger' : ''}>
          {n.etapa === 'vendido'
            ? `vendido há ${dias}d`
            : n.etapa === 'perdido'
              ? (motivoLabel[n.motivo_perda] ?? 'perdida')
              : dias === 0
                ? 'entrou hoje'
                : `${dias}d nesta etapa`}
        </span>
      </div>

      <div className="funil-card-footer">
        <span>{n.funcionario.replace('[TESTE]', '').trim()}</span>
        {aberta && (
          <span className={contatoAtrasado ? 'funil-danger' : contatoHoje ? 'funil-warning' : 'funil-next'}>
            {n.proximo_contato && `${contatoHoje ? 'Hoje' : diaMes(n.proximo_contato)} · `}
            {n.proximo_passo || 'Definir próximo passo'}
          </span>
        )}
      </div>
      {aberta && n.telefone && (
        <a className="funil-phone" href={`tel:${n.telefone}`}>
          <Phone size={12} aria-hidden="true" />
          {formatarTelefone(n.telefone)}
        </a>
      )}
    </article>
  )
}
