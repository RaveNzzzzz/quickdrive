import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { GripVertical, Pencil, Plus, Star, Undo2, X } from 'lucide-react'
import { api, apiUrl } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { ImagemVeiculoApi, OpcaoApi, VeiculoApi, VeiculoPayload } from '../../types'
import { STATUS_OPTIONS } from './veiculoStatus'
import { OpcaoFormModal } from './OpcaoFormModal'
import { OPCAO_ROTULOS, type TipoOpcao } from './opcoes'
import {
  ANO_MINIMO,
  CHASSI_RE,
  LIMITES,
  PLACA_RE,
  anoMaximoModelo,
  apenasDigitos,
  chassiDigitado,
  numeroParaValor,
  placaDigitada,
  renavamValido,
  valorDigitado,
  valorParaNumero,
} from './veiculoLimites'
import './Veiculo.css'

// Todos os campos do formulário são texto (é assim que os <input> trabalham).
// Na hora de enviar, convertemos para número onde precisa.
type FormValues = {
  marca_id: string
  modelo: string
  versao: string
  cor: string
  placa: string
  chassi: string
  renavam: string
  ano_modelo: string
  ano_fabricacao: string
  motorizacao: string
  cambio_id: string
  combustivel_id: string
  carroceria_id: string
  portas: string
  lugares: string
  porta_malas: string
  quilometragem: string
  valor: string
  status: string
  vaga: string
}

type Options = {
  marcas: OpcaoApi[]
  cambios: OpcaoApi[]
  combustiveis: OpcaoApi[]
  carrocerias: OpcaoApi[]
}

type SelectKey = 'marca_id' | 'cambio_id' | 'combustivel_id' | 'carroceria_id'

// Um item do carrossel em edição: já salvo no veículo, ou escolhido agora e ainda não enviado.
type FotoSlot =
  | { kind: 'existente'; id: number; foto: ImagemVeiculoApi; removida: boolean }
  | { kind: 'nova'; tempId: string; file: File; url: string }

// Qual foto (já salva ou nova) é a capa. `null` = nenhuma definida ainda.
type Principal = { kind: 'existente'; id: number } | { kind: 'nova'; tempId: string } | null

type Props = {
  mode: 'create' | 'edit'
  /** Obrigatório no modo "edit": o veículo que está sendo editado. */
  veiculo?: VeiculoApi
  onClose: () => void
  /** `warning` vem preenchido quando o veículo foi salvo mas a foto deu problema. */
  onSaved: (veiculo: VeiculoApi, warning?: string) => void
}

const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const FOTO_MAX_MB = 5
const MAX_FOTOS = 12

function toFormValues(v?: VeiculoApi): FormValues {
  return {
    marca_id: v ? String(v.marca_id) : '',
    modelo: v?.modelo ?? '',
    versao: v?.versao ?? '',
    cor: v?.cor ?? '',
    placa: v?.placa ?? '',
    chassi: v?.chassi ?? '',
    renavam: v?.renavam ?? '',
    ano_modelo: v ? String(v.ano_modelo) : '',
    ano_fabricacao: v?.ano_fabricacao ?? '',
    motorizacao: v?.motorizacao ?? '',
    cambio_id: v ? String(v.cambio_id) : '',
    combustivel_id: v ? String(v.combustivel_id) : '',
    carroceria_id: v ? String(v.carroceria_id) : '',
    portas: v ? String(v.portas) : '4',
    lugares: v ? String(v.lugares) : '5',
    porta_malas: v ? String(v.porta_malas) : '',
    quilometragem: v ? String(v.quilometragem) : '0',
    valor: v ? numeroParaValor(v.valor) : '',
    status: v?.status ?? 'disponivel',
    vaga: v?.vaga ?? '',
  }
}

// Junta espaços repetidos e tira os das pontas.
const limpar = (texto: string) => texto.trim().replace(/\s+/g, ' ')

function toPayload(v: FormValues): VeiculoPayload {
  return {
    marca_id: Number(v.marca_id),
    modelo: limpar(v.modelo),
    versao: limpar(v.versao),
    cor: limpar(v.cor),
    placa: placaDigitada(v.placa),
    chassi: chassiDigitado(v.chassi),
    renavam: v.renavam.trim(),
    ano_modelo: Number(v.ano_modelo),
    ano_fabricacao: v.ano_fabricacao,
    motorizacao: limpar(v.motorizacao),
    cambio_id: Number(v.cambio_id),
    combustivel_id: Number(v.combustivel_id),
    carroceria_id: Number(v.carroceria_id),
    portas: Number(v.portas),
    lugares: Number(v.lugares),
    porta_malas: Number(v.porta_malas),
    quilometragem: Number(v.quilometragem),
    valor: valorParaNumero(v.valor),
    status: v.status,
    vaga: limpar(v.vaga),
  }
}

