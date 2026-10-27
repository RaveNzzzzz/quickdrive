import { useEffect, useId, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Modal } from '../../components/Modal'
import type { EtapaApi, NegociacaoApi, NegociacaoEventoApi, Paginated, VeiculoApi } from '../../types'
import { formatarTelefone, soDigitos } from '../../utils/format'
import { diaMes, etapaTitulo, etapas, etapasAbertas, motivoLabel, origens } from './funil'

// Só o que o formulário usa de cliente e funcionário.
type PessoaOpcao = { id: number; pessoa: { nome: string; telefone: string } }

type Props = {
  /** Negociação a ver/editar. Sem ela, o formulário cria uma nova. */
  negociacao?: NegociacaoApi
  /** Etapa inicial da negociação nova (botão "Adicionar" de cada coluna). */
  etapaInicial?: EtapaApi
  /** false = só leitura (negociação de outro vendedor, para quem não é gerente). */
  podeEditar: boolean
  onClose: () => void
  onSaved: (negociacao: NegociacaoApi) => void
  onDelete?: (negociacao: NegociacaoApi) => void
}

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function NegociacaoFormModal({ negociacao, etapaInicial, podeEditar, onClose, onSaved, onDelete }: Props) {
  const formId = useId()
  const { user } = useAuth()
  const escolheVendedor = !!user?.pode_gerenciar
  const vendida = negociacao?.etapa === 'vendido'

  const [clientes, setClientes] = useState<PessoaOpcao[]>([])
  const [vendedores, setVendedores] = useState<PessoaOpcao[]>([])
  const [veiculos, setVeiculos] = useState<VeiculoApi[]>([])
  const [historico, setHistorico] = useState<NegociacaoEventoApi[] | null>(null)
  const [loading, setLoading] = useState(true)

  const [tipo, setTipo] = useState<'interessado' | 'cliente'>(negociacao?.cliente_id ? 'cliente' : 'interessado')
  const [nome, setNome] = useState(negociacao?.nome_interessado ?? '')
  const [telefone, setTelefone] = useState(negociacao ? formatarTelefone(negociacao.telefone) : '')
  const [clienteId, setClienteId] = useState(negociacao?.cliente_id ? String(negociacao.cliente_id) : '')
  const [veiculoId, setVeiculoId] = useState(negociacao?.veiculo_id ? String(negociacao.veiculo_id) : '')
  const [funcionarioId, setFuncionarioId] = useState(
    String(negociacao?.funcionario_id ?? user?.funcionario?.id ?? ''),
  )
  const [origem, setOrigem] = useState(negociacao?.origem ?? 'instagram')
  const [etapa, setEtapa] = useState<EtapaApi>(etapaInicial && etapasAbertas.includes(etapaInicial) ? etapaInicial : 'interesse')
  const [valor, setValor] = useState(negociacao?.valor_proposta ? String(negociacao.valor_proposta) : '')
  const [proximoPasso, setProximoPasso] = useState(negociacao?.proximo_passo ?? '')
  const [proximoContato, setProximoContato] = useState(negociacao?.proximo_contato ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api<Paginated<PessoaOpcao>>('/clientes?limit=1000'),
      // A lista de funcionários é só para gerentes (GestaoJWTAuth).
      escolheVendedor ? api<Paginated<PessoaOpcao>>('/funcionarios?limit=1000') : Promise.resolve(null),
      api<Paginated<VeiculoApi>>('/veiculos?limit=1000'),
      negociacao ? api<NegociacaoEventoApi[]>(`/negociacoes/${negociacao.id}/historico`) : Promise.resolve(null),
    ])
      .then(([c, f, v, h]) => {
        if (!active) return
        setClientes(c.items)
        if (f) setVendedores(f.items)
        // Só dá para negociar carro que ainda está à venda (o atual continua na lista ao editar).
        setVeiculos(
          v.items.filter(
            (x) => x.status === 'disponivel' || x.status === 'reservado' || x.id === negociacao?.veiculo_id,
          ),
        )
        setHistorico(h)
      })
      .catch((err: Error) => {
        if (active) setError(`Não foi possível carregar as opções: ${err.message}`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [negociacao, escolheVendedor])

  const veiculoEscolhido = veiculos.find((v) => String(v.id) === veiculoId)
  const semVendedor = !negociacao && !escolheVendedor && !funcionarioId

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    const fone = soDigitos(telefone)
    if (tipo === 'interessado' && fone && fone.length !== 10 && fone.length !== 11) {
      setError('Telefone deve ter DDD + número (10 ou 11 dígitos).')
      return
    }
    const valorNumero = valor ? Number(valor.replace(',', '.')) : null
    if (valorNumero !== null && (!Number.isFinite(valorNumero) || valorNumero <= 0)) {
      setError('O valor da proposta deve ser maior que zero.')
      return
    }
    const cliente = clientes.find((c) => String(c.id) === clienteId)
    const payload = {
      // Negociação vendida: cliente e veículo vêm da venda e não mudam por aqui.
      ...(vendida
        ? {}
        : {
            nome_interessado: tipo === 'cliente' ? (cliente?.pessoa.nome ?? nome) : nome,
            telefone: tipo === 'cliente' ? soDigitos(cliente?.pessoa.telefone ?? '') : fone,
            cliente_id: tipo === 'cliente' ? Number(clienteId) : null,
            veiculo_id: veiculoId ? Number(veiculoId) : null,
          }),
      ...(escolheVendedor ? { funcionario_id: Number(funcionarioId) } : {}),
      ...(negociacao ? {} : { etapa }),
      origem,
      valor_proposta: valorNumero === null ? null : valorNumero.toFixed(2),
      proximo_passo: proximoPasso,
      proximo_contato: proximoContato || null,
    }
    setSaving(true)
    try {
      const saved = await api<NegociacaoApi>(negociacao ? `/negociacoes/${negociacao.id}` : '/negociacoes', {
        method: negociacao ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  const titulo = !negociacao ? 'Nova negociação' : podeEditar ? 'Editar negociação' : 'Negociação'

  return (
    <Modal
      title={titulo}
      size="lg"
      onClose={onClose}
      busy={saving}
      footer={
        <>
          {error && (
            <p className="funil-error-text" role="alert">
              {error}
            </p>
          )}
          {negociacao && podeEditar && !vendida && onDelete && (
            <button
              type="button"
              className="btn btn-outline funil-btn-danger"
              onClick={() => onDelete(negociacao)}
              disabled={saving}
            >
              Excluir
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            {podeEditar ? 'Cancelar' : 'Fechar'}
          </button>
          {podeEditar && (
            <button type="submit" form={formId} className="btn btn-primary" disabled={saving || loading || semVendedor}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </>
      }
    >
      <form id={formId} className="funil-form" onSubmit={submit}>
        {!podeEditar && (
          <p className="funil-form-note">Só o vendedor responsável ou um gerente pode alterar esta negociação.</p>
        )}
        {vendida && (
          <p className="funil-form-note">
            Negociação vendida: cliente e veículo vêm da venda. Para desfazer, cancele a venda na tela de Vendas.
          </p>
        )}
        {negociacao?.etapa === 'perdido' && (
          <p className="funil-form-note">
            Perdida por: <strong>{motivoLabel[negociacao.motivo_perda] ?? negociacao.motivo_perda}</strong>
          </p>
        )}

        <fieldset disabled={saving || loading || !podeEditar}>
          {!vendida && (
            <div className="funil-form-choice" role="radiogroup" aria-label="Quem está negociando">
              <label>
                <input
                  type="radio"
                  name={`${formId}-tipo`}
                  checked={tipo === 'interessado'}
                  onChange={() => setTipo('interessado')}
                />
                Interessado novo
              </label>
              <label>
                <input
                  type="radio"
                  name={`${formId}-tipo`}
                  checked={tipo === 'cliente'}
                  onChange={() => setTipo('cliente')}
                />
                Cliente já cadastrado
              </label>
            </div>
          )}

          {vendida ? (
            <p>
              Cliente: <strong>{negociacao?.nome}</strong>
            </p>
          ) : tipo === 'interessado' ? (
            <div className="funil-form-row">
              <div>
                <label htmlFor={`${formId}-nome`}>Nome</label>
                <input id={`${formId}-nome`} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} required />
              </div>
              <div>
                <label htmlFor={`${formId}-telefone`}>Telefone (opcional)</label>
                <input
                  id={`${formId}-telefone`}
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 98765-4321"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <label htmlFor={`${formId}-cliente`}>Cliente</label>
              <select id={`${formId}-cliente`} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.pessoa.nome}
                  </option>
                ))}
              </select>
            </>
          )}
          {!vendida && tipo === 'interessado' && (
            <p>Só nome e telefone por enquanto. O cadastro completo (CPF, endereço) é pedido na hora da venda.</p>
          )}

          {vendida ? (
            <p>
              Veículo: <strong>{negociacao?.veiculo}</strong> ({negociacao?.veiculo_placa})
            </p>
          ) : (
            <>
              <label htmlFor={`${formId}-veiculo`}>Veículo de interesse (opcional)</label>
              <select id={`${formId}-veiculo`} value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
                <option value="">{loading ? 'Carregando…' : 'Ainda não escolheu'}</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} · {v.placa}
                    {v.status === 'reservado' ? ' · reservado' : ''}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="funil-form-row">
            <div>
              {escolheVendedor ? (
                <>
                  <label htmlFor={`${formId}-vendedor`}>Vendedor responsável</label>
                  <select
                    id={`${formId}-vendedor`}
                    value={funcionarioId}
                    onChange={(e) => setFuncionarioId(e.target.value)}
                    required
                  >
                    <option value="">{loading ? 'Carregando…' : 'Selecione'}</option>
                    {vendedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.pessoa.nome}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p>
                  Vendedor: <strong>{negociacao?.funcionario ?? user?.funcionario?.pessoa.nome ?? '—'}</strong>
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${formId}-origem`}>Origem</label>
              <select id={`${formId}-origem`} value={origem} onChange={(e) => setOrigem(e.target.value)}>
                {origens.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {semVendedor && <p>Sua conta não está ligada a um funcionário, então não pode criar negociações.</p>}

          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-valor`}>Valor da proposta (R$, opcional)</label>
              <input
                id={`${formId}-valor`}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder={veiculoEscolhido ? `Anunciado: ${veiculoEscolhido.valor}` : ''}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                disabled={vendida}
              />
            </div>
            <div>
              {negociacao ? (
                <p>
                  Etapa: <strong>{etapaTitulo[negociacao.etapa]}</strong>
                </p>
              ) : (
                <>
                  <label htmlFor={`${formId}-etapa`}>Etapa</label>
                  <select id={`${formId}-etapa`} value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaApi)}>
                    {etapas
                      .filter((e) => etapasAbertas.includes(e.id))
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="funil-form-row">
            <div>
              <label htmlFor={`${formId}-passo`}>Próximo passo</label>
              <input
                id={`${formId}-passo`}
                value={proximoPasso}
                onChange={(e) => setProximoPasso(e.target.value)}
                placeholder="Ex.: Ligar para confirmar o test drive"
                maxLength={200}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-contato`}>Data do próximo contato</label>
              <input
                id={`${formId}-contato`}
                type="date"
                value={proximoContato}
                onChange={(e) => setProximoContato(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        {negociacao && (
          <section className="funil-historico" aria-label="Histórico de etapas">
            <h3>Histórico</h3>
            {historico === null ? (
              <p>Carregando…</p>
            ) : (
              <ol>
                {historico.map((e) => (
                  <li key={e.id}>
                    <span>{dataHora.format(new Date(e.data))}</span>
                    {e.etapa_anterior ? (
                      <>
                        {etapaTitulo[e.etapa_anterior]} → <strong>{etapaTitulo[e.etapa_nova]}</strong>
                      </>
                    ) : (
                      <>
                        Criada em <strong>{etapaTitulo[e.etapa_nova]}</strong>
                      </>
                    )}
                    {e.funcionario && <span> · {e.funcionario}</span>}
                  </li>
                ))}
              </ol>
            )}
            <p>
              Cadastrada em {diaMes(negociacao.created_at.slice(0, 10))}
              {negociacao.telefone && ` · Telefone ${formatarTelefone(negociacao.telefone)}`}
            </p>
          </section>
        )}
      </form>
    </Modal>
  )
}
