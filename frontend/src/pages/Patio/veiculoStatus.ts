// Valores iguais aos do enum "Status" do model Veiculo (backend).
export const STATUS_OPTIONS = [
    { value: 'disponivel', label: 'Disponível' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'preparacao', label: 'Em preparação' },
    { value: 'manutencao', label: 'Em manutenção' },
    { value: 'vendido', label: 'Vendido' },
  ] as const
  
  export function statusLabel(value: string): string {
    return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
  }