// Data local de hoje no formato do <input type="date"> (AAAA-MM-DD).
function hojeIso(): string {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

type Problema = { campo: keyof FormValues; mensagem: string }

/** Regras que só dá para conferir com o campo completo (a digitação já barra o resto). */
function validar(v: FormValues, p: VeiculoPayload): Problema | null {
  const faixa = (campo: keyof FormValues, valor: number, min: number, max: number, rotulo: string) =>
    valor < min || valor > max ? { campo, mensagem: `${rotulo} deve estar entre ${min} e ${max}.` } : null

  if (!PLACA_RE.test(p.placa))
    return { campo: 'placa', mensagem: 'Placa inválida. Use o formato ABC1234 ou Mercosul ABC1D23.' }
  if (!CHASSI_RE.test(p.chassi))
    return { campo: 'chassi', mensagem: `O chassi deve ter ${LIMITES.chassi} caracteres (tem ${p.chassi.length}).` }
  if (p.renavam.length !== LIMITES.renavam)
    return { campo: 'renavam', mensagem: `O RENAVAM deve ter ${LIMITES.renavam} números (tem ${p.renavam.length}).` }
  if (!renavamValido(p.renavam))
    return { campo: 'renavam', mensagem: 'RENAVAM inválido: o dígito verificador não confere.' }

  const anoFab = Number(v.ano_fabricacao.slice(0, 4))
  if (!v.ano_fabricacao || v.ano_fabricacao < `${ANO_MINIMO}-01-01` || v.ano_fabricacao > hojeIso())
    return { campo: 'ano_fabricacao', mensagem: `A data de fabricação deve estar entre ${ANO_MINIMO} e hoje.` }
  if (p.ano_modelo !== anoFab && p.ano_modelo !== anoFab + 1)
    return {
      campo: 'ano_modelo',
      mensagem: `O ano do modelo deve ser ${anoFab} ou ${anoFab + 1} (igual ou 1 ano após a fabricação).`,
    }

  return (
    faixa('portas', p.portas, LIMITES.portas.min, LIMITES.portas.max, 'Portas') ??
    faixa('lugares', p.lugares, LIMITES.lugares.min, LIMITES.lugares.max, 'Lugares') ??
    (p.valor <= 0 ? { campo: 'valor', mensagem: 'Informe o preço do veículo.' } : null)
  )
}

export function VeiculoFormModal({ mode, veiculo, onClose, onSaved }: Props) {
  const uid = useId()
  const formId = `${uid}-form`
  const target = mode === 'edit' ? veiculo : undefined
  const editing = target !== undefined

  const [values, setValues] = useState<FormValues>(() => toFormValues(target))
  const [options, setOptions] = useState<Options | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Pop-up de criar/editar marca, câmbio, combustível ou carroceria (abre por cima deste).
  const [opcaoAberta, setOpcaoAberta] = useState<{
    tipo: TipoOpcao
    key: SelectKey
    opcao?: OpcaoApi
  } | null>(null)

  // Lista única de fotos na ordem do carrossel: as já salvas (podem ser marcadas para remoção,
  // com opção de desfazer) e as recém-escolhidas (ainda não enviadas). Dá para arrastar para reordenar
  // e marcar qualquer uma — já salva ou nova — como capa antes mesmo de salvar.
  const [slots, setSlots] = useState<FotoSlot[]>(() =>
    (target?.imagens ?? []).map((foto) => ({ kind: 'existente', id: foto.id, foto, removida: false })),
  )
  const [principal, setPrincipal] = useState<Principal>(() => {
    const atual = target?.imagens.find((i) => i.principal)
    return atual ? { kind: 'existente', id: atual.id } : null
  })
  const [fotoError, setFotoError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // Libera os endereços temporários (blob:) das fotos novas quando o modal fecha.
  const slotsRef = useRef(slots)
  useEffect(() => {
    slotsRef.current = slots
  }, [slots])
  useEffect(() => {
    return () => {
      slotsRef.current.forEach((s) => {
        if (s.kind === 'nova') URL.revokeObjectURL(s.url)
      })
    }
  }, [])

  const totalFotos = slots.filter((s) => s.kind === 'nova' || !s.removida).length

  function handleFotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!files.length) return

    const restantes = MAX_FOTOS - totalFotos
    if (files.length > restantes) {
      setFotoError(
        restantes > 0
          ? `Faltam ${restantes} vaga${restantes === 1 ? '' : 's'} para fotos (máximo ${MAX_FOTOS}).`
          : `Você já atingiu o máximo de ${MAX_FOTOS} fotos.`,
      )
      return
    }
    for (const file of files) {
      if (!FOTO_TIPOS.includes(file.type)) {
        setFotoError('Envie imagens JPG, PNG ou WEBP.')
        return
      }
      if (file.size > FOTO_MAX_MB * 1024 * 1024) {
        setFotoError(`Cada imagem deve ter no máximo ${FOTO_MAX_MB} MB.`)
        return
      }
    }
    setFotoError('')
    const novos: FotoSlot[] = files.map((file) => ({
      kind: 'nova',
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
    }))
    setSlots((prev) => [...prev, ...novos])
  }

  function removerFotoNova(tempId: string) {
    setSlots((prev) => {
      const alvo = prev.find((s) => s.kind === 'nova' && s.tempId === tempId)
      if (alvo?.kind === 'nova') URL.revokeObjectURL(alvo.url)
      return prev.filter((s) => !(s.kind === 'nova' && s.tempId === tempId))
    })
    setPrincipal((prev) => (prev?.kind === 'nova' && prev.tempId === tempId ? null : prev))
  }

  function alternarRemocaoExistente(id: number) {
    setSlots((prev) =>
      prev.map((s) => (s.kind === 'existente' && s.id === id ? { ...s, removida: !s.removida } : s)),
    )
    setPrincipal((prev) => (prev?.kind === 'existente' && prev.id === id ? null : prev))
  }

  // Arrastar para reordenar: atualiza a posição a cada vez que o item arrastado passa por cima de outro.
  function handleDragOver(index: number) {
    return (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (dragIndex === null || dragIndex === index) return
      setSlots((prev) => {
        const copia = [...prev]
        const [movido] = copia.splice(dragIndex, 1)
        copia.splice(index, 0, movido)
        return copia
      })
      setDragIndex(index)
    }
  }

  // Carrega as opções dos campos de seleção (marca, câmbio, combustível, carroceria).
  useEffect(() => {
    let active = true

    Promise.all([
      api<OpcaoApi[]>('/veiculos/opcoes/marcas'),
      api<OpcaoApi[]>('/veiculos/opcoes/cambios'),
      api<OpcaoApi[]>('/veiculos/opcoes/combustiveis'),
      api<OpcaoApi[]>('/veiculos/opcoes/carrocerias'),
    ])
      .then(([marcas, cambios, combustiveis, carrocerias]) => {
        if (active) setOptions({ marcas, cambios, combustiveis, carrocerias })
      })
      .catch((err: Error) => {
        if (active) setLoadError(err.message)
      })

    return () => {
      active = false
    }
  }, [])

  function update(key: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const fid = (key: keyof FormValues) => `${uid}-${key}`

  // `filtro` limpa o que foi digitado antes de guardar — é ele que impede passar do limite.
  const bind = (key: keyof FormValues, filtro: (texto: string) => string = (texto) => texto) => ({
    id: fid(key),
    name: key,
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      update(key, filtro(event.target.value)),
  })

  // Campo numérico: type="text" porque type="number" ignora maxLength e aceita "e", "-" e ",".
  const numero = (key: keyof FormValues, digitos: number) => ({
    ...bind(key, (texto) => apenasDigitos(texto, digitos)),
    inputMode: 'numeric' as const,
    maxLength: digitos,
    autoComplete: 'off',
  })

  const field = (key: keyof FormValues, label: string, control: ReactNode) => (
    <div className="vform-field">
      <label htmlFor={fid(key)}>{label}</label>
      {control}
    </div>
  )

  // Lista de seleção com os botões de criar (+) e editar (lápis) ao lado do rótulo.
  const selectField = (key: SelectKey, tipo: TipoOpcao, label: string) => {
    const list = options?.[tipo] ?? []
    const selecionada = list.find((item) => String(item.id) === values[key])
    const { singular, artigo } = OPCAO_ROTULOS[tipo]
    const novo = artigo === 'a' ? 'nova' : 'novo'

    return (
      <div className="vform-field">
        <div className="vform-label-row">
          <label htmlFor={fid(key)}>{label}</label>
          <div className="vform-label-actions">
            <button
              type="button"
              className="vform-icon-btn"
              onClick={() => setOpcaoAberta({ tipo, key })}
              disabled={!options || saving}
              aria-label={`Criar ${novo} ${singular}`}
              title={`Criar ${novo} ${singular}`}
            >
              <Plus size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="vform-icon-btn"
              onClick={() => selecionada && setOpcaoAberta({ tipo, key, opcao: selecionada })}
              disabled={!selecionada || saving}
              aria-label={
                selecionada ? `Editar ${singular} “${selecionada.nome}”` : `Selecione ${artigo} ${singular} para editar`
              }
              title={
                selecionada ? `Editar ${singular} “${selecionada.nome}”` : `Selecione ${artigo} ${singular} para editar`
              }
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
        <select {...bind(key)} required disabled={!options}>
          <option value="" disabled>
            {options ? 'Selecione' : 'Carregando…'}
          </option>
          {list.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // Depois de criar/editar: atualiza a lista (em ordem alfabética) e já deixa a opção selecionada.
  function handleOpcaoSalva(opcao: OpcaoApi) {
    if (!opcaoAberta) return
    const { tipo, key } = opcaoAberta
    setOptions((prev) => {
      if (!prev) return prev
      const outras = prev[tipo].filter((item) => item.id !== opcao.id)
      const lista = [...outras, opcao].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      return { ...prev, [tipo]: lista }
    })
    update(key, String(opcao.id))
    setOpcaoAberta(null)
  }

  const missingOptions =
    options !== null &&
    (options.marcas.length === 0 ||
      options.cambios.length === 0 ||
      options.combustiveis.length === 0 ||
      options.carrocerias.length === 0)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')

    const payload = toPayload(values)
    const requiredTexts = [
      payload.modelo,
      payload.versao,
      payload.cor,
      payload.placa,
      payload.chassi,
      payload.renavam,
      payload.motorizacao,
    ]
    if (requiredTexts.some((text) => text === '')) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    const problema = validar(values, payload)
    if (problema) {
      setError(problema.mensagem)
      document.getElementById(fid(problema.campo))?.focus()
      return
    }

    setSaving(true)
    try {
      const saved = target
        ? await api<VeiculoApi>(`/veiculos/${target.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await api<VeiculoApi>('/veiculos', {
            method: 'POST',
            body: JSON.stringify(payload),
          })

      // Passo 2: as fotos vão separadas (arquivo não cabe em JSON): remover, enviar as novas,
      // gravar a ordem final (já com os ids reais) e, por fim, marcar a capa.
      let final = saved
      let warning: string | undefined

      const idsOriginais = target?.imagens.map((i) => i.id) ?? []
      const principalOriginalId = target?.imagens.find((i) => i.principal)?.id ?? null
      const ativos = slots.filter((s) => s.kind === 'nova' || !s.removida)
      const removidos = slots.filter((s): s is Extract<FotoSlot, { kind: 'existente' }> => s.kind === 'existente' && s.removida)
      const novas = ativos.filter((s): s is Extract<FotoSlot, { kind: 'nova' }> => s.kind === 'nova')
      const ordemExistentesAtual = ativos.filter((s) => s.kind === 'existente').map((s) => s.id)
      const ordemMudou = ordemExistentesAtual.join(',') !== idsOriginais.filter((id) => ordemExistentesAtual.includes(id)).join(',')
      const principalAtualRef = principal?.kind === 'existente' ? principal.id : principal?.kind === 'nova' ? 'nova' : null
      const principalMudou = principalAtualRef !== principalOriginalId
      const tocouFotos = removidos.length > 0 || novas.length > 0 || ordemMudou || principalMudou

      if (tocouFotos) {
        try {
          for (const slot of removidos) {
            await api<unknown>(`/veiculos/${saved.id}/imagens/${slot.id}`, { method: 'DELETE' })
          }

          let idsReaisNovas: number[] = []
          if (novas.length) {
            const body = new FormData()
            novas.forEach((slot) => body.append('imagens', slot.file))
            const resposta = await api<ImagemVeiculoApi[]>(`/veiculos/${saved.id}/imagens`, {
              method: 'POST',
              body,
            })
            // As fotos novas entram no fim da lista, na mesma ordem em que foram enviadas.
            idsReaisNovas = resposta.slice(-novas.length).map((i) => i.id)
          }
          const idReal = new Map(novas.map((slot, i) => [slot.tempId, idsReaisNovas[i]]))

          const ordemFinal = ativos.map((s) => (s.kind === 'existente' ? s.id : idReal.get(s.tempId)!))
          if (ordemFinal.length) {
            await api<unknown>(`/veiculos/${saved.id}/imagens/ordenar`, {
              method: 'POST',
              body: JSON.stringify({ ids: ordemFinal }),
            })
          }

          const principalFinal =
            principal?.kind === 'existente' ? principal.id : principal?.kind === 'nova' ? idReal.get(principal.tempId) : undefined
          if (principalFinal !== undefined) {
            await api<unknown>(`/veiculos/${saved.id}/imagens/${principalFinal}/principal`, { method: 'POST' })
          }

          final = await api<VeiculoApi>(`/veiculos/${saved.id}`)
        } catch (err) {
          const motivo = err instanceof Error ? err.message : 'erro desconhecido'
          warning = `Veículo salvo, mas houve um problema com as fotos: ${motivo}`
        }
      }
      onSaved(final, warning)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o veículo.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? 'Editar veículo' : 'Adicionar veículo'}
      size="lg"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p className="vform-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary"
            disabled={saving || options === null}
          >
            {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar veículo'}
          </button>
        </>
      }
    >
      <form id={formId} className="vform" onSubmit={handleSubmit}>
        <p className="vform-hint">Todos os campos são obrigatórios, exceto a vaga.</p>

        {loadError && (
          <p className="vform-error" role="alert">
            Não foi possível carregar as opções: {loadError}
          </p>
        )}

        {missingOptions && (
          <p className="vform-warning" role="status">
            Antes de continuar, cadastre ao menos uma opção de cada: marca, câmbio, combustível e
            carroceria. Use o botão + ao lado de cada campo.
          </p>
        )}

        <fieldset>
          <legend>Fotos (opcional)</legend>
          <div className="vform-fotos">
            <div className="vform-fotos-grid">
              {slots.map((slot, index) => {
                const isNova = slot.kind === 'nova'
                const removida = slot.kind === 'existente' && slot.removida
                const ehPrincipal =
                  !removida &&
                  ((slot.kind === 'existente' && principal?.kind === 'existente' && principal.id === slot.id) ||
                    (slot.kind === 'nova' && principal?.kind === 'nova' && principal.tempId === slot.tempId))
                const src = slot.kind === 'existente' ? apiUrl(slot.foto.url) : slot.url
                const key = slot.kind === 'existente' ? `e-${slot.id}` : `n-${slot.tempId}`
                const podeArrastar = !saving && !removida

                return (
                  <div
                    key={key}
                    className={`vform-foto-item ${removida ? 'removida' : ''} ${dragIndex === index ? 'arrastando' : ''}`}
                    draggable={podeArrastar}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={handleDragOver(index)}
                    onDrop={(event) => event.preventDefault()}
                    onDragEnd={() => setDragIndex(null)}
                  >
                    {podeArrastar && <GripVertical size={12} className="vform-foto-grip" aria-hidden="true" />}
                    <img src={src} alt={isNova ? 'Nova foto escolhida' : 'Foto do veículo'} />
                    {isNova && !removida && <span className="vform-foto-nova">Nova</span>}
                    {ehPrincipal && <span className="vform-foto-capa">Capa</span>}
                    <div className="vform-foto-actions">
                      {!removida && !ehPrincipal && (
                        <button
                          type="button"
                          onClick={() =>
                            setPrincipal(
                              slot.kind === 'existente' ? { kind: 'existente', id: slot.id } : { kind: 'nova', tempId: slot.tempId },
                            )
                          }
                          disabled={saving}
                          aria-label="Definir como capa"
                          title="Definir como capa"
                        >
                          <Star size={13} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          slot.kind === 'existente' ? alternarRemocaoExistente(slot.id) : removerFotoNova(slot.tempId)
                        }
                        disabled={saving}
                        aria-label={removida ? 'Desfazer remoção' : 'Remover foto'}
                        title={removida ? 'Desfazer remoção' : 'Remover foto'}
                      >
                        {removida ? <Undo2 size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                )
              })}

              {totalFotos < MAX_FOTOS && (
                <>
                  <input
                    id={`${uid}-fotos`}
                    className="vform-file"
                    type="file"
                    accept={FOTO_TIPOS.join(',')}
                    multiple
                    onChange={handleFotosChange}
                    disabled={saving}
                  />
                  <label htmlFor={`${uid}-fotos`} className="vform-foto-add">
                    <Plus size={18} aria-hidden="true" />
                    Adicionar
                  </label>
                </>
              )}
            </div>
            <p className="vform-hint">
              JPG, PNG ou WEBP, até {FOTO_MAX_MB} MB cada · {totalFotos}/{MAX_FOTOS} fotos · arraste para reordenar ·
              clique na estrela para definir a capa
            </p>
            {fotoError && (
              <p className="vform-error" role="alert">
                {fotoError}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Identificação</legend>
          <div className="vform-grid">
            {selectField('marca_id', 'marcas', 'Marca')}
            {field('modelo', 'Modelo', <input {...bind('modelo')} maxLength={LIMITES.modelo} required />)}
            {field('versao', 'Versão', <input {...bind('versao')} maxLength={LIMITES.versao} required />)}
            {field('cor', 'Cor', <input {...bind('cor')} maxLength={LIMITES.cor} required />)}
          </div>
        </fieldset>

        <fieldset>
          <legend>Documentação</legend>
          <div className="vform-grid vform-grid-3">
            {field(
              'placa',
              'Placa',
              <input
                {...bind('placa', placaDigitada)}
                maxLength={LIMITES.placa}
                placeholder="ABC1D23"
                autoComplete="off"
                required
              />,
            )}
            {field(
              'chassi',
              'Chassi',
              <input
                {...bind('chassi', chassiDigitado)}
                maxLength={LIMITES.chassi}
                placeholder="17 caracteres"
                autoComplete="off"
                required
              />,
            )}
            {field(
              'renavam',
              'RENAVAM',
              <input {...numero('renavam', LIMITES.renavam)} placeholder="11 números" required />,
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Características</legend>
          <div className="vform-grid vform-grid-3">
            {field(
              'ano_modelo',
              'Ano do modelo',
              <input
                {...numero('ano_modelo', LIMITES.ano_modelo.digitos)}
                placeholder={`${ANO_MINIMO}–${anoMaximoModelo()}`}
                required
              />,
            )}
            {field(
              'ano_fabricacao',
              'Data de fabricação',
              // Sem `max`, o Chrome deixa digitar ano com 6 dígitos.
              <input
                {...bind('ano_fabricacao')}
                type="date"
                min={`${ANO_MINIMO}-01-01`}
                max={hojeIso()}
                required
              />,
            )}
            {field(
              'motorizacao',
              'Motorização',
              <input
                {...bind('motorizacao')}
                maxLength={LIMITES.motorizacao}
                placeholder="Ex.: 2.0"
                required
              />,
            )}
            {selectField('cambio_id', 'cambios', 'Câmbio')}
            {selectField('combustivel_id', 'combustiveis', 'Combustível')}
            {selectField('carroceria_id', 'carrocerias', 'Carroceria')}
            {field(
              'portas',
              'Portas',
              <input
                {...numero('portas', LIMITES.portas.digitos)}
                placeholder={`${LIMITES.portas.min} a ${LIMITES.portas.max}`}
                required
              />,
            )}
            {field(
              'lugares',
              'Lugares',
              <input
                {...numero('lugares', LIMITES.lugares.digitos)}
                placeholder={`${LIMITES.lugares.min} a ${LIMITES.lugares.max}`}
                required
              />,
            )}
            {field(
              'porta_malas',
              'Porta-malas (litros)',
              <input
                {...numero('porta_malas', LIMITES.porta_malas.digitos)}
                placeholder={`até ${LIMITES.porta_malas.max}`}
                required
              />,
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Situação e preço</legend>
          <div className="vform-grid">
            {field(
              'quilometragem',
              'Quilometragem (km)',
              <input
                {...numero('quilometragem', LIMITES.quilometragem.digitos)}
                placeholder="até 999999"
                required
              />,
            )}
            {field(
              'valor',
              'Preço de tabela (R$)',
              <input
                {...bind('valor', valorDigitado)}
                inputMode="numeric"
                placeholder="0,00"
                autoComplete="off"
                required
              />,
            )}
            {field(
              'status',
              'Status',
              <select {...bind('status')} required>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>,
            )}
            {field('vaga', 'Vaga (opcional)', <input {...bind('vaga')} maxLength={LIMITES.vaga} />)}
          </div>
        </fieldset>
      </form>

      {opcaoAberta && (
        <OpcaoFormModal
          tipo={opcaoAberta.tipo}
          opcao={opcaoAberta.opcao}
          onClose={() => setOpcaoAberta(null)}
          onSaved={handleOpcaoSalva}
        />
      )}
    </Modal>
  )
}