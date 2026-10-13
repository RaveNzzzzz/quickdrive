export const OPCAO_NOME_MAX = 60 // mesmo limite do backend (OPCAO_NOME_MAX em schemas.py)

/** As 4 listas do formulário de veículo que podem ser criadas/editadas pelo site. */
export type TipoOpcao = 'marcas' | 'cambios' | 'combustiveis' | 'carrocerias'

export const OPCAO_ROTULOS: Record<TipoOpcao, { singular: string; artigo: 'o' | 'a' }> = {
  marcas: { singular: 'marca', artigo: 'a' },
  cambios: { singular: 'câmbio', artigo: 'o' },
  combustiveis: { singular: 'combustível', artigo: 'o' },
  carrocerias: { singular: 'carroceria', artigo: 'a' },
}
