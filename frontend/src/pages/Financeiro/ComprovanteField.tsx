import { useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { Dropzone } from '../../components/Dropzone'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

type Props = {
  /** Nome do comprovante já salvo na conta/compra (vazio = não tem). */
  savedName?: string | null
  /** Abre o comprovante salvo. */
  onView?: () => void
  /** Arquivo escolhido agora (ainda não enviado). */
  file: File | null
  onFile: (file: File | null) => void
  /** O comprovante salvo foi marcado para sair ao salvar. */
  removed: boolean
  onRemovedChange: (removed: boolean) => void
}

/** Campo "Comprovante de pagamento": arquivo atual (ver/remover) + área para arrastar e soltar um novo. */
export function ComprovanteField({ savedName, onView, file, onFile, removed, onRemovedChange }: Props) {
  const [error, setError] = useState('')
  const temSalvo = !!savedName && !removed

  return (
    <div className="fx-proof">
      <span className="fx-proof-label">Comprovante de pagamento (opcional)</span>

      {temSalvo && !file && (
        <div className="fx-proof-current">
          <span>
            Anexado: <strong>{savedName}</strong>
          </span>
          {onView && (
            <button type="button" className="btn btn-outline" onClick={onView}>
              <Eye size={14} />
              Ver
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={() => onRemovedChange(true)}>
            <Trash2 size={14} />
            Remover
          </button>
        </div>
      )}

      <Dropzone
        file={file}
        onChange={onFile}
        onError={setError}
        accept={TIPOS}
        maxMB={5}
        label={temSalvo ? 'Arraste um novo arquivo para substituir' : 'Arraste o comprovante aqui ou clique para escolher'}
        hint="Foto (JPG, PNG, WEBP) ou PDF · até 5 MB"
      />

      {removed && !file && !!savedName && (
        <p className="fx-proof-note">
          O comprovante atual será removido ao salvar.{' '}
          <button type="button" className="vd-link-btn" onClick={() => onRemovedChange(false)}>
            Desfazer
          </button>
        </p>
      )}
      {error && (
        <p className="fx-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
