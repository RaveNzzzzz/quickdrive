import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Car } from 'lucide-react'
import { alerts, caixa, chartData, kpis, patioVehicles, transactions } from './homeData'
import './Home.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function TrendBadge({ trend }: { trend: number }) {
  const positive = trend >= 0
  return (
    <span className={`trend-badge ${positive ? 'trend-up' : 'trend-down'}`}>
      {positive ? '+' : ''}
      {trend.toFixed(2)}%
    </span>
  )
}

const legendLabels: Record<string, string> = {
  compras: 'Compras',
  vendas: 'Vendas',
}

export default function Home() {
  return (
    <div className="dashboard">
      <div className="dashboard-main">
        <div className="kpi-row">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card kpi-card">
              <div className="kpi-card-header">
                <h3>{kpi.label}</h3>
                <TrendBadge trend={kpi.trend} />
              </div>
              <strong className="kpi-value">{currency.format(kpi.value)}</strong>
              <p className="kpi-helper">{kpi.helper}</p>
            </div>
          ))}

          <div className="card kpi-card">
            <div className="kpi-card-header">
              <h3>{caixa.label}</h3>
              <TrendBadge trend={caixa.trend} />
            </div>
            <strong className="kpi-value">{currency.format(caixa.value)}</strong>
            <p className="kpi-helper">
              Entradas {currency.format(caixa.entradas)} · Saídas {currency.format(caixa.saidas)}
            </p>
          </div>
        </div>

        <div className="chart-panel">
          <h2 className="chart-panel-title">Gráfico Financeiro 2026</h2>
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-tab">2026</span>
              <button type="button" className="chart-more">
                MORE
              </button>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip />
                <Legend
                  iconType="circle"
                  formatter={(value: string) => legendLabels[value] ?? value}
                />
                <Line
                  type="monotone"
                  dataKey="compras"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card transactions-card">
          <h3 className="transactions-title">Últimas transações registradas</h3>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Vendedor</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.client}</td>
                  <td>
                    <span className="vehicle-cell">
                      <span className="vehicle-thumb" />
                      {t.vehicle}
                    </span>
                  </td>
                  <td>
                    <span className="seller-cell">
                      <span className="seller-avatar">{initials(t.seller)}</span>
                      {t.seller}
                    </span>
                  </td>
                  <td>{currency.format(t.value)}</td>
                  <td>
                    <span
                      className={`status-pill ${t.status === 'Pago' ? 'status-pago' : 'status-pendente'}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="dashboard-side">
        <div className="card patio-card">
          <h3>Pátio</h3>
          <div className="patio-list">
            {patioVehicles.map((vehicle) => (
              <div key={vehicle.id} className="patio-item">
                <Car size={28} />
                <span>{vehicle.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card alerts-card">
          <h3>Alertas</h3>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <span className={`alert-dot alert-dot-${alert.level}`} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
