export type FunilStageId = 'interesse' | 'test-drive' | 'negociacao' | 'credito' | 'vendido'

export type FunilStage = {
  id: FunilStageId
  title: string
  helper: string
  color: string
}

export type FunilCard = {
  id: number
  stage: FunilStageId
  name: string
  source: string
  vehicle: string
  value: number
  daysInStage: number
  owner: string
  nextStep: string
}

export const staleThresholdDays = 8

export const funilStages: FunilStage[] = [
  { id: 'interesse', title: 'Interesse', helper: 'Primeiro contato', color: '#9aa0ac' },
  { id: 'test-drive', title: 'Test drive', helper: 'Agendado', color: '#38bdf8' },
  { id: 'negociacao', title: 'Negociação', helper: 'Proposta na mesa', color: '#3b6dfa' },
  { id: 'credito', title: 'Crédito', helper: 'Em análise', color: '#f59e0b' },
  { id: 'vendido', title: 'Vendido', helper: 'Contrato assinado', color: '#16a34a' },
]

export const funilSources = [
  'Instagram',
  'Indicação',
  'Site próprio',
  'Loja física',
  'Portal OLX',
  'Portal Webmotors',
]

export const funilOwners = ['Rafael B.', 'Júlia L.', 'Marina P.', 'Tiago M.']

export const initialFunilCards: FunilCard[] = [
  { id: 1, stage: 'interesse', name: 'Marcos Vinícius', source: 'Instagram', vehicle: 'Audi A5 S Line', value: 189900, daysInStage: 2, owner: 'Rafael B.', nextStep: 'Ligar hoje 16h' },
  { id: 2, stage: 'interesse', name: 'Renata Kubitschek', source: 'Indicação', vehicle: 'VW Nivus Highline', value: 129900, daysInStage: 5, owner: 'Júlia L.', nextStep: 'Enviar fotos' },
  { id: 3, stage: 'interesse', name: 'Danilo Ferraz', source: 'Portal OLX', vehicle: 'Jeep Compass Limited', value: 174900, daysInStage: 9, owner: 'Tiago M.', nextStep: 'Sem retorno' },

  { id: 4, stage: 'test-drive', name: 'Camila Ferraz', source: 'Site próprio', vehicle: 'Porsche 718 Cayman S', value: 412300, daysInStage: 1, owner: 'Júlia L.', nextStep: 'Test drive sábado 10h' },
  { id: 5, stage: 'test-drive', name: 'Eduardo Nascimento', source: 'Loja física', vehicle: 'BMW X1 sDrive20i', value: 228450, daysInStage: 3, owner: 'Rafael B.', nextStep: 'Test drive amanhã 14h' },

  { id: 6, stage: 'negociacao', name: 'Henrique Lobo', source: 'Indicação', vehicle: 'Volvo XC60 Inscription', value: 265000, daysInStage: 4, owner: 'Marina P.', nextStep: 'Contraproposta R$255k' },
  { id: 7, stage: 'negociacao', name: 'Bianca Souza', source: 'Instagram', vehicle: 'Toyota Corolla Altis', value: 158700, daysInStage: 8, owner: 'Tiago M.', nextStep: 'Avaliar troca' },

  { id: 8, stage: 'credito', name: 'Larissa Prado', source: 'Site próprio', vehicle: 'Range Rover Evoque', value: 298000, daysInStage: 6, owner: 'Marina P.', nextStep: 'Aguardando Santander' },
  { id: 9, stage: 'credito', name: 'Fernando Klein', source: 'Indicação', vehicle: 'Mercedes GLA 200', value: 244900, daysInStage: 0, owner: 'Rafael B.', nextStep: 'Definir próximo passo' },

  { id: 10, stage: 'vendido', name: 'Priscila Andrade', source: 'Portal Webmotors', vehicle: 'Audi Q5 2.0 TFSI', value: 220000, daysInStage: 0, owner: 'Júlia L.', nextStep: 'Definir próximo passo' },
  { id: 11, stage: 'vendido', name: 'Rodrigo Bastos', source: 'Loja física', vehicle: 'Chevrolet Tracker Premier', value: 141500, daysInStage: 0, owner: 'Tiago M.', nextStep: 'Definir próximo passo' },
  { id: 12, stage: 'vendido', name: 'Juliana Mesquita', source: 'Portal OLX', vehicle: 'Audi Q3 Prestige', value: 219000, daysInStage: 0, owner: 'Marina P.', nextStep: 'Definir próximo passo' },
]
