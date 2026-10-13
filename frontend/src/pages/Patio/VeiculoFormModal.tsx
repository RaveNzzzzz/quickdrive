import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Car, Pencil, Plus } from 'lucide-react'
import { api, apiUrl } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { OpcaoApi, VeiculoApi, VeiculoPayload } from '../../types'
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

  // Foto: `foto` é o arquivo escolhido agora; `removerFoto` marca que a foto atual deve ser apagada.
  const [foto, setFoto] = useState<File | null>(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [fotoError, setFotoError] = useState('')

  // Endereço temporário para mostrar o arquivo escolhido antes de enviar.
  const fotoPreview = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto])
  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    }
  }, [fotoPreview])

  const fotoAtual = target?.imagem_url && !removerFoto ? apiUrl(target.imagem_url) : null
  const fotoMostrada = fotoPreview ?? fotoAtual

  function handleFotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!file) return

    if (!FOTO_TIPOS.includes(file.type)) {
      setFotoError('Envie uma imagem JPG, PNG ou WEBP.')
      return
    }
    if (file.size > FOTO_MAX_MB * 1024 * 1024) {
      setFotoError(`A imagem deve ter no máximo ${FOTO_MAX_MB} MB.`)
      return
    }
    setFotoError('')
    setFoto(file)
    setRemoverFoto(false)
  }

  function handleRemoverFoto() {
    setFoto(null)
    setFotoError('')
    if (target?.imagem_url) setRemoverFoto(true)
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

      // Passo 2: a foto vai separada, em FormData (arquivo não cabe em JSON).
      let final = saved
      let warning: string | undefined
      try {
        if (foto) {
          const body = new FormData()
          body.append('imagem', foto)
          final = await api<VeiculoApi>(`/veiculos/${saved.id}/imagem`, { method: 'POST', body })
        } else if (removerFoto && target?.imagem_url) {
          await api<null>(`/veiculos/${saved.id}/imagem`, { method: 'DELETE' })
          final = { ...saved, imagem_url: null }
        }
      } catch (err) {
        const motivo = err instanceof Error ? err.message : 'erro desconhecido'
        warning = `Veículo salvo, mas a foto não foi atualizada: ${motivo}`
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
          <legend>Foto (opcional)</legend>
          <div className="vform-photo">
            <div className="vform-photo-preview">
              {fotoMostrada ? (
                <img src={fotoMostrada} alt="Pré-visualização da foto do veículo" />
              ) : (
                <Car size={32} aria-hidden="true" />
              )}
            </div>
            <div className="vform-photo-actions">
              <div className="vform-photo-buttons">
                <input
                  id={`${uid}-foto`}
                  className="vform-file"
                  type="file"
                  accept={FOTO_TIPOS.join(',')}
                  onChange={handleFotoChange}
                  disabled={saving}
                />
                <label htmlFor={`${uid}-foto`} className="btn btn-outline">
                  {fotoMostrada ? 'Trocar foto' : 'Escolher foto'}
                </label>
                {fotoMostrada && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleRemoverFoto}
                    disabled={saving}
                  >
                    Remover foto
                  </button>
                )}
              </div>
              <p className="vform-hint">JPG, PNG ou WEBP, até {FOTO_MAX_MB} MB.</p>
              {fotoError && (
                <p className="vform-error" role="alert">
                  {fotoError}
                </p>
              )}
            </div>
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