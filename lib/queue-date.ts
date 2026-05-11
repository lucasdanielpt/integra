/** Data corrente no fuso America/Sao_Paulo, como `Date` ao meio-dia UTC (uso em coluna `@db.Date`). */
export function brazilTodayDate(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value
  return new Date(`${y}-${m}-${d}T12:00:00.000Z`)
}
