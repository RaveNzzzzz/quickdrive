import {
  Car,
  Filter,
  Home,
  Package,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'

export type NavItem = {
  label: string
  path: string
  icon: React.ComponentType<{ size?: number }>
  description: string
}

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Visão Geral',
    items: [{ label: 'Home', path: '/', icon: Home, description: 'Resumo da loja hoje' }],
  },
  {
    title: 'Veículos',
    items: [
      { label: 'Estoque', path: '/estoque', icon: Package, description: 'Produtos e insumos da operação' },
      { label: 'Pátio', path: '/patio', icon: Car, description: 'Veículos disponíveis para venda' },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { label: 'Vendas', path: '/vendas', icon: ShoppingCart, description: 'Faturamento e vendas realizadas' },
      { label: 'Clientes', path: '/clientes', icon: Users, description: 'Base de clientes e relacionamento' },
      { label: 'Funil de Vendas', path: '/funil', icon: Filter, description: 'Cada negociação na sua etapa' },
    ],
  },
  {
    title: 'Finanças',
    items: [{ label: 'Financeiro', path: '/financeiro', icon: Wallet, description: 'Contas a pagar e a receber' }],
  },
  {
    title: 'Equipe',
    items: [{ label: 'Funcionários', path: '/funcionarios', icon: UserCog, description: 'Equipe, setores e status' }],
  },
]

export const navItems = navGroups.flatMap((group) => group.items)

// Pages that exist as routes but are not in the menu
const hiddenPages: Pick<NavItem, 'label' | 'path' | 'description'>[] = [
  { label: 'Meu perfil', path: '/perfil', description: 'Informações da sua conta' },
  { label: 'Trocar senha', path: '/perfil/senha', description: 'Definir uma nova senha' },
  { label: 'Financeiro (versão do Figma)', path: '/financeirofigma', description: 'Versão original, só para comparação' },
]

export function findPage(pathname: string) {
  const path = pathname.toLowerCase()
  return (
    navItems.find((item) => item.path === path) ??
    hiddenPages.find((item) => item.path === path)
  )
}
