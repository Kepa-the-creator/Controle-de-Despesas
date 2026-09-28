import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Transaction } from './Dashboard';
import type { Theme } from '../hooks/useTheme';
import { chartTheme } from '../lib/chartTheme';
import { categoryStyle, type Category } from '../lib/categories';

interface CategoryChartProps {
  transactions: Transaction[];
  categories: Category[];
  theme: Theme;
}

export function CategoryChart({ transactions, categories, theme }: CategoryChartProps) {
  const c = chartTheme(theme);
  const data = Object.values(
    transactions
      .filter((t) => t.type === 'expense')
      .reduce<Record<string, { name: string; value: number }>>((acc, t) => {
        acc[t.category] = acc[t.category] ?? { name: t.category, value: 0 };
        acc[t.category].value += Number(t.amount);
        return acc;
      }, {})
  ).sort((a, b) => b.value - a.value);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-paper-raised border border-rule rounded-md p-6">
      <h2 className="text-lg font-semibold text-ink mb-4">Despesas por categoria</h2>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[280px]">
          <p className="text-ink-soft text-sm">Sem despesas neste período.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={i} fill={categoryStyle(categories, entry.name).color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={c.tooltip}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: c.legend }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
