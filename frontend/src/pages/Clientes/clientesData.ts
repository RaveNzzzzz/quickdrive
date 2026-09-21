import { isoFromToday } from '../../utils/format'

export type ClienteTipo = 'Pessoa Física' | 'Pessoa Jurídica'
export type ClienteEstagio = 'Cliente Ativo' | 'Em Negociação' | 'Inativo'

export type Cliente = {
  id: number
  name: string
  document: string
  tipo: ClienteTipo
  email: string
  phone: string
  estagio: ClienteEstagio
  vehicles: number
  ltv: number
  owner: string
  lastContact: string // YYYY-MM-DD
}

export const clienteOwners = ['Rafael Benitez', 'Júlia Lima', 'Marina Pereira', 'Tiago Martins']

type Seed = Omit<Cliente, 'lastContact'> & { daysAgo: number }

// Last contact dates are relative to today so "há X dias" stays realistic
const seeds: Seed[] = [
  { id: 1, name: 'Marcos Vinícius', document: 'CPF 123.456.789-00', tipo: 'Pessoa Física', email: 'marcos.vinicius@gmail.com', phone: '(19) 99988-7766', estagio: 'Cliente Ativo', vehicles: 1, ltv: 189900, owner: 'Rafael Benitez', daysAgo: 1 },
  { id: 2, name: 'Camila Ferraz', document: 'CPF 987.654.321-00', tipo: 'Pessoa Física', email: 'camila.ferraz@gmail.com', phone: '(19) 98765-4321', estagio: 'Em Negociação', vehicles: 0, ltv: 0, owner: 'Rafael Benitez', daysAgo: 0 },
  { id: 3, name: 'Transportadora Way LTDA', document: 'CNPJ 12.345.678/0001-90', tipo: 'Pessoa Jurídica', email: 'contato@waytransp.com', phone: '(19) 99887-7654', estagio: 'Cliente Ativo', vehicles: 3, ltv: 752950, owner: 'Júlia Lima', daysAgo: 6 },
  { id: 4, name: 'Bianca Souza', document: 'CPF 456.789.123-00', tipo: 'Pessoa Física', email: 'bianca.souza@gmail.com', phone: '(19) 99876-5432', estagio: 'Inativo', vehicles: 0, ltv: 0, owner: 'Marina Pereira', daysAgo: 74 },
  { id: 5, name: 'Ronaldo Cordeiro', document: 'CPF 321.654.987-00', tipo: 'Pessoa Física', email: 'ronaldo.cordeiro@gmail.com', phone: '(19) 99887-7665', estagio: 'Inativo', vehicles: 1, ltv: 276900, owner: 'Tiago Martins', daysAgo: 132 },
  { id: 6, name: 'Eduardo Nascimento', document: 'CPF 741.852.963-00', tipo: 'Pessoa Física', email: 'eduardo.nascimento@gmail.com', phone: '(19) 99123-4567', estagio: 'Em Negociação', vehicles: 0, ltv: 0, owner: 'Tiago Martins', daysAgo: 2 },
  { id: 7, name: 'Larissa Prado', document: 'CPF 159.357.486-00', tipo: 'Pessoa Física', email: 'larissa.prado@gmail.com', phone: '(19) 99234-5678', estagio: 'Em Negociação', vehicles: 1, ltv: 298000, owner: 'Marina Pereira', daysAgo: 3 },
  { id: 8, name: 'Henrique Lobo', document: 'CPF 852.963.741-00', tipo: 'Pessoa Física', email: 'henrique.lobo@gmail.com', phone: '(19) 99345-6789', estagio: 'Cliente Ativo', vehicles: 2, ltv: 430000, owner: 'Rafael Benitez', daysAgo: 9 },
  { id: 9, name: 'Locadora Horizonte S.A.', document: 'CNPJ 98.765.432/0001-10', tipo: 'Pessoa Jurídica', email: 'frota@horizonte.com.br', phone: '(19) 3344-5566', estagio: 'Cliente Ativo', vehicles: 5, ltv: 1120000, owner: 'Júlia Lima', daysAgo: 14 },
  { id: 10, name: 'Fernando Klein', document: 'CPF 264.813.579-00', tipo: 'Pessoa Física', email: 'fernando.klein@gmail.com', phone: '(19) 99456-7890', estagio: 'Cliente Ativo', vehicles: 1, ltv: 244900, owner: 'Rafael Benitez', daysAgo: 21 },
  { id: 11, name: 'Priscila Andrade', document: 'CPF 391.482.675-00', tipo: 'Pessoa Física', email: 'priscila.andrade@gmail.com', phone: '(19) 99567-8901', estagio: 'Inativo', vehicles: 0, ltv: 0, owner: 'Júlia Lima', daysAgo: 96 },
]

export const clientes: Cliente[] = seeds.map(({ daysAgo, ...cliente }) => ({
  ...cliente,
  lastContact: isoFromToday(-daysAgo),
}))
