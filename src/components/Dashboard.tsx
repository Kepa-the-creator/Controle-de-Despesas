import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { pb } from '../services/pocketbase';
import { useAuth } from '../hooks/useAuth';
import { CategoryChart } from './CategoryChart';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  date: string;
}

const sortByDateDesc = (list: Transaction[]) =>
  [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export function Dashboard() {
  const { logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash'>('pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Busca inicial + assinatura em tempo real (SSE) no PocketBase
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        const records = await pb.collection('transactions').getFullList<Transaction>({
          sort: '-date',
        });
        if (active) setTransactions(records);
      } catch (err: any) {
        console.error('Erro ao buscar transações:', err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const unsubscribePromise = pb.collection('transactions').subscribe<Transaction>('*', (e) => {
      setTransactions((prev) => {
        if (e.action === 'create') {
          if (prev.some((t) => t.id === e.record.id)) return prev;
          return sortByDateDesc([e.record, ...prev]);
        }
        if (e.action === 'update') {
          return sortByDateDesc(prev.map((t) => (t.id === e.record.id ? e.record : t)));
        }
        if (e.action === 'delete') {
          return prev.filter((t) => t.id !== e.record.id);
        }
        return prev;
      });
    });

    return () => {
      active = false;
      unsubscribePromise.then((unsubscribe) => unsubscribe());
    };
  }, []);

  // Cadastrar no banco (o estado é atualizado via assinatura em tempo real)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    try {
      await pb.collection('transactions').create({
        description,
        amount: parseFloat(amount),
        type,
        category,
        paymentMethod,
        date,
      });

      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      setType('expense');
    } catch (err: any) {
      alert('Erro ao salvar no banco: ' + err.message);
    }
  };

  // Excluir do banco (o estado é atualizado via assinatura em tempo real)
  const handleDelete = async (id: string) => {
    try {
      await pb.collection('transactions').delete(id);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const goPrevMonth = () => {
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  };

  const goNextMonth = () => {
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  };

  const monthLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      new Date(cursor.year, cursor.month, 1)
    );
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [cursor]);

  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const [y, m] = t.date.split('-').map(Number);
      return y === cursor.year && m - 1 === cursor.month;
    });
  }, [transactions, cursor]);

  // Cálculos de Resumo (referentes ao mês selecionado)
  const summary = useMemo(() => {
    return monthTransactions.reduce(
      (acc, t) => {
        const val = Number(t.amount);
        if (t.type === 'income') {
          acc.income += val;
        } else {
          acc.expense += val;
        }
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return monthTransactions;
    return monthTransactions.filter((t) => t.type === filterType);
  }, [monthTransactions, filterType]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Controle-de-Despesas
              </h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Conectado ao PocketBase local e persistente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 rounded-xl px-1 py-1">
              <button
                onClick={goPrevMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-white min-w-[130px] text-center capitalize">
                {monthLabel}
              </span>
              <button
                onClick={goNextMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Nova Transação
            </button>

            <button
              onClick={logout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Receitas</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mt-4">{formatCurrency(summary.income)}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Despesas</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mt-4">{formatCurrency(summary.expense)}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Saldo Livre</span>
              <div className={`p-2 rounded-lg ${summary.balance >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-3xl font-bold mt-4 ${summary.balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {formatCurrency(summary.balance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tabela */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Histórico de Transações</h2>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterType('income')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'income' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
                >
                  Receitas
                </button>
                <button
                  onClick={() => setFilterType('expense')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'expense' ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-slate-400 hover:text-white'}`}
                >
                  Despesas
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 text-xs text-slate-400 font-medium uppercase tracking-wider">
                    <th className="py-3 px-6">Descrição</th>
                    <th className="py-3 px-6">Categoria</th>
                    <th className="py-3 px-6">Método</th>
                    <th className="py-3 px-6">Data</th>
                    <th className="py-3 px-6 text-right">Valor</th>
                    <th className="py-3 px-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Carregando dados do servidor...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Nenhuma transação cadastrada neste período.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 font-medium text-white">{tx.description}</td>
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700/50">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 uppercase text-xs">
                          {tx.paymentMethod ? tx.paymentMethod.replace('_', ' ') : '-'}
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {tx.date ? tx.date.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className={`py-4 px-6 text-right font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+ ' : '- '}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico por categoria */}
          <CategoryChart transactions={monthTransactions} />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Nova Transação</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
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
                  placeholder="Ex: Aluguel, Salário, Supermercado..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
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
                  <label className="block text-xs font-medium text-slate-400 mb-1">Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit_card">Crédito</option>
                    <option value="debit_card">Débito</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Salvar no Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
