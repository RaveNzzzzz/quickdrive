import { api } from '../../api/client'
import type { Paginated } from '../../types'

export type SetorApi = { id: number; nome: string }
export type CargoApi = { id: number; nome: string; descricao: string; setor: SetorApi; papel_acesso: 'COMUM' | 'GERENTE' | 'ADMINISTRADOR' }
export type EnderecoApi = { id?: number; rua: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; cep: string }
export type PessoaApi = { id: number; nome: string; email: string; telefone: string; cpf_cnpj: string; tipo_pessoa: string; data_nascimento: string | null; endereco: EnderecoApi | null }
export type FuncionarioApi = {
  id: number; codigo: string; ativo: boolean; pessoa: PessoaApi; cargo: CargoApi
  salario: string | number; comissao: string | number; data_admissao: string
  inicio_expediente: string; final_expediente: string; regime_contratacao: string
  banco: string; agencia: string; numero_conta: string; tipo_conta: string; chave_pix: string
  desligamento: { id: number; data_desligamento: string; motivo: string; observacoes: string } | null
}

// Percorre a paginação do Ninja, sem truncar os totais da tela.
export async function listAll<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let offset = 0
  while (true) {
    const data = await api<Paginated<T>>(`${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${offset}`)
    items.push(...data.items)
    offset += data.items.length
    if (offset >= data.count) return items
    if (!data.items.length) throw new Error('A API retornou uma página vazia antes de completar a listagem.')
  }
}

export function listFuncionarios() {
  // O backend usa ativo=true por padrão. Carrega ambos explicitamente.
  return Promise.all([
    listAll<FuncionarioApi>('/funcionarios?ativo=true'),
    listAll<FuncionarioApi>('/funcionarios?ativo=false'),
  ]).then(lists => [...new Map(lists.flat().map(item => [item.id, item])).values()])
}
