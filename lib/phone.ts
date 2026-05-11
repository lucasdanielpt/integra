/** Apenas dígitos (celular BR, com ou sem DDD 9). */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '')
}

/** Celular BR: 10 (fixo) ou 11 (celular com 9) dígitos. */
export function isValidBrMobileDigits(digits: string): boolean {
  if (digits.length < 10 || digits.length > 11) return false
  return true
}

/** Ex.: 11999887766 → (11) 99988-7766 */
export function formatPhoneDisplay(digits: string): string {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return digits
}
