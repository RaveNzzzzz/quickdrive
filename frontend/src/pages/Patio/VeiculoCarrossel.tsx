import { useState } from 'react'
import { Car, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiUrl } from '../../api/client'
import type { ImagemVeiculoApi } from '../../types'

type Props = {
  imagens: ImagemVeiculoApi[]
  alt: string
}

export function VeiculoCarrossel({ imagens, alt }: Props) {
  const [index, setIndex] = useState(0)

  if (imagens.length === 0) {
    return (
      <div className="vcarrossel-hero vcarrossel-empty">
        <Car size={48} aria-hidden="true" />
      </div>
    )
  }

  const total = imagens.length
  const temVarias = total > 1
  const atual = imagens[Math.min(index, total - 1)]
  const anteriorImg = imagens[(index - 1 + total) % total]
  const proximaImg = imagens[(index + 1) % total]

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

        <div className="vcarrossel-track">
          {temVarias && (
            <img
              className="vcarrossel-peek"
              src={apiUrl(anteriorImg.url)}
              alt=""
              aria-hidden="true"
              onClick={anterior}
            />
          )}
          <div className="vcarrossel-main-wrap">
            <img
              key={atual.id}
              className="vcarrossel-main"
              src={apiUrl(atual.url)}
              alt={`${alt} — foto ${index + 1} de ${total}`}
            />
            {temVarias && (
              <span className="vcarrossel-counter">
                {index + 1}/{total}
              </span>
            )}
          </div>
          {temVarias && (
            <img
              className="vcarrossel-peek"
              src={apiUrl(proximaImg.url)}
              alt=""
              aria-hidden="true"
              onClick={proxima}
            />
          )}
        </div>

        {temVarias && (
          <button
            type="button"
            className="vcarrossel-edge-nav vcarrossel-edge-next"
            onClick={proxima}
            aria-label="Próxima foto"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {temVarias && (
        <div className="vcarrossel-dots">
          {imagens.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`vcarrossel-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1} de ${total}`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  )
}
