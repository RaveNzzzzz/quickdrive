import { useEffect, useRef, useState } from 'react'
import { Car, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiUrl } from '../../api/client'
import type { ImagemVeiculoApi } from '../../types'

type Props = {
  imagens: ImagemVeiculoApi[]
  alt: string
}

export function VeiculoCarrossel({ imagens, alt }: Props) {
  const [index, setIndex] = useState(0)
  const thumbsRef = useRef<HTMLDivElement>(null)

  // Mantém a miniatura da foto atual visível na faixa (sem rolar a página).
  useEffect(() => {
    const track = thumbsRef.current
    const thumb = track?.children[index] as HTMLElement | undefined
    if (!track || !thumb) return
    const alvo = thumb.offsetLeft - (track.clientWidth - thumb.clientWidth) / 2
    track.scrollTo({ left: alvo, behavior: 'smooth' })
  }, [index])

  function rolarFaixa(direcao: 1 | -1) {
    thumbsRef.current?.scrollBy({ left: direcao * thumbsRef.current.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (imagens.length === 0) {
    return (
      <div className="vcarrossel">
        <div className="vcarrossel-hero vcarrossel-empty">
          <Car size={48} aria-hidden="true" />
        </div>
      </div>
    )
  }

  const total = imagens.length
  const temVarias = total > 1
  const atual = imagens[Math.min(index, total - 1)]

  function anterior() {
    setIndex((i) => (i - 1 + total) % total)
  }

  function proxima() {
    setIndex((i) => (i + 1) % total)
  }

  return (
    <div className="vcarrossel">
      <div
        className="vcarrossel-hero"
        role="group"
        aria-label="Fotos do veículo"
        aria-roledescription="carrossel"
        tabIndex={temVarias ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') anterior()
          if (e.key === 'ArrowRight') proxima()
        }}
      >
        {temVarias && (
          <button
            type="button"
            className="vcarrossel-edge-nav vcarrossel-edge-prev"
            onClick={anterior}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <img
          key={atual.id}
          className="vcarrossel-main"
          src={apiUrl(atual.url)}
          alt={`${alt} — foto ${index + 1} de ${total}`}
        />

        {temVarias && (
          <>
            <span className="vcarrossel-counter">
              {index + 1}/{total}
            </span>
            <button
              type="button"
              className="vcarrossel-edge-nav vcarrossel-edge-next"
              onClick={proxima}
              aria-label="Próxima foto"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {temVarias && (
        <div className="vcarrossel-strip">
          <button
            type="button"
            className="vcarrossel-strip-nav"
            onClick={() => rolarFaixa(-1)}
            aria-label="Rolar miniaturas para a esquerda"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="vcarrossel-thumbs" ref={thumbsRef}>
            {imagens.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={`vcarrossel-thumb ${i === index ? 'active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1} de ${total}`}
                aria-current={i === index}
              >
                <img src={apiUrl(img.url)} alt="" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="vcarrossel-strip-nav"
            onClick={() => rolarFaixa(1)}
            aria-label="Rolar miniaturas para a direita"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
