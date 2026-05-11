export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, '')
}

export function isValidCpfLength(cpf: string): boolean {
  return cpf.length === 11
}

/** CPF óbvios inválidos: todos os dígitos iguais. */
export function isTrivialInvalidCpf(cpf: string): boolean {
  if (cpf.length !== 11) return true
  return /^(\d)\1{10}$/.test(cpf)
}

/**
 * Verifica dígitos verificadores do CPF (Cadastro de Pessoa Física – BR).
 * Entrada já normalizada em 11 caracteres só numéricos.
 */
export function isValidCpfChecksum(cpf: string): boolean {
  if (cpf.length !== 11) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]!, 10) * (10 - i)
  }
  let r = (sum * 10) % 11
  if (r === 10) r = 0
  if (r !== parseInt(cpf[9]!, 10)) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]!, 10) * (11 - i)
  }
  r = (sum * 10) % 11
  if (r === 10) r = 0
  return r === parseInt(cpf[10]!, 10)
}

/** CPF válido para uso nas regras de negócio (comprimento + trivial + checksum). */
export function isValidCpf(normalizedDigits: string): boolean {
  if (!isValidCpfLength(normalizedDigits)) return false
  if (isTrivialInvalidCpf(normalizedDigits)) return false
  return isValidCpfChecksum(normalizedDigits)
}

/** Mensagem amigável se o usuário não puder usar este CPF; `undefined` se está ok para enviar. */
export function rejectionMessageForCpfInput(raw: string): string | undefined {
  const cpf = normalizeCpf(raw)
  if (cpf.length < 11) {
    const falta = 11 - cpf.length
    return falta === 1
      ? 'Informe todos os números: falta 1 dígito no CPF.'
      : `Informe todos os números: faltam ${falta} dígitos no CPF.`
  }
  if (!isValidCpf(cpf)) {
    return 'Este número não é um CPF válido. Confira os dígitos digitados.'
  }
  return undefined
}
