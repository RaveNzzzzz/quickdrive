import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Car } from 'lucide-react'
import { api, apiUrl } from '../../api/client'
import { Modal } from '../../components/Modal'
import type { OpcaoApi, VeiculoApi, VeiculoPayload } from '../../types'
import { STATUS_OPTIONS } from './veiculoStatus'
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
    valor: v ? String(v.valor) : '',
    status: v?.status ?? 'disponivel',
    vaga: v?.vaga ?? '',
  }
}

function toPayload(v: FormValues): VeiculoPayload {
  return {
    marca_id: Number(v.marca_id),
    modelo: v.modelo.trim(),
    versao: v.versao.trim(),
    cor: v.cor.trim(),
    placa: v.placa.trim().toUpperCase(),
    chassi: v.chassi.trim().toUpperCase(),
    renavam: v.renavam.trim(),
    ano_modelo: Number(v.ano_modelo),
    ano_fabricacao: v.ano_fabricacao,
    motorizacao: v.motorizacao.trim(),
    cambio_id: Number(v.cambio_id),
    combustivel_id: Number(v.combustivel_id),
    carroceria_id: Number(v.carroceria_id),
    portas: Number(v.portas),
    lugares: Number(v.lugares),
    porta_malas: Number(v.porta_malas),
    quilometragem: Number(v.quilometragem),
    valor: Number(v.valor),
    status: v.status,
    vaga: v.vaga.trim(),
  }
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

  const bind = (key: keyof FormValues) => ({
    id: fid(key),
    name: key,
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      update(key, event.target.value),
  })

  const field = (key: keyof FormValues, label: string, control: ReactNode) => (
    <div className="vform-field">
      <label htmlFor={fid(key)}>{label}</label>
      {control}
    </div>
  )

  const selectField = (key: SelectKey, label: string, list: OpcaoApi[]) =>
    field(
      key,
      label,
      <select {...bind(key)} required disabled={!options}>
        <option value="" disabled>
          {options ? 'Selecione' : 'Carregando…'}
        </option>
        {list.map((item) => (
          <option key={item.id} value={String(item.id)}>
            {item.nome}
          </option>
        ))}
      </select>,
    )

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
            carroceria.
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
            {selectField('marca_id', 'Marca', options?.marcas ?? [])}
            {field('modelo', 'Modelo', <input {...bind('modelo')} maxLength={60} required />)}
            {field('versao', 'Versão', <input {...bind('versao')} maxLength={60} required />)}
            {field('cor', 'Cor', <input {...bind('cor')} maxLength={30} required />)}
          </div>
        </fieldset>

        <fieldset>
          <legend>Documentação</legend>
          <div className="vform-grid vform-grid-3">
            {field(
              'placa',
              'Placa',
              <input
                {...bind('placa')}
                onChange={(event) => update('placa', event.target.value.toUpperCase())}
                maxLength={8}
                required
              />,
            )}
            {field(
              'chassi',
              'Chassi',
              <input
                {...bind('chassi')}
                onChange={(event) => update('chassi', event.target.value.toUpperCase())}
                maxLength={17}
                required
              />,
            )}
            {field('renavam', 'RENAVAM', <input {...bind('renavam')} maxLength={20} required />)}
          </div>
        </fieldset>

        <fieldset>
          <legend>Características</legend>
          <div className="vform-grid vform-grid-3">
            {field(
              'ano_modelo',
              'Ano do modelo',
              <input {...bind('ano_modelo')} type="number" min={1900} max={2100} required />,
            )}
            {field(
              'ano_fabricacao',
              'Data de fabricação',
              <input {...bind('ano_fabricacao')} type="date" required />,
            )}
            {field(
              'motorizacao',
              'Motorização',
              <input {...bind('motorizacao')} maxLength={30} placeholder="Ex.: 2.0" required />,
            )}
            {selectField('cambio_id', 'Câmbio', options?.cambios ?? [])}
            {selectField('combustivel_id', 'Combustível', options?.combustiveis ?? [])}
            {selectField('carroceria_id', 'Carroceria', options?.carrocerias ?? [])}
            {field(
              'portas',
              'Portas',
              <input {...bind('portas')} type="number" min={2} max={6} required />,
            )}
            {field(
              'lugares',
              'Lugares',
              <input {...bind('lugares')} type="number" min={1} max={9} required />,
            )}
            {field(
              'porta_malas',
              'Porta-malas (litros)',
              <input {...bind('porta_malas')} type="number" min={0} required />,
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Situação e preço</legend>
          <div className="vform-grid">
            {field(
              'quilometragem',
              'Quilometragem (km)',
              <input {...bind('quilometragem')} type="number" min={0} required />,
            )}
            {field(
              'valor',
              'Preço de tabela (R$)',
              <input {...bind('valor')} type="number" min={0.01} step="0.01" required />,
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
            {field('vaga', 'Vaga (opcional)', <input {...bind('vaga')} maxLength={10} />)}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}