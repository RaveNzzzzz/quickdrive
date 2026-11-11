import type { CSSProperties } from 'react'
import './Skeleton.css'

type SkeletonProps = {
  width?: number | string
  height?: number | string
  /** Raio da borda (ex.: 999 para círculo/pílula). */
  radius?: number | string
  className?: string
  style?: CSSProperties
}

/** Bloco cinza animado que ocupa o lugar de um conteúdo que ainda está carregando. */
export function Skeleton({ width = '100%', height = 14, radius = 6, className = '', style }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

/** Linhas de texto (a última é mais curta). */
export function SkeletonText({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <span className="skeleton-text" aria-hidden="true" style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '60%' : '100%'} />
      ))}
    </span>
  )
}

/** Linhas de tabela de carregamento. Use dentro de <tbody>. */
export function TableSkeleton({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="skeleton-row" aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <Skeleton width={c === 0 ? '70%' : `${55 + ((r + c) % 3) * 15}%`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Valor grande de um card de indicador (KPI) carregando. */
export function KpiSkeleton({ width = 120 }: { width?: number | string }) {
  return <Skeleton width={width} height={28} radius={8} className="skeleton-kpi" />
}

/** Gráfico de barras de carregamento. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  const alturas = [45, 70, 55, 85, 60, 40, 75, 50, 65, 35, 80, 58]
  return (
    <div className="skeleton-chart" style={{ height }} role="status" aria-label="Carregando gráfico">
      {alturas.map((h, i) => (
        <Skeleton key={i} width="100%" height={`${h}%`} radius={6} />
      ))}
    </div>
  )
}

/** Aviso para leitores de tela: a região está carregando. */
export function LoadingRegion({ label = 'Carregando', children }: { label?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  )
}
