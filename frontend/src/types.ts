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
export type ModeloApi = { id: number; nome: string; marca_id: number }
export type VagaApi = {
  id: number
  nome: string
  posicao: string
  /** Veículo que ocupa a vaga (null = livre). */
  ocupada_por_id: number | null
  ocupada_por: string | null
}

export type ImagemVeiculoApi = {
  id: number
  principal: boolean
  /** Caminho da foto (ex.: /veiculos/3/imagens/9?v=123). */
  url: string
}

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
  modelo_id: number | null
  vaga_id: number | null
  /** Posição da vaga na loja (ex.: Frente da loja). */
  vaga_posicao: string
  /** Caminho da foto principal/capa (ex.: /veiculos/3/imagens/9?v=123) ou null se não tiver. */
  imagem_url: string | null
  /** Galeria completa. Só vem preenchida ao buscar um veículo específico (não na listagem). */
  imagens: ImagemVeiculoApi[]
  custo_aquisicao: number
  observacoes: string
  /** Os cinco abaixo, como as imagens, só vêm preenchidos ao buscar um veículo específico. */
  opcionais: OpcionalVeiculoApi[]
  documentos: DocumentoVeiculoApi[]
  custos_preparacao: CustoPreparacaoApi[]
  historico: HistoricoVeiculoApi[]
  sinistro: SinistroVeiculoApi | null
}

export type OpcionalVeiculoApi = { id: number; nome: string }

export type SinistroVeiculoApi = {
  teve_sinistro: boolean
  de_leilao: boolean
  perda_total: boolean
  descricao: string
}

export type DocumentoVeiculoApi = {
  id: number
  nome: string
  /** Texto exibido, ex.: "Em dia", "Pago", "Pendente". */
  situacao: string
  /** false = pendência. */
  regular: boolean
}

export type ProdutoUsadoApi = {
  produto_id: number
  nome: string
  quantidade: number
  valor_unitario: number
  valor_total: number
}

export type CustoPreparacaoApi = {
  id: number
  nome: string
  /** Custo total: serviço + produtos do estoque. */
  custo: number
  /** Parte do custo que é serviço. */
  custo_servico: number
  produtos: ProdutoUsadoApi[]
  /** AAAA-MM-DD */
  data: string
  status: string
}

export type HistoricoVeiculoApi = {
  id: number
  titulo: string
  /** Data e hora em ISO 8601. */
  data_hora: string
  positivo: boolean
}

export type VeiculoPayload = {
  marca_id: number
  modelo_id: number
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
  vaga_id: number | null
  custo_aquisicao: number
  observacoes: string
}
export type CategoriaProdutoApi = OpcaoApi
export type ProdutoApi = {
  id: number
  nome: string
  especificacao: string
  categoria_id: number
  valor_unitario: string | null
}
export type ProdutoCriadoApi = ProdutoApi & { lote: LoteApi | null }
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
  gerada_por_compra: boolean
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
  forma_pagamento: string | null
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

// --- Clientes (backend: customers/schemas.py ClienteOut + people/schemas.py PessoaOut) ---

export type EnderecoApi = {
  id: number
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export type ClienteApi = {
  id: number
  codigo: string
  ativo: boolean
  ultima_interacao: string | null
  created_at: string
  pessoa: {
    id: number
    nome: string
    email: string
    telefone: string
    data_nascimento: string | null
    cpf_cnpj: string
    tipo_pessoa: 'FISICA' | 'JURIDICA'
    endereco: EnderecoApi | null
  }
  /** Calculados a partir das vendas (não canceladas) e do funil. */
  veiculos_comprados: number
  ltv: number
  em_negociacao: boolean
  responsavel: string | null
}
