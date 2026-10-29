import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currencyCents, currencyCompact, daysFrom, type Conta, type DateRange } from './financeiroUtils'

const tick = { fontSize: 12, fill: 'var(--text-muted)' }

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Short periods are grouped by week, long ones by month
function buildBuckets(range: DateRange) {
  const length = daysFrom(range.from, range.to) + 1
  const [fy, fm, fd] = range.from.split('-').map(Number)
  const [ty, tm] = range.to.split('-').map(Number)

  if (length <= 45) {
    return {
      unit: 'semana',
      buckets: Array.from({ length: Math.ceil(length / 7) }, (_, i) => {
        const start = new Date(fy, fm - 1, fd + i * 7)
        const label = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`
        return { label, entradas: 0, saidas: 0 }
      }),
      indexOf: (iso: string) => Math.floor(daysFrom(range.from, iso) / 7),
    }
  }

  return {
    unit: 'mês',
    buckets: Array.from({ length: ty * 12 + tm - (fy * 12 + fm) + 1 }, (_, i) => {
      const date = new Date(fy, fm - 1 + i, 1)
      const label = `${monthNames[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`
      return { label, entradas: 0, saidas: 0 }
    }),
    indexOf: (iso: string) => {
      const [y, m] = iso.split('-').map(Number)
      return y * 12 + m - (fy * 12 + fm)
    },
  }
}

// Entradas x saídas across the selected period
export function FluxoCaixaChart({ contas, range }: { contas: Conta[]; range: DateRange }) {
  const { unit, data } = useMemo(() => {
    const { unit, buckets, indexOf } = buildBuckets(range)
    for (const conta of contas) {
      const bucket = buckets[indexOf(conta.dueDate)]
      if (!bucket) continue
      if (conta.kind === 'receber') bucket.entradas += conta.amount
      else bucket.saidas += conta.amount
    }
    return { unit, data: buckets }
  }, [contas, range])

  return (
    <div className="card fx-chart-card">
      <div className="fx-chart-header">
        <h3>Fluxo de caixa do período</h3>
        <p>Entradas e saídas previstas por {unit}</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={tick}
            width={64}
            tickFormatter={(v: number) => currencyCompact.format(v)}
          />
          <Tooltip
            formatter={(value) => currencyCents.format(Number(value))}
            labelFormatter={(label) => (unit === 'semana' ? `Semana de ${label}` : label)}
            cursor={{ fill: 'var(--bg)' }}
          />
          <Legend iconType="circle" />
          <Bar dataKey="entradas" name="Entradas" fill="var(--success)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="saidas" name="Saídas" fill="var(--danger)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Where the money goes: payables by category
export function CategoriasChart({ contas }: { contas: Conta[] }) {
  const data = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const conta of contas) {
      if (conta.kind !== 'pagar') continue
      byCategory.set(conta.category, (byCategory.get(conta.category) ?? 0) + conta.amount)
    }
    return [...byCategory.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [contas])

  return (
    <div className="card fx-chart-card">
      <div className="fx-chart-header">
        <h3>Despesas por categoria</h3>
        <p>Contas a pagar do período</p>
      </div>
      {data.length === 0 ? (
        <p className="fx-chart-empty">Nenhuma despesa neste período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tick={tick}
              width={120}
            />
            <Tooltip
              formatter={(value) => currencyCents.format(Number(value))}
              cursor={{ fill: 'var(--bg)' }}
            />
            <Bar dataKey="value" name="Total" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
