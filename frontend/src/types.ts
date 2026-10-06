export type TokenPair = {
  access: string
  refresh: string
  username: string
}

export type Paginated<T> = {
  items: T[]
  count: number
}

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
  /** Caminho da imagem principal (ex.: "/media/veiculos/foto.jpg"), ou null se não houver. */
  imagem: string | null
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
