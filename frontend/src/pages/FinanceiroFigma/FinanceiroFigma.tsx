import { ContasSection } from './ContasSection'
import { contasAPagar, contasAReceber, kpiTrend } from './financeiroFigmaData'
import './FinanceiroFigma.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function sum(list: { value: number }[]) {
  return list.reduce((total, item) => total + item.value, 0)
}

export default function FinanceiroFigma() {
  const kpis = [
    { label: 'Contas Fixas', value: sum(contasAPagar.filter((c) => c.tag === 'Fixa')), trend: false },
    { label: 'Contas variáveis', value: sum(contasAPagar.filter((c) => c.tag === 'Variável')), trend: true },
    { label: 'Recebimentos Pendentes', value: sum(contasAReceber.filter((c) => c.tag === 'Pendente')), trend: true },
    { label: 'Contas a receber', value: sum(contasAReceber), trend: true },
  ]

  return (
    <div className="financeiro-page">
      <div className="kpi-row kpi-row-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card kpi-card">
            <div className="kpi-card-header">
              <h3>{kpi.label}</h3>
              {kpi.trend && (
                <span className="trend-badge trend-up">+{kpiTrend.toFixed(2).replace('.', ',')}%</span>
              )}
            </div>
            <strong className="kpi-value">{currency.format(kpi.value)}</strong>
          </div>
        ))}
      </div>

      <ContasSection
        title="A receber"
        nameHeader="Cliente"
        createLabel="Criar Conta a Receber"
        tabs={[
          { label: 'Todas', tag: null },
          { label: 'Clientes', tag: 'Cliente' },
          { label: 'Pendentes', tag: 'Pendente' },
        ]}
        contas={contasAReceber}
        chartColors={{ Cliente: '#6b83fb', Pendente: '#6fd39a' }}
        pillClass={{ Cliente: 'status-pago', Pendente: 'status-pendente' }}
      />

      <ContasSection
        title="A pagar"
        nameHeader="Fornecedor"
        createLabel="Criar Conta a Pagar"
        tabs={[
          { label: 'Todas', tag: null },
          { label: 'Fixas', tag: 'Fixa' },
          { label: 'Variável', tag: 'Variável' },
        ]}
        contas={contasAPagar}
        chartColors={{ Variável: '#6b83fb', Fixa: '#6fd39a' }}
        pillClass={{ Fixa: 'status-pago', Variável: 'status-pendente' }}
      />
    </div>
  )
}
