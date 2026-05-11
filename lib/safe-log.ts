import { normalizeCpf } from '@/lib/cpf'
import { normalizePhone } from '@/lib/phone'

/**
 * Métricas de texto livre para observabilidade **sem** expor CPF, telefone ou nome.
 * Use ao registrar eventos ou tratar erros no servidor — nunca use `normalizeCpf` em `console.log` direto.
 */
export function describeCpfForLog(raw: string): string {
  const d = normalizeCpf(raw)
  if (d.length === 0) return 'cpf_vazio'
  if (d.length < 11) return `cpf_${d.length}_digitos`
  return 'cpf_11_digitos_validado_servidor'
}

export function describePhoneForLog(raw: string): string {
  const n = normalizePhone(raw).length
  if (n === 0) return 'tel_vazio'
  if (n < 10) return `tel_${n}_digitos`
  return 'tel_digitos_ok'
}
