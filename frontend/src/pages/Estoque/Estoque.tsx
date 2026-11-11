import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { KpiSkeleton, TableSkeleton } from "../../components/Skeleton";
import { toast } from "../../utils/toast";
import { Modal } from "../../components/Modal";
import { Pagination } from "../../components/Pagination";
import type { CategoriaProdutoApi, LoteApi, ProdutoApi } from "../../types";
import { currencyCents } from "../../utils/format";
import "./Estoque.css";
import { stockValue, toProducts } from "./estoqueData";
import { EstoqueFormModal, type StockEditor } from "./EstoqueFormModal";

export default function Estoque() {
  const [products, setProducts] = useState<ProdutoApi[]>([]);
  const [categories, setCategories] = useState<CategoriaProdutoApi[]>([]);
  const [lots, setLots] = useState<LoteApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [low, setLow] = useState(false);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<StockEditor | null>(null);
  const [view, setView] = useState<number | "categories" | null>(null);
  const [deletion, setDeletion] = useState<{
    path: "produtos" | "lotes";
    id: number;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      api<ProdutoApi[]>("/estoque/produtos"),
      api<CategoriaProdutoApi[]>("/estoque/categorias"),
      api<LoteApi[]>("/estoque/lotes"),
    ])
      .then(([p, c, l]) => {
        if (active) {
          setProducts(p);
          setCategories(c);
          setLots(l);
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const rows = useMemo(
    () => toProducts(products, categories, lots),
    [products, categories, lots],
  );
  const valuation = useMemo(() => stockValue(rows), [rows]);
  const filtered = rows.filter(
    (p) =>
      (!category || String(p.categoria_id) === category) &&
      (!low || p.quantity <= 3) &&
      [p.nome, p.especificacao, ...p.lots.map((l) => l.numero_lote)].some((s) =>
        s
          .toLocaleLowerCase("pt-BR")
          .includes(query.trim().toLocaleLowerCase("pt-BR")),
      ),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, totalPages);
  const selected = rows.find((p) => p.id === view);
  const unavailable = loading || !!error;
  function saved(
    kind: StockEditor["kind"],
    item: ProdutoApi | CategoriaProdutoApi | LoteApi,
  ) {
    if (kind === "produto")
      setProducts((prev) =>
        [...prev.filter((p) => p.id !== item.id), item as ProdutoApi].sort(
          (a, b) => a.nome.localeCompare(b.nome),
        ),
      );
    if (kind === "categoria")
      setCategories((prev) =>
        [
          ...prev.filter((p) => p.id !== item.id),
          item as CategoriaProdutoApi,
        ].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
    if (kind === "lote")
      setLots((prev) => [
        ...prev.filter((p) => p.id !== item.id),
        item as LoteApi,
      ]);
    setEditor(null);
    toast.success(kind === "lote" && !editor?.item
      ? "Lote cadastrado. A conta está em Financeiro → A pagar."
      : "Registro salvo com sucesso.");
  }
  function confirm(path: "produtos" | "lotes", id: number, name: string) {
    setDeleteError("");
    setDeletion({ path, id, name });
  }
  async function remove() {
    if (!deletion || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await api(`/estoque/${deletion.path}/${deletion.id}`, {
        method: "DELETE",
      });
      if (deletion.path === "produtos")
        setProducts((prev) => prev.filter((p) => p.id !== deletion.id));
      else setLots((prev) => prev.filter((p) => p.id !== deletion.id));
      setDeletion(null);
      toast.success("Registro excluído com sucesso.");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="estoque-page">
      <div className="kpi-row kpi-row-4">
        <div className="card kpi-card">
          <h3>Itens cadastrados</h3>
          <strong className="kpi-value">
            {loading ? <KpiSkeleton width={90} /> : unavailable ? "—" : rows.length}
          </strong>
          <p className="kpi-helper">Em {categories.length} categorias</p>
        </div>
        <div className="card kpi-card">
          <h3>Unidades em estoque</h3>
          <strong className="kpi-value">
            {loading ? <KpiSkeleton width={90} /> : unavailable ? "—" : rows.reduce((sum, p) => sum + p.quantity, 0)}
          </strong>
          <p className="kpi-helper">Soma das quantidades dos lotes</p>
        </div>
        <div className="card kpi-card">
          <h3>Valor em estoque</h3>
          <strong className="kpi-value">{loading ? <KpiSkeleton width={90} /> : unavailable ? "—" : valuation.value}</strong>
          <p className="kpi-helper">
            {!unavailable && valuation.missing
              ? `${valuation.missing} ${valuation.missing === 1 ? "produto com saldo sem valor" : "produtos com saldo sem valor"}`
              : "Saldo atual × valor unitário"}
          </p>
        </div>
        <button
          className={`card kpi-card estoque-kpi-low ${low ? "active" : ""}`}
          disabled={unavailable}
          aria-pressed={low}
          onClick={() => {
            setLow((v) => !v);
            setPage(1);
          }}
        >
          <h3>Estoque baixo</h3>
          <strong className="kpi-value">
            {loading ? <KpiSkeleton width={90} /> : unavailable ? "—" : rows.filter((p) => p.quantity <= 3).length}
          </strong>
          <p className="kpi-helper">
            Até 3 unidades · clique para {low ? "limpar" : "filtrar"}
          </p>
        </button>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <label className="estoque-search">
            <Search size={16} />
            <input
              aria-label="Buscar produto ou lote"
              placeholder="Buscar produto ou lote"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            className="estoque-select"
            aria-label="Filtrar por categoria"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button
            className="btn btn-outline"
            disabled={unavailable}
            onClick={() => setView("categories")}
          >
            Ver Categorias
          </button>
          <button
            className="btn btn-primary"
            disabled={unavailable}
            onClick={() => setEditor({ kind: "produto" })}
          >
            <Plus size={16} />
            Novo Produto
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="estoque-error">
          Não foi possível carregar o estoque: {error}{" "}
          <button
            className="btn btn-outline"
            onClick={() => {
              setLoading(true);
              setError("");
              setAttempt((v) => v + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Valor unitário</th>
              <th>Quantidade</th>
              <th>Lotes</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {!unavailable &&
              filtered
                .slice((currentPage - 1) * 12, currentPage * 12)
                .map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.category}</td>
                    <td>{p.valor_unitario == null ? "Não informado" : currencyCents.format(Number(p.valor_unitario))}</td>
                    <td>
                      <span className="estoque-qty">
                        {p.quantity}
                        {p.quantity <= 3 && (
                          <span className="estoque-low">Baixo</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        aria-label={`Ver lotes de ${p.nome}`}
                        onClick={() => setView(p.id)}
                      >
                        {p.lots.length} lotes
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action row-action-edit"
                          aria-label={`Editar ${p.nome}`}
                          onClick={() =>
                            setEditor({ kind: "produto", item: p })
                          }
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="row-action row-action-delete"
                          aria-label={`Excluir ${p.nome}`}
                          onClick={() => confirm("produtos", p.id, p.nome)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            {loading && <TableSkeleton cols={6} />}
            {!loading && (unavailable || !filtered.length) && (
              <tr>
                <td colSpan={6} className="estoque-empty">
                  {loading
                    ? "Carregando…"
                    : error
                      ? "Estoque indisponível."
                      : "Nenhum produto encontrado para esses filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!unavailable && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={12}
          itemLabel="produtos"
          onPageChange={setPage}
        />
      )}
      {editor && !deletion && (
        <EstoqueFormModal
          editor={editor}
          categories={categories}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {view === "categories" && !editor && !deletion && (
        <Modal
          title="Categorias"
          onClose={() => setView(null)}
          footer={
            <button
              className="btn btn-primary"
              onClick={() => setEditor({ kind: "categoria" })}
            >
              Nova categoria
            </button>
          }
        >
          <div className="estoque-list">
            {categories.map((c) => (
              <div key={c.id}>
                {c.nome}
                <button
                  className="btn btn-outline"
                  onClick={() => setEditor({ kind: "categoria", item: c })}
                >
                  Editar
                </button>
              </div>
            ))}
            {!categories.length && <p>Nenhuma categoria cadastrada.</p>}
          </div>
        </Modal>
      )}
      {selected && !editor && !deletion && (
        <Modal
          title={`Lotes de ${selected.nome}`}
          size="lg"
          onClose={() => setView(null)}
          footer={
            <button
              className="btn btn-primary"
              onClick={() => setEditor({ kind: "lote", product: selected })}
            >
              Novo lote
            </button>
          }
        >
          {selected.especificacao && <p>{selected.especificacao}</p>}
          <div className="estoque-lots">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Quantidade</th>
                  <th>Validade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {selected.lots.map((l) => (
                  <tr key={l.id}>
                    <td>{l.numero_lote}</td>
                    <td>{l.quantidade}</td>
                    <td>
                      {l.data_validade
                        ? l.data_validade.split("-").reverse().join("/")
                        : "Sem validade"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="row-action row-action-edit"
                          aria-label={`Editar lote ${l.numero_lote}`}
                          onClick={() =>
                            setEditor({
                              kind: "lote",
                              product: selected,
                              item: l,
                            })
                          }
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="row-action row-action-delete"
                          aria-label={`Excluir lote ${l.numero_lote}`}
                          onClick={() =>
                            confirm("lotes", l.id, `lote ${l.numero_lote}`)
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!selected.lots.length && (
                  <tr>
                    <td colSpan={4}>
                      Nenhum lote cadastrado. Adicione um lote para registrar a
                      quantidade.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      {deletion && (
        <Modal
          title="Confirmar exclusão"
          busy={busy}
          onClose={() => setDeletion(null)}
          footer={
            <>
              <button
                className="btn btn-outline"
                disabled={busy}
                onClick={() => setDeletion(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={remove}
              >
                {busy ? "Excluindo…" : "Excluir"}
              </button>
            </>
          }
        >
          <p>Excluir {deletion.name}? Essa ação não pode ser desfeita.</p>
          <p>
            {deletion.path === "produtos"
              ? "Produtos com lotes ou outros registros vinculados não podem ser excluídos."
              : "A exclusão remove a quantidade deste lote do saldo do produto."}
          </p>
          {deleteError && (
            <p className="estoque-error" role="alert">
              {deleteError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
