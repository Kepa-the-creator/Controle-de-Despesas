import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Transaction, Transfer } from './Dashboard';
import type { Theme } from '../hooks/useTheme';
import { chartTheme } from '../lib/chartTheme';

interface MonthlyTrendProps {
  transactions: Transaction[];
  transfers: Transfer[];
  selectedAccountId: string;
  cursor: { year: number; month: number };
  theme: Theme;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const monthShortLabel = (year: number, month: number) => {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month, 1));
  return `${label.replace('.', '')}/${String(year).slice(-2)}`;
};

export function MonthlyTrend({ transactions, transfers, selectedAccountId, cursor, theme }: MonthlyTrendProps) {
  const c = chartTheme(theme);
  const data = useMemo(() => {
    // Uma única passada agrupando por mês (em vez de 12 passadas completas
    // pelo histórico inteiro), já somando o efeito das transferências pra
    // o "Saldo" bater com o card de resumo do mesmo mês/conta.
    const byMonth = new Map<string, { income: number; expense: number; transferNet: number }>();
    const get = (key: string) => {
      let entry = byMonth.get(key);
      if (!entry) {
        entry = { income: 0, expense: 0, transferNet: 0 };
        byMonth.set(key, entry);
      }
      return entry;
    };

    for (const t of transactions) {
      const entry = get(t.date.slice(0, 7));
      if (t.type === 'income') entry.income += Number(t.amount);
      else entry.expense += Number(t.amount);
    }

    if (selectedAccountId !== 'all') {
      for (const tr of transfers) {
        const entry = get(tr.date.slice(0, 7));
        if (tr.toAccount === selectedAccountId) entry.transferNet += Number(tr.amount);
        if (tr.fromAccount === selectedAccountId) entry.transferNet -= Number(tr.amount);
      }
    }

    const months: { year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const total = cursor.year * 12 + cursor.month - i;
      const year = Math.floor(total / 12);
      const month = ((total % 12) + 12) % 12;
      months.push({ year, month });
    }

    return months.map(({ year, month }) => {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const entry = byMonth.get(key) ?? { income: 0, expense: 0, transferNet: 0 };
      return {
        label: monthShortLabel(year, month),
        income: entry.income,
        expense: entry.expense,
        balance: entry.income - entry.expense + entry.transferNet,
      };
    });
  }, [transactions, transfers, selectedAccountId, cursor]);

  return (
    <div className="bg-slate-900/60 border-2 border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Evolução Mensal (últimos 12 meses)</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="label" stroke={c.axis} fontSize={12} />
          <YAxis stroke={c.axis} fontSize={12} tickFormatter={(v) => formatCurrency(Number(v))} width={90} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={c.tooltip}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: c.legend }} />
          <Line type="monotone" dataKey="income" name="Receitas" stroke={c.income} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expense" name="Despesas" stroke={c.expense} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="balance" name="Saldo" stroke={c.balance} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
