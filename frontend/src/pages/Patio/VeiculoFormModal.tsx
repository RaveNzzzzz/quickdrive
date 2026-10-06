import {
    useEffect,
    useId,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
  } from 'react'
  import { ImagePlus } from 'lucide-react'
  import { api, mediaUrl } from '../../api/client'
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

  // Mesmas regras do backend (vehicles/api.py), para avisar antes de enviar.
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const IMAGE_MAX_MB = 5

  type Props = {
    mode: 'create' | 'edit'
    /** Obrigatório no modo "edit": o veículo que está sendo editado. */
    veiculo?: VeiculoApi
    onClose: () => void
    /** `aviso` vem preenchido quando os dados foram salvos, mas a imagem não. */
    onSaved: (veiculo: VeiculoApi, aviso?: string) => void
  }
  
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
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imageError, setImageError] = useState('')

    // Prévia da imagem escolhida (ou a atual do veículo, na edição).
    const previewUrl = useMemo(
      () => (imageFile ? URL.createObjectURL(imageFile) : null),
      [imageFile],
    )
    useEffect(() => {
      return () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
      }
    }, [previewUrl])
    const shownImage = previewUrl ?? (target?.imagem ? mediaUrl(target.imagem) : null)

    function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0] ?? null
      setImageError('')
      if (file && !IMAGE_TYPES.includes(file.type)) {
        setImageError('Escolha uma imagem JPG, PNG ou WEBP.')
        event.target.value = ''
        return
      }
      if (file && file.size > IMAGE_MAX_MB * 1024 * 1024) {
        setImageError(`A imagem deve ter no máximo ${IMAGE_MAX_MB} MB.`)
        event.target.value = ''
        return
      }
      setImageFile(file)
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
        if (!imageFile) {
          onSaved(saved)
          return
        }

        // A imagem vai numa segunda requisição, porque arquivo não cabe no JSON.
        const formData = new FormData()
        formData.append('imagem', imageFile)
        try {
          const withImage = await api<VeiculoApi>(`/veiculos/${saved.id}/imagem`, {
            method: 'POST',
            body: formData,
          })
          onSaved(withImage)
        } catch (err) {
          // Os dados já foram salvos: fecha mesmo assim (repetir criaria um veículo duplicado).
          const motivo = err instanceof Error ? err.message : 'erro desconhecido'
          onSaved(saved, `Veículo salvo, mas a imagem não foi enviada: ${motivo}`)
        }
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
          <p className="vform-hint">Todos os campos são obrigatórios, exceto a vaga e a imagem.</p>
  
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

          <fieldset>
            <legend>Imagem</legend>
            <div className="vform-image">
              <div className="vform-image-preview">
                {shownImage ? (
                  <img src={shownImage} alt="Prévia da imagem do veículo" />
                ) : (
                  <span>Sem imagem</span>
                )}
              </div>
              <div className="vform-field">
                <label htmlFor={`${uid}-imagem`}>
                  {target?.imagem ? 'Trocar imagem (opcional)' : 'Imagem (opcional)'}
                </label>
                {/* O input nativo fica invisível (mas continua acessível pelo teclado);
                    o <label> abaixo faz o papel de botão e abre a escolha de arquivo. */}
                <div className="vform-file">
                  <input
                    id={`${uid}-imagem`}
                    className="vform-file-input"
                    type="file"
                    accept={IMAGE_TYPES.join(',')}
                    onChange={handleImageChange}
                    disabled={saving}
                  />
                  <label htmlFor={`${uid}-imagem`} className="btn btn-outline vform-file-btn">
                    <ImagePlus size={16} aria-hidden="true" />
                    Escolher Imagem
                  </label>
                  <span className="vform-file-name">
                    {imageFile?.name ?? 'Nenhuma imagem escolhida'}
                  </span>
                </div>
                <p className="vform-hint">JPG, PNG ou WEBP, até {IMAGE_MAX_MB} MB.</p>
                {imageError && (
                  <p className="vform-error" role="alert">
                    {imageError}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
        </form>
      </Modal>
    )
  }