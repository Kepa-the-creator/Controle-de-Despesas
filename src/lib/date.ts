export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Data de hoje no fuso horário local (evita o bug de toISOString() converter
// pra UTC e "adiantar" o dia à noite para usuários em fusos negativos, ex: BR).
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addMonthsClamped(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetYear = y + Math.floor((m - 1 + months) / 12);
  const targetMonthIndex = ((m - 1 + months) % 12 + 12) % 12;
  const day = Math.min(d, daysInMonth(targetYear, targetMonthIndex));
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
