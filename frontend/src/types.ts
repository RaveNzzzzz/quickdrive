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
