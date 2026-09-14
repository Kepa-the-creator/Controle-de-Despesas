import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Transaction } from './Dashboard';

const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface CategoryChartProps {
  transactions: Transaction[];
}

export function CategoryChart({ transactions }: CategoryChartProps) {
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
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-white mb-4">Despesas por Categoria</h2>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[280px]">
          <p className="text-slate-500 text-sm">Sem despesas neste período.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#fff' }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
