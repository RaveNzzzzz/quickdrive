import { apiBlob } from '../../api/client'
import { toast } from '../../utils/toast'

/** Abre um comprovante em outra aba (o arquivo é protegido: vai com o token de acesso). `path` termina em /comprovante. */
export async function abrirComprovante(path: string) {
  // A aba é aberta já no clique, senão o navegador bloqueia o pop-up depois da espera pelo arquivo.
  const aba = window.open('', '_blank')
  try {
    const blob = await apiBlob(path)
    const url = URL.createObjectURL(blob)
    if (aba) aba.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    aba?.close()
    toast.error(err instanceof Error ? err.message : 'Não foi possível abrir o comprovante.')
  }
}
