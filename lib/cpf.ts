export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, '')
}

export function isValidCpfLength(cpf: string): boolean {
  return cpf.length === 11
}
