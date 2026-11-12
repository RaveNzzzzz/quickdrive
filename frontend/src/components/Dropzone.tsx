import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { FileText, Trash2, UploadCloud } from 'lucide-react'
import './Dropzone.css'

type Props = {
  /** Arquivo escolhido agora (ainda não enviado). */
  file: File | null
  onChange: (file: File | null) => void
  /** Mensagem de erro de validação (tipo ou tamanho). */
  onError?: (message: string) => void
  /** Tipos aceitos, ex.: ['image/jpeg', 'image/png', 'application/pdf']. */
  accept: string[]
  maxMB?: number
  label?: string
  hint?: string
  disabled?: boolean
}

function tamanho(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Área para arrastar e soltar um arquivo (ou clicar para escolher). */
export function Dropzone({
  file,
  onChange,
  onError,
  accept,
  maxMB = 5,
  label = 'Arraste o arquivo aqui ou clique para escolher',
  hint,
  disabled = false,
}: Props) {
  const uid = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  // Miniatura das imagens (PDF mostra só o ícone). O endereço temporário é liberado ao trocar/sair.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function receber(arquivo: File | undefined) {
    if (!arquivo) return
    if (!accept.includes(arquivo.type)) {
      onError?.('Formato não aceito. Envie uma foto (JPG, PNG, WEBP) ou um PDF.')
      return
    }
    if (arquivo.size > maxMB * 1024 * 1024) {
      onError?.(`O arquivo deve ter no máximo ${maxMB} MB.`)
      return
    }
    onError?.('')
    onChange(arquivo)
  }

  function soltar(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    receber(event.dataTransfer.files?.[0])
  }

  function teclado(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  if (file) {
    return (
      <div className="dropzone-file">
        {preview ? (
          <img src={preview} alt="" className="dropzone-thumb" />
        ) : (
          <span className="dropzone-icon" aria-hidden="true">
            <FileText size={22} />
          </span>
        )}
        <div className="dropzone-file-info">
          <strong>{file.name}</strong>
          <span>{tamanho(file.size)}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Remover arquivo"
        >
          <Trash2 size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-labelledby={`${uid}-label`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={teclado}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={soltar}
    >
      <UploadCloud size={26} aria-hidden="true" />
      <strong id={`${uid}-label`}>{label}</strong>
      {hint && <span>{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        hidden
        disabled={disabled}
        onChange={(event) => {
          receber(event.target.files?.[0])
          event.target.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />
    </div>
  )
}
