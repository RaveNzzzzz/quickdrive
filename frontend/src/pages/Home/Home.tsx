import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car } from "lucide-react";
import { api, apiUrl } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type {
  CompraApi,
  ContaPagarApi,
  ContaReceberApi,
  Paginated,
  VeiculoApi,
  VendaApi,
} from "../../types";
import { alertaKey, alertaLink, useAlertas } from "../../hooks/useAlertas";
import { currencyCompact, percentChange } from "../../utils/format";
import { todayIso } from "../Financeiro/financeiroUtils";
import "./Home.css";

function AlertasCard() {
  const { alertas, error } = useAlertas();

  return (
    <div className="card alerts-card">
      <h3>Alertas</h3>
      {error ? (
        <p className="patio-empty" role="alert">
          Não foi possível carregar os alertas: {error}
        </p>
      ) : alertas === null ? (
        <p className="patio-empty">Carregando…</p>
      ) : alertas.length === 0 ? (
        <p className="patio-empty">Nenhum alerta no momento. Tudo em dia!</p>
      ) : (
        <div className="alerts-list">
          {alertas.map((alerta) => {
            const link = alertaLink(alerta);
            const conteudo = (
              <>
                <span className={`alert-dot alert-dot-${alerta.nivel}`} />
                <div>
                  <strong>{alerta.titulo}</strong>
                  <p>{alerta.subtitulo}</p>
                </div>
              </>
            );
            return link ? (
              <Link
                key={alertaKey(alerta)}
                to={link}
                className="alert-item alert-item-link"
              >
                {conteudo}
              </Link>
            ) : (
              <div key={alertaKey(alerta)} className="alert-item">
                {conteudo}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PATIO_RECENTES = 3;

// Os veículos que entraram por último no pátio (a API já devolve do mais recente para o mais antigo).
function PatioRecentes() {
  const [veiculos, setVeiculos] = useState<VeiculoApi[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Paginated<VeiculoApi>>(
      `/veiculos?no_patio=true&limit=${PATIO_RECENTES}`,
    )
      .then((data) => {
        if (active) setVeiculos(data.items);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="card patio-card">
      <div className="patio-card-header">
        <h3>Pátio</h3>
        <Link to="/patio" className="patio-card-link">
          Ver todos
        </Link>
      </div>

      {error ? (
        <p className="patio-empty" role="alert">
          Não foi possível carregar o pátio: {error}
        </p>
      ) : veiculos === null ? (
        <div
          className="patio-list"
          aria-busy="true"
          aria-label="Carregando veículos"
        >
          {Array.from({ length: PATIO_RECENTES }, (_, i) => (
            <div key={i} className="patio-item patio-item-loading" />
          ))}
        </div>
      ) : veiculos.length === 0 ? (
        <p className="patio-empty">Nenhum veículo no pátio.</p>
      ) : (
        <div className="patio-list">
          {veiculos.map((v) => {
            const nome = `${v.marca} ${v.modelo}`;
            return (
              <Link
                key={v.id}
                to={`/patio/${v.id}`}
                className="patio-item"
                title={`${nome} ${v.versao}`}
              >
                {v.imagem_url ? (
                  <img src={apiUrl(v.imagem_url)} alt="" loading="lazy" />
                ) : (
                  <Car size={28} aria-hidden="true" />
                )}
                <span>{nome}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthNames = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const monthFull = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  const positive = trend >= 0;
  return (
    <span className={`trend-badge ${positive ? "trend-up" : "trend-down"}`}>
      {positive ? "+" : ""}
      {trend.toFixed(2)}%
    </span>
  );
}

const legendLabels: Record<string, string> = {
  compras: "Compras",
  vendas: "Vendas",
};

const statusLabel: Record<VendaApi["status"], string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelada: "Cancelada",
};

/** Soma `valor(item)` dos itens cuja data começa com `prefixo` ("AAAA-MM" para um mês). */
function total<T>(
  list: T[],
  prefixo: string,
  data: (item: T) => string | null,
  valor: (item: T) => number,
) {
  return list.reduce(
    (sum, item) => (data(item)?.startsWith(prefixo) ? sum + valor(item) : sum),
    0,
  );
}

type Dados = {
  vendas: VendaApi[];
  compras: CompraApi[];
  /** Só para gerentes (as rotas do financeiro são restritas). */
  contas: { receber: ContaReceberApi[]; pagar: ContaPagarApi[] } | null;
};

export default function Home() {
  const { user } = useAuth();
  const gerente = !!user?.pode_gerenciar;
  const [dados, setDados] = useState<Dados | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Paginated<VendaApi>>("/vendas?limit=1000"),
      api<Paginated<CompraApi>>("/compras?limit=1000"),
      gerente
        ? Promise.all([
            api<Paginated<ContaReceberApi>>(
              "/financeiro/contas-receber?limit=1000",
            ),
            api<Paginated<ContaPagarApi>>(
              "/financeiro/contas-pagar?limit=1000",
            ),
          ])
        : Promise.resolve(null),
    ])
      .then(([vendas, compras, contas]) => {
        if (!active) return;
        setDados({
          // Canceladas não contam em nenhum número da Home.
          vendas: vendas.items.filter((v) => v.status !== "cancelada"),
          compras: compras.items.filter((c) => c.status !== "cancelada"),
          contas: contas && {
            receber: contas[0].items,
            pagar: contas[1].items,
          },
        });
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [gerente]);

  const today = todayIso();
  const year = today.slice(0, 4);
  const mes = today.slice(0, 7);
  const anterior = new Date(Number(year), Number(today.slice(5, 7)) - 2, 1);
  const mesAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
  const helperAnterior = `vs. ${monthFull.format(anterior)}/${anterior.getFullYear()}`;

  const resumo = useMemo(() => {
    if (!dados) return null;
    const pagas = dados.vendas.filter((v) => v.status === "pago");
    const pendentes = dados.vendas.filter((v) => v.status === "pendente");
    const venda = (v: VendaApi) => v.valor_venda;
    const compra = (c: CompraApi) => c.valor_compra;
    const vendasMes = total(pagas, mes, (v) => v.data_venda, venda);
    const comprasMes = total(dados.compras, mes, (c) => c.data_compra, compra);

    let caixa = null;
    if (dados.contas) {
      const { receber, pagar } = dados.contas;
      const recebido = receber.filter((c) => c.status === "recebido");
      const pago = pagar.filter((c) => c.status === "pago");
      const valor = (c: { valor: number }) => c.valor;
      caixa = {
        // Dinheiro que de fato entrou menos o que de fato saiu (contas já recebidas e pagas).
        saldo:
          recebido.reduce((s, c) => s + c.valor, 0) -
          pago.reduce((s, c) => s + c.valor, 0),
        entradas: total(recebido, mes, (c) => c.data_recebimento, valor),
        saidas: total(pago, mes, (c) => c.data_pagamento, valor),
      };
    }

    return {
      vendas: {
        value: vendasMes,
        trend: percentChange(
          vendasMes,
          total(pagas, mesAnterior, (v) => v.data_venda, venda),
        ),
      },
      compras: {
        value: comprasMes,
        trend: percentChange(
          comprasMes,
          total(dados.compras, mesAnterior, (c) => c.data_compra, compra),
        ),
      },
      pendentes: {
        value: pendentes.reduce((s, v) => s + v.valor_venda, 0),
        count: pendentes.length,
      },
      caixa,
      chart: monthNames.map((month, i) => {
        const prefixo = `${year}-${String(i + 1).padStart(2, "0")}`;
        return {
          month,
          compras: total(dados.compras, prefixo, (c) => c.data_compra, compra),
          vendas: total(pagas, prefixo, (v) => v.data_venda, venda),
        };
      }),
      ultimas: [...dados.vendas]
        .sort((a, b) => b.data_venda.localeCompare(a.data_venda) || b.id - a.id)
        .slice(0, 4),
    };
  }, [dados, mes, mesAnterior, year]);

  const carregando = resumo === null && !error;
  const valor = (n: number) => (resumo ? currency.format(n) : "…");

  return (
    <div className="dashboard">
      <div className="dashboard-main">
        {error && (
          <p className="home-error" role="alert">
            Não foi possível carregar vendas e compras: {error}
          </p>
        )}

        <div className="kpi-row">
          <div className="card kpi-card">
            <div className="kpi-card-header">
              <h3>Compras</h3>
              <TrendBadge trend={resumo?.compras.trend ?? null} />
            </div>
            <strong className="kpi-value">
              {valor(resumo?.compras.value ?? 0)}
            </strong>
            <p className="kpi-helper">No mês · {helperAnterior}</p>
          </div>

          <div className="card kpi-card">
            <div className="kpi-card-header">
              <h3>Vendas</h3>
              <TrendBadge trend={resumo?.vendas.trend ?? null} />
            </div>
            <strong className="kpi-value">
              {valor(resumo?.vendas.value ?? 0)}
            </strong>
            <p className="kpi-helper">Pagas no mês · {helperAnterior}</p>
          </div>

          {gerente ? (
            <div className="card kpi-card">
              <div className="kpi-card-header">
                <h3>Caixa</h3>
              </div>
              <strong className="kpi-value">
                {valor(resumo?.caixa?.saldo ?? 0)}
              </strong>
              <p className="kpi-helper">
                No mês: entradas {valor(resumo?.caixa?.entradas ?? 0)} · saídas{" "}
                {valor(resumo?.caixa?.saidas ?? 0)}
              </p>
            </div>
          ) : (
            <div className="card kpi-card">
              <div className="kpi-card-header">
                <h3>Vendas pendentes</h3>
                {resumo && (
                  <span className="trend-badge trend-neutral">
                    {resumo.pendentes.count} abertas
                  </span>
                )}
              </div>
              <strong className="kpi-value">
                {valor(resumo?.pendentes.value ?? 0)}
              </strong>
              <p className="kpi-helper">Aguardando pagamento</p>
            </div>
          )}
        </div>

        <div className="chart-panel">
          <h2 className="chart-panel-title">Gráfico Financeiro {year}</h2>
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-tab">{year}</span>
              <Link to="/vendas" className="chart-more">
                Ver vendas
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={resumo?.chart ?? []}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                  tickFormatter={(v: number) => currencyCompact.format(v)}
                />
                <Tooltip
                  formatter={(value) => currency.format(Number(value))}
                />
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
          <table className="data-table">
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
              {resumo?.ultimas.map((t) => (
                <tr key={t.id}>
                  <td>{t.cliente}</td>
                  <td>
                    <span className="vehicle-cell">
                      <span className="vehicle-thumb" />
                      {t.veiculo}
                    </span>
                  </td>
                  <td>
                    <span className="seller-cell">
                      <span className="seller-avatar">
                        {initials(t.funcionario)}
                      </span>
                      {t.funcionario}
                    </span>
                  </td>
                  <td>{currency.format(t.valor_venda)}</td>
                  <td>
                    <span
                      className={`status-pill ${t.status === "pago" ? "status-pago" : "status-pendente"}`}
                    >
                      {statusLabel[t.status]}
                    </span>
                  </td>
                  <td>
                    {t.data_venda.slice(8, 10)}/{t.data_venda.slice(5, 7)}
                  </td>
                </tr>
              ))}
              {(carregando || resumo?.ultimas.length === 0) && (
                <tr>
                  <td colSpan={6} className="home-empty">
                    {carregando
                      ? "Carregando…"
                      : "Nenhuma venda registrada ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="dashboard-side">
        <PatioRecentes />

        <AlertasCard />
      </aside>
    </div>
  );
}
