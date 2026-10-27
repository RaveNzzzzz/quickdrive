export type TokenPair = {
  access: string
  refresh: string
  username: string
}

export type Paginated<T> = {
  items: T[]
  count: number
}

// Cole no seu types.ts.
// O VeiculoApi substitui o que você já tinha; OpcaoApi e VeiculoPayload são novos.

export type OpcaoApi = { id: number; nome: string }

export type VeiculoApi = {
  id: number
  ano_modelo: number
  ano_fabricacao: string
  portas: number
  data_entrada: string
  quilometragem: number
  lugares: number
  chassi: string
  versao: string
  cor: string
  porta_malas: number
  motorizacao: string
  status: string
  renavam: string
  valor: number
  modelo: string
  placa: string
  vaga: string
  marca: string
  cambio: string
  combustivel: string
  carroceria: string
  marca_id: number
  cambio_id: number
  combustivel_id: number
  carroceria_id: number
  /** Caminho da foto principal (ex.: /veiculos/3/imagem?v=123) ou null se não tiver. */
  imagem_url: string | null
}

export type VeiculoPayload = {
  marca_id: number
  modelo: string
  versao: string
  cor: string
  placa: string
  chassi: string
  renavam: string
  ano_modelo: number
  ano_fabricacao: string
  motorizacao: string
  cambio_id: number
  combustivel_id: number
  carroceria_id: number
  portas: number
  lugares: number
  porta_malas: number
  quilometragem: number
  valor: number
  status: string
  vaga: string
}
export type CategoriaProdutoApi = OpcaoApi
export type ProdutoApi = { id: number; nome: string; especificacao: string; categoria_id: number }
export type LoteApi = { id: number; quantidade: number; data_validade: string | null; numero_lote: string; produto_id: number }

export type AlertaApi = {
  /** Os três primeiros vêm do pátio (/veiculos/alertas); "contato" e "funil_parado", do funil (/negociacoes/alertas). */
  tipo: 'parados' | 'manutencao' | 'revisao' | 'contato' | 'funil_parado'
  nivel: 'danger' | 'warning'
  titulo: string
  subtitulo: string
  /** Preenchido quando o alerta é de um veículo só. */
  veiculo_id: number | null
}

// --- Vendas e financeiro (backend: sales/schemas.py e financial/schemas.py) ---

export type StatusVendaApi = 'pendente' | 'pago' | 'cancelada'

export type VendaApi = {
  id: number
  veiculo_id: number
  /** "Marca Modelo", ex.: "VW Gol". */
  veiculo: string
  placa: string
  cliente_id: number
  cliente: string
  funcionario_id: number
  funcionario: string
  valor_venda: number
  forma_pagamento: string
  status: StatusVendaApi
  data_venda: string
}

export type ContaReceberApi = {
  id: number
  receita_id: number
  /** Descrição da receita a que a conta pertence. */
  receita: string
  categoria: string
  venda_id: number | null
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento: string | null
  status: 'pendente' | 'recebido' | 'cancelado'
}

export type ContaPagarApi = {
  id: number
  despesa_id: number
  /** Descrição da despesa a que a conta pertence. */
  despesa: string
  categoria: string
  compra_id: number | null
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'cancelado'
}

/** Receita ou despesa (backend: financial/schemas.py). As duas têm os mesmos campos. */
export type LancamentoApi = {
  id: number
  descricao: string
  categoria: string
  valor: number
  data: string
}

export type CompraApi = {
  id: number
  funcionario_id: number
  funcionario: string
  cliente_id: number | null
  cliente: string | null
  item_compra: 'veiculo' | 'produto'
  veiculo_id: number | null
  veiculo: string | null
  lote_id: number | null
  lote: string | null
  valor_compra: number
  forma_pagamento: string
  status: 'pendente' | 'concluida' | 'cancelada'
  data_compra: string
}

// --- Funil de vendas (backend: sales/schemas.py, Negociacao*) ---

export type EtapaApi = 'interesse' | 'test_drive' | 'negociacao' | 'credito' | 'vendido' | 'perdido'

export type NegociacaoApi = {
  id: number
  /** Nome do cliente cadastrado ou, enquanto não houver, do interessado. */
  nome: string
  nome_interessado: string
  telefone: string
  cliente_id: number | null
  veiculo_id: number | null
  /** "Marca Modelo" */
  veiculo: string | null
  veiculo_placa: string | null
  veiculo_valor: number | null
  funcionario_id: number
  funcionario: string
  venda_id: number | null
  etapa: EtapaApi
  /** Data e hora em que entrou na etapa atual (ISO). */
  etapa_desde: string
  ordem: number
  origem: string
  valor_proposta: number | null
  proximo_passo: string
  proximo_contato: string | null
  motivo_perda: string
  created_at: string
}

export type NegociacaoEventoApi = {
  id: number
  etapa_anterior: EtapaApi | ''
  etapa_nova: EtapaApi
  funcionario: string | null
  data: string
}
