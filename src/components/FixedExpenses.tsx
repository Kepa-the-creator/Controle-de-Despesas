import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Repeat, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { pb } from '../services/pocketbase';

export interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod?: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  dayOfMonth: number;
  active: boolean;
  account: string;
  startMonth: string;
}

interface AccountOption {
  id: string;
  name: string;
}

interface FixedExpensesProps {
  fixedExpenses: FixedExpense[];
  onChange: (list: FixedExpense[]) => void;
  accounts: AccountOption[];
  onClose: () => void;
}

export function FixedExpenses({ fixedExpenses, onChange, accounts, onClose }: FixedExpensesProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Moradia');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash'>('pix');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !accountId) return;

    try {
      const now = new Date();
      const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const record = await pb.collection('fixed_expenses').create<FixedExpense>({
        description,
        amount: parseFloat(amount),
        type,
        category,
        paymentMethod,
        dayOfMonth: Math.min(31, Math.max(1, parseInt(dayOfMonth, 10) || 1)),
        active: true,
        startMonth,
        account: accountId,
        user: pb.authStore.record?.id,
      });
      onChange([...fixedExpenses, record]);
      setDescription('');
      setAmount('');
      setType('expense');
      setDayOfMonth('5');
    } catch (err: any) {
      alert('Erro ao salvar lançamento fixo: ' + err.message);
    }
  };

  const handleToggleActive = async (fe: FixedExpense) => {
    try {
      await pb.collection('fixed_expenses').update(fe.id, { active: !fe.active });
      onChange(fixedExpenses.map((item) => (item.id === fe.id ? { ...item, active: !item.active } : item)));
    } catch (err: any) {
      alert('Erro ao atualizar despesa fixa: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('fixed_expenses').delete(id);
      onChange(fixedExpenses.filter((item) => item.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir despesa fixa: ' + err.message);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-400" /> Lançamentos Fixos
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
          {fixedExpenses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum lançamento fixo cadastrado.</p>
          ) : (
            fixedExpenses.map((fe) => (
              <div
                key={fe.id}
                className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5"
              >
                <div className="min-w-0 flex items-start gap-2">
                  <div className={`mt-0.5 p-1 rounded-md shrink-0 ${fe.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {fe.type === 'income' ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{fe.description}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(fe.amount)} · todo dia {fe.dayOfMonth} · {fe.category} ·{' '}
                      {accounts.find((a) => a.id === fe.account)?.name ?? '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(fe)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      fe.active
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {fe.active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(fe.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-3 border-t border-slate-800 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" /> Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" /> Receita
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel, Netflix..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Dia do mês</label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="pix">PIX</option>
                <option value="credit_card">Crédito</option>
                <option value="debit_card">Débito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Alimentação">Alimentação</option>
                <option value="Moradia">Moradia</option>
                <option value="Lazer">Lazer</option>
                <option value="Transporte">Transporte</option>
                <option value="Salário">Salário</option>
                <option value="Freela">Freela</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Conta</label>
              <select
                value={accountId}
                required
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!accountId}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adicionar lançamento fixo
          </button>
        </form>
      </div>
    </div>
  );
}
