import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Trash2, Target, X, Coins } from 'lucide-react';
import { pb } from '../services/pocketbase';
import { todayLocal } from '../lib/date';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  period: 'monthly' | 'total';
  targetDate?: string;
}

interface Contribution {
  id: string;
  goal: string;
  amount: number;
  date: string;
}

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  onChange: (list: SavingsGoal[]) => void;
  cursor: { year: number; month: number };
  onClose: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function SavingsGoals({ goals, onChange, cursor, onClose }: SavingsGoalsProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'total'>('monthly');
  const [targetDate, setTargetDate] = useState('');
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const records = await pb.collection('savings_contributions').getFullList<Contribution>();
        setContributions(records);
      } catch (err: any) {
        console.error('Erro ao buscar aportes:', err.message);
      }
    })();
  }, []);

  const progressFor = (goal: SavingsGoal) => {
    const relevant = contributions.filter((c) => {
      if (c.goal !== goal.id) return false;
      if (goal.period === 'total') return true;
      const [y, m] = c.date.slice(0, 10).split('-').map(Number);
      return y === cursor.year && m - 1 === cursor.month;
    });
    return relevant.reduce((sum, c) => sum + Number(c.amount), 0);
  };

  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    try {
      const record = await pb.collection('savings_goals').create<SavingsGoal>({
        name,
        targetAmount: parseFloat(targetAmount),
        period,
        targetDate: targetDate || undefined,
        user: pb.authStore.record?.id,
      });
      onChange([...goals, record]);
      setName('');
      setTargetAmount('');
      setTargetDate('');
      setPeriod('monthly');
    } catch (err: any) {
      alert('Erro ao criar meta: ' + err.message);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await pb.collection('savings_goals').delete(id);
      onChange(goals.filter((g) => g.id !== id));
      setContributions((prev) => prev.filter((c) => c.goal !== id));
    } catch (err: any) {
      alert('Erro ao excluir meta: ' + err.message);
    }
  };

  const handleAddContribution = async (goalId: string) => {
    if (!contributionAmount) return;
    try {
      const record = await pb.collection('savings_contributions').create<Contribution>({
        goal: goalId,
        amount: parseFloat(contributionAmount),
        date: todayLocal(),
        user: pb.authStore.record?.id,
      });
      setContributions((prev) => [...prev, record]);
      setContributingGoalId(null);
      setContributionAmount('');
    } catch (err: any) {
      alert('Erro ao registrar aporte: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" /> Metas de Economia
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
          {goals.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhuma meta cadastrada.</p>
          ) : (
            goals.map((g) => {
              const saved = progressFor(g);
              const pct = Math.min(100, (saved / g.targetAmount) * 100);
              return (
                <div key={g.id} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{g.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                        {g.period === 'monthly' ? 'Mensal' : 'Total'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {formatCurrency(saved)} / {formatCurrency(g.targetAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>

                  {contributingGoalId === g.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        placeholder="Valor do aporte"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddContribution(g.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setContributingGoalId(null)}
                        className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setContributingGoalId(g.id)}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" /> Registrar aporte
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleCreateGoal} className="space-y-3 border-t border-slate-800 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nome da meta</label>
            <input
              type="text"
              required
              placeholder="Ex: Viagem, Reserva de emergência..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor alvo (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tipo</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'monthly' | 'total')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="monthly">Mensal</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Data alvo</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Criar meta
          </button>
        </form>
      </div>
    </div>
  );
}
