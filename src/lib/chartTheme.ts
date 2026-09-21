import type { Theme } from '../hooks/useTheme';

export function chartTheme(theme: Theme) {
  return theme === 'light'
    ? {
        grid: '#e2e8f0',
        axis: '#64748b',
        legend: '#475569',
        tooltip: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#1e293b' },
        income: '#059669',
        expense: '#e11d48',
        balance: '#2563eb',
      }
    : {
        grid: '#1e293b',
        axis: '#64748b',
        legend: '#94a3b8',
        tooltip: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#ffffff' },
        income: '#10b981',
        expense: '#f43f5e',
        balance: '#3b82f6',
      };
}
