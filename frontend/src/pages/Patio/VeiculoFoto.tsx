import { useState } from 'react'
import { Car } from 'lucide-react'
import { mediaUrl } from '../../api/client'

type Props = {
  /** Caminho que a API devolve em `imagem` (ex.: "/media/veiculos/foto.jpg"), ou null. */
  src: string | null
  alt: string
  /** Tamanho do ícone mostrado quando não há imagem. */
  iconSize: number
}

// Se o arquivo não existir neste computador (as imagens ficam na pasta media/ de quem enviou),
// mostra o ícone no lugar da imagem quebrada.
// Use com key={src} para que uma imagem nova tente carregar de novo.
export function VeiculoFoto({ src, alt, iconSize }: Props) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <Car size={iconSize} aria-hidden="true" />
  return <img src={mediaUrl(src)} alt={alt} onError={() => setFailed(true)} />
}
