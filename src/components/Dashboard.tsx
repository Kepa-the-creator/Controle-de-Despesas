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
  Repeat,
  Pencil,
  Gauge,
  Target,
  Landmark,
  ArrowRightLeft,
  HelpCircle,
} from 'lucide-react';
import { pb } from '../services/pocketbase';
import { useAuth } from '../hooks/useAuth';
import { CategoryChart } from './CategoryChart';
import { FixedExpenses, type FixedExpense } from './FixedExpenses';
import { MonthlyTrend } from './MonthlyTrend';
import { CategoryBudgets, type CategoryBudget } from './CategoryBudgets';
import { SavingsGoals, type SavingsGoal } from './SavingsGoals';
import { Accounts, type Account } from './Accounts';
import { HelpModal } from './HelpModal';
import { addMonthsClamped, daysInMonth } from '../lib/date';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'cash';
  date: string;
  account: string;
  installmentGroup?: string;
  installmentIndex?: number;
  installmentTotal?: number;
  recurringSource?: string;
}

export interface Transfer {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  date: string;
  description?: string;
}

const sortByDateDesc = (list: Transaction[]) =>
  [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export function Dashboard() {
  const { logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFixedExpensesOpen, setIsFixedExpensesOpen] = useState(false);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [isCategoryBudgetsOpen, setIsCategoryBudgetsOpen] = useState(false);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [isSavingsGoalsOpen, setIsSavingsGoalsOpen] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formMode, setFormMode] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [category, setCategory] = useState('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash'>('pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('2');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Preenche a conta padrão dos formulários assim que a lista carrega
  useEffect(() => {
    if (accounts.length === 0) return;
    const defaultId = selectedAccountId !== 'all' ? selectedAccountId : accounts[0].id;
    setAccountId((prev) => prev || defaultId);
    setFromAccountId((prev) => prev || defaultId);
    setToAccountId((prev) => prev || accounts[1]?.id || defaultId);
  }, [accounts, selectedAccountId]);

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

  // Busca as contas do usuário; na primeira vez (sem nenhuma conta), cria
  // "Conta Corrente" e "Cartão de Crédito" automaticamente
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        let records = await pb.collection('accounts').getFullList<Account>();
        if (records.length === 0) {
          const contaCorrente = await pb.collection('accounts').create<Account>({
            name: 'Conta Corrente',
            initialBalance: 0,
            active: true,
            user: pb.authStore.record?.id,
          });
          const cartaoCredito = await pb.collection('accounts').create<Account>({
            name: 'Cartão de Crédito',
            initialBalance: 0,
            active: true,
            user: pb.authStore.record?.id,
          });
          records = [contaCorrente, cartaoCredito];
        }
        if (active) setAccounts(records);
      } catch (err: any) {
        console.error('Erro ao buscar contas:', err.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAccountsOpen]);

  // Busca as transferências entre contas
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const records = await pb.collection('transfers').getFullList<Transfer>();
        if (active) setTransfers(records);
      } catch (err: any) {
        console.error('Erro ao buscar transferências:', err.message);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Busca as despesas fixas do usuário (usadas para gerar lançamentos automáticos)
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const records = await pb.collection('fixed_expenses').getFullList<FixedExpense>();
        if (active) setFixedExpenses(records);
      } catch (err: any) {
        console.error('Erro ao buscar despesas fixas:', err.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isFixedExpensesOpen]);

  // Busca os limites de orçamento por categoria
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const records = await pb.collection('category_budgets').getFullList<CategoryBudget>();
        if (active) setCategoryBudgets(records);
      } catch (err: any) {
        console.error('Erro ao buscar orçamentos:', err.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isCategoryBudgetsOpen]);

  // Busca as metas de economia
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const records = await pb.collection('savings_goals').getFullList<SavingsGoal>();
        if (active) setSavingsGoals(records);
      } catch (err: any) {
        console.error('Erro ao buscar metas:', err.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isSavingsGoalsOpen]);

  // Gera automaticamente, para o mês visualizado (se já chegou ou já passou),
  // a transação de cada despesa fixa ativa que ainda não tem lançamento nesse mês.
  useEffect(() => {
    const now = new Date();
    const isPastOrCurrentMonth =
      cursor.year < now.getFullYear() ||
      (cursor.year === now.getFullYear() && cursor.month <= now.getMonth());
    if (!isPastOrCurrentMonth) return;

    const pending = fixedExpenses.filter((fe) => {
      if (!fe.active) return false;
      return !transactions.some(
        (t) =>
          t.recurringSource === fe.id &&
          t.date.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`)
      );
    });
    if (pending.length === 0) return;

    (async () => {
      for (const fe of pending) {
        const day = Math.min(fe.dayOfMonth, daysInMonth(cursor.year, cursor.month));
        const targetDate = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
          await pb.collection('transactions').create({
            description: fe.description,
            amount: fe.amount,
            type: 'expense',
            category: fe.category,
            paymentMethod: fe.paymentMethod,
            date: targetDate,
            account: fe.account,
            user: pb.authStore.record?.id,
            recurringSource: fe.id,
          });
        } catch (err: any) {
          console.error('Erro ao gerar despesa fixa:', err.message);
        }
      }
    })();
  }, [cursor, fixedExpenses, transactions]);

  // Cadastrar ou editar no banco (o estado é atualizado via assinatura em tempo real)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const totalAmount = parseFloat(amount);

    if (editingId) {
      if (!description) return;
      try {
        await pb.collection('transactions').update(editingId, {
          description,
          amount: totalAmount,
          type: formMode === 'transfer' ? 'expense' : formMode,
          category,
          paymentMethod,
          date,
          account: accountId,
        });
        closeModal();
      } catch (err: any) {
        alert('Erro ao salvar alterações: ' + err.message);
      }
      return;
    }

    if (formMode === 'transfer') {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        alert('Escolha duas contas diferentes para a transferência.');
        return;
      }
      try {
        const record = await pb.collection('transfers').create<Transfer>({
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount: totalAmount,
          date,
          description: description || undefined,
          user: pb.authStore.record?.id,
        });
        setTransfers((prev) => [...prev, record]);
        closeModal();
      } catch (err: any) {
        alert('Erro ao registrar transferência: ' + err.message);
      }
      return;
    }

    if (!description) return;
    const installments = isInstallment ? Math.max(2, parseInt(installmentCount, 10) || 2) : 1;

    try {
      if (installments === 1) {
        await pb.collection('transactions').create({
          description,
          amount: totalAmount,
          type: formMode,
          category,
          paymentMethod,
          date,
          account: accountId,
          user: pb.authStore.record?.id,
        });
      } else {
        const installmentGroup = crypto.randomUUID();
        const baseValue = Math.floor((totalAmount / installments) * 100) / 100;
        const lastValue = Math.round((totalAmount - baseValue * (installments - 1)) * 100) / 100;

        for (let i = 0; i < installments; i++) {
          await pb.collection('transactions').create({
            description,
            amount: i === installments - 1 ? lastValue : baseValue,
            type: formMode,
            category,
            paymentMethod,
            date: addMonthsClamped(date, i),
            account: accountId,
            user: pb.authStore.record?.id,
            installmentGroup,
            installmentIndex: i + 1,
            installmentTotal: installments,
          });
        }
      }

      closeModal();
    } catch (err: any) {
      alert('Erro ao salvar no banco: ' + err.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setDescription('');
    setAmount('');
    setFormMode('expense');
    setCategory('Alimentação');
    setPaymentMethod('pix');
    setDate(new Date().toISOString().split('T')[0]);
    setAccountId(selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id ?? '');
    setFromAccountId('');
    setToAccountId('');
    setIsInstallment(false);
    setInstallmentCount('2');
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingId(tx.id);
    setDescription(tx.description);
    setAmount(String(tx.amount));
    setFormMode(tx.type);
    setCategory(tx.category);
    setPaymentMethod(tx.paymentMethod);
    setDate(tx.date.slice(0, 10));
    setAccountId(tx.account);
    setIsInstallment(false);
    setIsModalOpen(true);
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

  // Transações da conta selecionada (ou todas, se "all")
  const accountFilteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter((t) => t.account === selectedAccountId);
  }, [transactions, selectedAccountId]);

  const monthTransactions = useMemo(() => {
    return accountFilteredTransactions.filter((t) => {
      const [y, m] = t.date.split('-').map(Number);
      return y === cursor.year && m - 1 === cursor.month;
    });
  }, [accountFilteredTransactions, cursor]);

  // Saldo acumulado de todos os meses anteriores ao selecionado. Ao ver
  // "Todas as contas", transferências entre contas próprias se cancelam e
  // não entram na conta; ao ver uma conta específica, elas contam.
  const previousBalance = useMemo(() => {
    const cursorStart = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`;
    const initial =
      selectedAccountId === 'all'
        ? accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0)
        : accounts.find((a) => a.id === selectedAccountId)?.initialBalance || 0;

    const txSum = accountFilteredTransactions.reduce((acc, t) => {
      if (t.date >= cursorStart) return acc;
      return acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
    }, 0);

    let transferSum = 0;
    if (selectedAccountId !== 'all') {
      transferSum = transfers.reduce((acc, tr) => {
        if (tr.date >= cursorStart) return acc;
        if (tr.toAccount === selectedAccountId) return acc + Number(tr.amount);
        if (tr.fromAccount === selectedAccountId) return acc - Number(tr.amount);
        return acc;
      }, 0);
    }

    return initial + txSum + transferSum;
  }, [accounts, accountFilteredTransactions, transfers, cursor, selectedAccountId]);

  // Net de transferências dentro do próprio mês selecionado (só relevante
  // pra uma conta específica; na visão agregada, cancela)
  const monthTransferNet = useMemo(() => {
    if (selectedAccountId === 'all') return 0;
    const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-`;
    return transfers.reduce((acc, tr) => {
      if (!tr.date.startsWith(monthPrefix)) return acc;
      if (tr.toAccount === selectedAccountId) return acc + Number(tr.amount);
      if (tr.fromAccount === selectedAccountId) return acc - Number(tr.amount);
      return acc;
    }, 0);
  }, [transfers, cursor, selectedAccountId]);

  // Cálculos de Resumo (referentes ao mês selecionado)
  const summary = useMemo(() => {
    const totals = monthTransactions.reduce(
      (acc, t) => {
        const val = Number(t.amount);
        if (t.type === 'income') {
          acc.income += val;
        } else {
          acc.expense += val;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
    return {
      ...totals,
      balance: totals.income - totals.expense + previousBalance + monthTransferNet,
    };
  }, [monthTransactions, previousBalance, monthTransferNet]);

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

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todas as contas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsAccountsOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
              title="Contas e carteiras"
            >
              <Landmark className="w-5 h-5" />
            </button>

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
              onClick={() => setIsFixedExpensesOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
              title="Despesas fixas"
            >
              <Repeat className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsCategoryBudgetsOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
              title="Orçamento por categoria"
            >
              <Gauge className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSavingsGoalsOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
              title="Metas de economia"
            >
              <Target className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const defaultId = selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id ?? '';
                setAccountId(defaultId);
                setFromAccountId(defaultId);
                setToAccountId(accounts[1]?.id ?? defaultId);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nova Transação</span>
            </button>

            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer"
              title="Ajuda"
            >
              <HelpCircle className="w-5 h-5" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
              <span className="text-sm font-medium text-slate-400">Saldo Anterior</span>
              <div className={`p-2 rounded-lg ${previousBalance >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <Repeat className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-3xl font-bold mt-4 ${previousBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(previousBalance)}
            </p>
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

        <MonthlyTrend transactions={accountFilteredTransactions} cursor={cursor} />

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

            <div className="hidden md:block overflow-x-auto">
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
                        <td className="py-4 px-6 font-medium text-white">
                          {tx.description}
                          {tx.installmentTotal && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700/50 align-middle">
                              {tx.installmentIndex}/{tx.installmentTotal}
                            </span>
                          )}
                          {selectedAccountId === 'all' && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 align-middle">
                              {accounts.find((a) => a.id === tx.account)?.name ?? '-'}
                            </span>
                          )}
                        </td>
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <div className="md:hidden divide-y divide-slate-800/40">
              {loading ? (
                <p className="py-8 text-center text-slate-500 text-sm">Carregando dados do servidor...</p>
              ) : filteredTransactions.length === 0 ? (
                <p className="py-8 text-center text-slate-500 text-sm">Nenhuma transação cadastrada neste período.</p>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        {tx.description}
                        {tx.installmentTotal && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700/50 align-middle">
                            {tx.installmentIndex}/{tx.installmentTotal}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-block px-2 py-0.5 text-[11px] rounded-lg bg-slate-800 text-slate-300 border border-slate-700/50">
                          {tx.category}
                        </span>
                        <span className="text-[11px] text-slate-500 uppercase">
                          {tx.paymentMethod ? tx.paymentMethod.replace('_', ' ') : '-'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {tx.date ? tx.date.split('-').reverse().join('/') : '-'}
                        </span>
                        {selectedAccountId === 'all' && (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {accounts.find((a) => a.id === tx.account)?.name ?? '-'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.type === 'income' ? '+ ' : '- '}
                        {formatCurrency(tx.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
            <h3 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Editar Transação' : 'Nova Transação'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className={`grid ${editingId ? 'grid-cols-2' : 'grid-cols-3'} gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800`}>
                <button
                  type="button"
                  onClick={() => setFormMode('expense')}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    formMode === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" /> Despesa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('income');
                    if (!editingId) {
                      const contaCorrente = accounts.find((a) => a.name === 'Conta Corrente');
                      if (contaCorrente) setAccountId(contaCorrente.id);
                    }
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    formMode === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" /> Receita
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => setFormMode('transfer')}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formMode === 'transfer' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Transferência
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Descrição {formMode === 'transfer' && <span className="text-slate-600">(opcional)</span>}
                </label>
                <input
                  type="text"
                  required={formMode !== 'transfer'}
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

              {!editingId && formMode !== 'transfer' && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInstallment}
                      onChange={(e) => setIsInstallment(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                    />
                    Compra parcelada?
                  </label>
                  {isInstallment && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        required
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-slate-500">parcelas</span>
                    </div>
                  )}
                </div>
              )}

              {formMode === 'transfer' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Conta de origem</label>
                    <select
                      value={fromAccountId}
                      required
                      onChange={(e) => setFromAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Conta de destino</label>
                    <select
                      value={toAccountId}
                      required
                      onChange={(e) => setToAccountId(e.target.value)}
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
              ) : (
                <>
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
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {editingId ? 'Salvar Alterações' : formMode === 'transfer' ? 'Registrar Transferência' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFixedExpensesOpen && (
        <FixedExpenses
          fixedExpenses={fixedExpenses}
          onChange={setFixedExpenses}
          accounts={accounts}
          onClose={() => setIsFixedExpensesOpen(false)}
        />
      )}

      {isAccountsOpen && (
        <Accounts
          accounts={accounts}
          onChange={setAccounts}
          transactions={transactions}
          transfers={transfers}
          onClose={() => setIsAccountsOpen(false)}
        />
      )}

      {isCategoryBudgetsOpen && (
        <CategoryBudgets
          budgets={categoryBudgets}
          onChange={setCategoryBudgets}
          monthTransactions={monthTransactions}
          onClose={() => setIsCategoryBudgetsOpen(false)}
        />
      )}

      {isSavingsGoalsOpen && (
        <SavingsGoals
          goals={savingsGoals}
          onChange={setSavingsGoals}
          cursor={cursor}
          onClose={() => setIsSavingsGoalsOpen(false)}
        />
      )}

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </div>
  );
}
