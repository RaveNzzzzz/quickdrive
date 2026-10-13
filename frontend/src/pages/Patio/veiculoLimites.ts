// Limites dos campos do veículo. O backend valida os mesmos valores
// (backend/vehicles/schemas.py) — se mudar aqui, mude lá também.

export const ANO_MINIMO = 1900
export const anoMaximoModelo = () => new Date().getFullYear() + 1

export const LIMITES = {
  modelo: 60,
  versao: 60,
  cor: 30,
  motorizacao: 30,
  vaga: 10,
  placa: 7, // ABC1234 ou ABC1D23 (sem hífen)
  chassi: 17,
  renavam: 11,
  quilometragem: { max: 999_999, digitos: 6 },
  portas: { min: 2, max: 6, digitos: 1 },
  lugares: { min: 1, max: 9, digitos: 1 },
  porta_malas: { max: 9_999, digitos: 4 },
  ano_modelo: { digitos: 4 },
  valor: { max: 99_999_999.99, digitos: 10 }, // em centavos: 10 dígitos = R$ 99.999.999,99
} as const

/** Só números, cortando no máximo de dígitos. */
export function apenasDigitos(texto: string, maxDigitos: number): string {
  return texto.replace(/\D/g, '').slice(0, maxDigitos)
}

/** Letras e números em maiúsculas, cortando no máximo. */
export function placaDigitada(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LIMITES.placa)
}

/** Chassi (VIN) não usa I, O e Q — essas letras são descartadas na digitação. */
export function chassiDigitado(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, '')
    .slice(0, LIMITES.chassi)
}

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Máscara de dinheiro: os dígitos entram pela direita como centavos
 * ("1" → "0,01", "150000" → "1.500,00"). Nunca passa de 10 dígitos.
 */
export function valorDigitado(texto: string): string {
  const digitos = apenasDigitos(texto, 99).replace(/^0+/, '').slice(0, LIMITES.valor.digitos)
  return digitos === '' ? '' : brl.format(Number(digitos) / 100)
}

/** "1.500,00" → 1500 */
export function valorParaNumero(texto: string): number {
  const digitos = texto.replace(/\D/g, '')
  return digitos === '' ? 0 : Number(digitos) / 100
}

/** 1500 → "1.500,00" (para preencher o formulário ao editar) */
export function numeroParaValor(valor: number): string {
  return brl.format(Math.min(valor, LIMITES.valor.max))
}

export const PLACA_RE = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/
export const CHASSI_RE = /^[A-HJ-NPR-Z0-9]{17}$/

/** Confere o dígito verificador (último dígito) do RENAVAM de 11 dígitos. */
export function renavamValido(renavam: string): boolean {
  if (!/^\d{11}$/.test(renavam)) return false
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const soma = pesos.reduce((acc, peso, i) => acc + Number(renavam[i]) * peso, 0)
  const digito = (soma * 10) % 11
  return (digito === 10 ? 0 : digito) === Number(renavam[10])
}
