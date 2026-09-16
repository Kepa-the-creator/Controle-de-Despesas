export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function addMonthsClamped(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetYear = y + Math.floor((m - 1 + months) / 12);
  const targetMonthIndex = ((m - 1 + months) % 12 + 12) % 12;
  const day = Math.min(d, daysInMonth(targetYear, targetMonthIndex));
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
