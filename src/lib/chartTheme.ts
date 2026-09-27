import type { Theme } from '../hooks/useTheme';

export function chartTheme(theme: Theme) {
  return theme === 'light'
    ? {
        grid: '#c9c0ac',
        axis: '#6b7260',
        legend: '#6b7260',
        tooltip: { background: '#f5f1e6', border: '1px solid #c9c0ac', borderRadius: 6, color: '#23281f' },
        income: '#2f6f4e',
        expense: '#9a3b34',
        balance: '#2b4c7e',
      }
    : {
        grid: '#383f30',
        axis: '#9ca28d',
        legend: '#9ca28d',
        tooltip: { background: '#1f231b', border: '1px solid #383f30', borderRadius: 6, color: '#eae5d6' },
        income: '#6fb98c',
        expense: '#d98479',
        balance: '#7fa0d1',
      };
}
