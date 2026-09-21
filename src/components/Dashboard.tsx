import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sun,
  Moon,
} from 'lucide-react';
import { pb } from '../services/pocketbase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { CategoryChart } from './CategoryChart';
import { FixedExpenses, type FixedExpense } from './FixedExpenses';
import { MonthlyTrend } from './MonthlyTrend';
import { CategoryBudgets, type CategoryBudget } from './CategoryBudgets';
import { SavingsGoals, type SavingsGoal } from './SavingsGoals';
import { Accounts, type Account } from './Accounts';
import { HelpModal } from './HelpModal';
import { addMonthsClamped, daysInMonth, todayLocal } from '../lib/date';
import { toast } from '../lib/toast';
import { categoryStyle } from '../lib/categories';

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
  const { theme, toggle: toggleTheme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFixedExpensesOpen, setIsFixedExpensesOpen] = useState(false);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const generatingRef = useRef<Set<string>>(new Set());
  const [isCategoryBudgetsOpen, setIsCategoryBudgetsOpen] = useState(false);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [isSavingsGoalsOpen, setIsSavingsGoalsOpen] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<'income' | 'expense'>('expense');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formMode, setFormMode] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [category, setCategory] = useState('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash'>('pix');
  const [date, setDate] = useState(todayLocal());
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('2');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);

  // Contas ativas: usadas nos seletores de "nova transação/transferência" —
  // uma conta "Inativa" continua existindo pra histórico, mas não deve ser
  // oferecida como destino de lançamentos novos.
  const activeAccounts = useMemo(() => accounts.filter((a) => a.active !== false), [accounts]);

  // Preenche a conta padrão dos formulários assim que a lista carrega
  useEffect(() => {
    if (activeAccounts.length === 0) return;
    const defaultId = selectedAccountId !== 'all' ? selectedAccountId : activeAccounts[0].id;
    setAccountId((prev) => prev || defaultId);
    setFromAccountId((prev) => prev || defaultId);
    setToAccountId((prev) => prev || activeAccounts[1]?.id || defaultId);
  }, [activeAccounts, selectedAccountId]);

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
          // Promise.allSettled: se uma das duas falhar (ex: rede caiu no meio),
          // a outra ainda fica registrada — não perde a que deu certo.
          const results = await Promise.allSettled([
            pb.collection('accounts').create<Account>({
              name: 'Conta Corrente',
              initialBalance: 0,
              active: true,
              user: pb.authStore.record?.id,
            }),
            pb.collection('accounts').create<Account>({
              name: 'Cartão de Crédito',
              initialBalance: 0,
              active: true,
              user: pb.authStore.record?.id,
            }),
          ]);
          records = results
            .filter((r): r is PromiseFulfilledResult<Account> => r.status === 'fulfilled')
            .map((r) => r.value);
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

  // Busca inicial + assinatura em tempo real das transferências (sem isso,
  // uma transferência criada em outra aba/sessão nunca aparecia aqui)
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

    const unsubscribePromise = pb.collection('transfers').subscribe<Transfer>('*', (e) => {
      setTransfers((prev) => {
        if (e.action === 'create') {
          if (prev.some((t) => t.id === e.record.id)) return prev;
          return [e.record, ...prev];
        }
        if (e.action === 'update') {
          return prev.map((t) => (t.id === e.record.id ? e.record : t));
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

    const cursorMonthStr = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;

    // Só gera depois que as transações carregaram; antes disso a lista vem
    // vazia e tudo pareceria "faltando", duplicando os lançamentos a cada F5.
    if (loading) return;

    const pending = fixedExpenses.filter((fe) => {
      if (!fe.active) return false;
      if (fe.startMonth && cursorMonthStr < fe.startMonth) return false;
      if (generatingRef.current.has(`${fe.id}:${cursorMonthStr}`)) return false;
      return !transactions.some(
        (t) => t.recurringSource === fe.id && t.date.startsWith(cursorMonthStr)
      );
    });
    if (pending.length === 0) return;

    // Marca como "em andamento" antes de qualquer await, pra reexecuções do
    // efeito (disparadas pelas próprias criações) não gerarem de novo.
    for (const fe of pending) generatingRef.current.add(`${fe.id}:${cursorMonthStr}`);

    (async () => {
      for (const fe of pending) {
        const key = `${fe.id}:${cursorMonthStr}`;
        try {
          // Confere no servidor: é a fonte da verdade, mesmo que o estado local esteja defasado.
          const existing = await pb.collection('transactions').getList(1, 1, {
            filter: pb.filter('recurringSource = {:id} && date >= {:start} && date < {:end}', {
              id: fe.id,
              start: `${cursorMonthStr}-01`,
              end: `${cursor.month === 11 ? cursor.year + 1 : cursor.year}-${String(((cursor.month + 1) % 12) + 1).padStart(2, '0')}-01`,
            }),
          });
          if (existing.totalItems > 0) continue;
        } catch (err: any) {
          console.error('Erro ao conferir despesa fixa:', err.message);
          generatingRef.current.delete(key);
          continue;
        }
        const day = Math.min(fe.dayOfMonth, daysInMonth(cursor.year, cursor.month));
        const targetDate = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
          await pb.collection('transactions').create({
            description: fe.description,
            amount: fe.amount,
            type: fe.type,
            category: fe.category,
            paymentMethod: fe.paymentMethod,
            date: targetDate,
            account: fe.account,
            user: pb.authStore.record?.id,
            recurringSource: fe.id,
          });
        } catch (err: any) {
          console.error('Erro ao gerar despesa fixa:', err.message);
          generatingRef.current.delete(key);
        }
      }
    })();
  }, [cursor, fixedExpenses, transactions, loading]);

  // Cadastrar ou editar no banco (o estado é atualizado via assinatura em tempo real)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const totalAmount = parseFloat(amount);
    const validAccountIds = new Set(accounts.map((a) => a.id));

    if (editingTransferId) {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        toast.error('Escolha duas contas diferentes para a transferência.');
        return;
      }
      try {
        await pb.collection('transfers').update(editingTransferId, {
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount: totalAmount,
          date,
          description: description || undefined,
        });
        closeModal();
      } catch (err: any) {
        toast.error('Erro ao salvar transferência: ' + err.message);
      }
      return;
    }

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
        toast.error('Erro ao salvar alterações: ' + err.message);
      }
      return;
    }

    if (formMode === 'transfer') {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        toast.error('Escolha duas contas diferentes para a transferência.');
        return;
      }
      if (!validAccountIds.has(fromAccountId) || !validAccountIds.has(toAccountId)) {
        toast.error('Uma das contas selecionadas não existe mais. Feche este formulário e tente de novo.');
        return;
      }
      try {
        await pb.collection('transfers').create<Transfer>({
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount: totalAmount,
          date,
          description: description || undefined,
          user: pb.authStore.record?.id,
        });
        closeModal();
      } catch (err: any) {
        toast.error('Erro ao registrar transferência: ' + err.message);
      }
      return;
    }

    if (!description) return;
    if (!validAccountIds.has(accountId)) {
      toast.error('A conta selecionada não existe mais. Feche este formulário e tente de novo.');
      return;
    }
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
        // Divide em centavos e distribui o resto pelas primeiras parcelas
        // (método do maior resto) — evita drift de ponto flutuante e garante
        // no máximo 1 centavo de diferença entre parcelas.
        const installmentGroup = crypto.randomUUID();
        const totalCents = Math.round(totalAmount * 100);
        const baseCents = Math.floor(totalCents / installments);
        const remainderCents = totalCents - baseCents * installments;

        for (let i = 0; i < installments; i++) {
          const cents = baseCents + (i < remainderCents ? 1 : 0);
          await pb.collection('transactions').create({
            description,
            amount: cents / 100,
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
      toast.error('Erro ao salvar no banco: ' + err.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingTransferId(null);
    setDescription('');
    setAmount('');
    setFormMode('expense');
    setCategory('Alimentação');
    setPaymentMethod('pix');
    setDate(todayLocal());
    setAccountId(selectedAccountId !== 'all' ? selectedAccountId : activeAccounts[0]?.id ?? '');
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

  const handleEditTransferClick = (tr: Transfer) => {
    setEditingTransferId(tr.id);
    setFormMode('transfer');
    setDescription(tr.description ?? '');
    setAmount(String(tr.amount));
    setDate(tr.date.slice(0, 10));
    setFromAccountId(tr.fromAccount);
    setToAccountId(tr.toAccount);
    setIsModalOpen(true);
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!window.confirm('Excluir esta transferência? Isso muda o saldo das duas contas envolvidas.')) return;
    try {
      await pb.collection('transfers').delete(id);
    } catch (err: any) {
      toast.error('Erro ao excluir transferência: ' + err.message);
    }
  };

  // Excluir do banco (o estado é atualizado via assinatura em tempo real)
  const handleDelete = async (id: string) => {
    try {
      await pb.collection('transactions').delete(id);
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
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
      const [y, m] = t.date.slice(0, 10).split('-').map(Number);
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

  const incomeRows = useMemo(() => monthTransactions.filter((t) => t.type === 'income'), [monthTransactions]);
  const expenseRows = useMemo(() => monthTransactions.filter((t) => t.type === 'expense'), [monthTransactions]);

  // Transferências do mês visível, envolvendo a conta selecionada (ou todas)
  const monthTransfers = useMemo(() => {
    const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
    return transfers
      .filter((tr) => {
        if (!tr.date.startsWith(monthPrefix)) return false;
        if (selectedAccountId === 'all') return true;
        return tr.fromAccount === selectedAccountId || tr.toAccount === selectedAccountId;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transfers, cursor, selectedAccountId]);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '-';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const shortDate = (d: string) => d.slice(0, 10).split('-').reverse().join('/');

  const dayLabel = (d: string) => {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(new Date(y, m - 1, day));
    const w = weekday.replace('.', '');
    return `${w.charAt(0).toUpperCase()}${w.slice(1)}, ${String(day).padStart(2, '0')}`;
  };

  const iconBtn = 'p-1.5 rounded-lg text-slate-400 transition-colors cursor-pointer';

  const renderTxRow = (tx: Transaction) => (
    <li key={tx.id} className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-slate-800/30 transition-colors">
      {(() => {
        const { icon: CatIcon, cls } = categoryStyle(tx.category);
        return (
          <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cls}`} aria-hidden="true">
            <CatIcon className="w-4.5 h-4.5" />
          </div>
        );
      })()}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100 truncate">
          {tx.description}
          {tx.installmentTotal && (
            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 border border-slate-700/50 align-middle">
              {tx.installmentIndex}/{tx.installmentTotal}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-block px-2 py-0.5 text-[11px] rounded-lg bg-slate-800 text-slate-300 border border-slate-700/50">
            {tx.category}
          </span>
          <span className="text-[11px] text-slate-500 uppercase">
            {tx.paymentMethod ? tx.paymentMethod.replace('_', ' ') : '-'}
          </span>
          {selectedAccountId === 'all' && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {accountName(tx.account)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {tx.type === 'income' ? '+ ' : '- '}
          {formatCurrency(tx.amount)}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => handleEditClick(tx)} className={`${iconBtn} hover:text-blue-400 hover:bg-blue-500/10`} title="Editar">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(tx.id)} className={`${iconBtn} hover:text-rose-400 hover:bg-rose-500/10`} title="Excluir">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );

  const groupByDay = (rows: Transaction[]) => {
    const groups = new Map<string, Transaction[]>();
    for (const tx of rows) {
      const day = tx.date.slice(0, 10);
      const list = groups.get(day);
      if (list) list.push(tx);
      else groups.set(day, [tx]);
    }
    return Array.from(groups.entries());
  };

  const renderColumn = (kind: 'income' | 'expense', rows: Transaction[], total: number) => {
    const isIncome = kind === 'income';
    return (
      <section
        className={`${mobileTab === kind ? '' : 'hidden'} md:block rounded-2xl overflow-hidden border-2 border-slate-800 border-t-4 ${
          isIncome ? 'border-t-emerald-500' : 'border-t-rose-500'
        } bg-slate-900/60 shadow-sm`}
      >
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isIncome ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-100">{isIncome ? 'Entradas' : 'Saídas'}</h2>
              <p className="text-xs text-slate-500">
                {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}
              </p>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(total)}
          </span>
        </div>
        {loading ? (
          <ul className="divide-y divide-slate-800/60" aria-busy="true" aria-label="Carregando">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-slate-800" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-800" />
                </div>
                <div className="h-3 w-16 rounded bg-slate-800" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center text-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isIncome ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
            </div>
            <p className="text-sm text-slate-400">
              {isIncome ? 'Nenhuma entrada neste mês.' : 'Nenhuma saída neste mês.'}
            </p>
            <button
              type="button"
              onClick={() => openNewTransaction(kind)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer ${
                isIncome ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Plus className="w-4 h-4" /> {isIncome ? 'Adicionar entrada' : 'Adicionar saída'}
            </button>
          </div>
        ) : (
          <div className="md:max-h-[640px] md:overflow-y-auto">
            {groupByDay(rows).map(([day, dayRows]) => (
              <div key={day}>
                <div className="flex items-center justify-between px-4 sm:px-5 py-1.5 bg-slate-800/40 border-y border-slate-800 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>{dayLabel(day)}</span>
                  <span>{formatCurrency(dayRows.reduce((sum, t) => sum + Number(t.amount), 0))}</span>
                </div>
                <ul className="divide-y divide-slate-800/60">{dayRows.map(renderTxRow)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const openNewTransaction = (kind: 'income' | 'expense' = 'expense') => {
    const defaultId =
      kind === 'income'
        ? (accounts.find((a) => a.name === 'Conta Corrente') ?? activeAccounts[0])?.id ?? ''
        : selectedAccountId !== 'all'
          ? selectedAccountId
          : activeAccounts[0]?.id ?? '';
    setFormMode(kind);
    setAccountId(defaultId);
    setFromAccountId(defaultId);
    setToAccountId(activeAccounts[1]?.id ?? defaultId);
    setIsModalOpen(true);
  };

  const spentPct = summary.income > 0 ? (summary.expense / summary.income) * 100 : summary.expense > 0 ? 100 : 0;
  const spentBarColor = spentPct >= 100 ? 'bg-rose-500' : spentPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased p-4 md:p-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(5.5rem,env(safe-area-inset-bottom))] sm:pb-8">
      <div className="max-w-6xl mx-auto space-y-8 sm:border-2 sm:border-slate-800 sm:rounded-3xl sm:p-6 sm:shadow-sm">
        <header className="space-y-4 border-b-2 border-slate-800 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Wallet className="w-5 h-5 text-slate-100" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-100 truncate">
                  Controle de Despesas
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm">Seu controle financeiro</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                title={theme === 'light' ? 'Tema escuro' : 'Tema claro'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                title="Ajuda"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full sm:w-auto bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todas as contas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-900/60 border border-slate-800 rounded-xl px-1 py-1">
              <button
                onClick={goPrevMonth}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-100 sm:min-w-[130px] text-center capitalize">
                {monthLabel}
              </span>
              <button
                onClick={goNextMonth}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <button
              onClick={() => openNewTransaction()}
              className="hidden sm:flex sm:order-last items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 sm:py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Nova Transação
            </button>
            {[
              { label: 'Contas', icon: Landmark, onClick: () => setIsAccountsOpen(true) },
              { label: 'Fixos', icon: Repeat, onClick: () => setIsFixedExpensesOpen(true) },
              { label: 'Orçamento', icon: Gauge, onClick: () => setIsCategoryBudgetsOpen(true) },
              { label: 'Metas', icon: Target, onClick: () => setIsSavingsGoalsOpen(true) },
            ].map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4 text-blue-400" />
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* Resumo */}
        <div key={`${cursor.year}-${cursor.month}`} className="fade-in grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div className="bg-slate-900/60 border-2 border-slate-800 border-l-4 border-l-emerald-500 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-400">Receitas</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg sm:text-3xl font-bold text-slate-100 mt-2 sm:mt-4">{loading ? <span className="inline-block h-6 sm:h-8 w-24 sm:w-36 rounded bg-slate-800 animate-pulse align-middle" /> : formatCurrency(summary.income)}</p>
          </div>

          <div className="bg-slate-900/60 border-2 border-slate-800 border-l-4 border-l-rose-500 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-400">Despesas</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg sm:text-3xl font-bold text-slate-100 mt-2 sm:mt-4">{loading ? <span className="inline-block h-6 sm:h-8 w-24 sm:w-36 rounded bg-slate-800 animate-pulse align-middle" /> : formatCurrency(summary.expense)}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(spentPct)} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full ${spentBarColor} transition-all duration-500`} style={{ width: `${Math.min(100, spentPct)}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] sm:text-xs text-slate-400">
              {Math.round(spentPct)}% da receita do mês
            </p>
          </div>

          <div className="bg-slate-900/60 border-2 border-slate-800 border-l-4 border-l-slate-500 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-400">Saldo Anterior</span>
              <div className={`p-2 rounded-lg ${previousBalance >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <Repeat className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-lg sm:text-3xl font-bold mt-2 sm:mt-4 ${previousBalance >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
              {loading ? <span className="inline-block h-6 sm:h-8 w-24 sm:w-36 rounded bg-slate-800 animate-pulse align-middle" /> : formatCurrency(previousBalance)}
            </p>
          </div>

          <div className="bg-slate-900/60 border-2 border-slate-800 border-l-4 border-l-blue-500 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-400">Saldo Livre</span>
              <div className={`p-2 rounded-lg ${summary.balance >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-lg sm:text-3xl font-bold mt-2 sm:mt-4 ${summary.balance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {loading ? <span className="inline-block h-6 sm:h-8 w-24 sm:w-36 rounded bg-slate-800 animate-pulse align-middle" /> : formatCurrency(summary.balance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <MonthlyTrend
              transactions={accountFilteredTransactions}
              transfers={transfers}
              selectedAccountId={selectedAccountId}
              cursor={cursor}
              theme={theme}
            />
          </div>
          <CategoryChart transactions={monthTransactions} theme={theme} />
        </div>

        {/* Entradas e saídas */}
        <div className="md:hidden grid grid-cols-2 gap-2 p-1 bg-slate-900/60 border border-slate-800 rounded-xl">
          <button
            onClick={() => setMobileTab('income')}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              mobileTab === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => setMobileTab('expense')}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              mobileTab === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            Saídas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {renderColumn('income', incomeRows, summary.income)}
          {renderColumn('expense', expenseRows, summary.expense)}
        </div>

        {monthTransfers.length > 0 && (
          <section className="rounded-2xl overflow-hidden border-2 border-slate-800 border-t-4 border-t-blue-500 bg-slate-900/60 shadow-sm">
            <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-100">Transferências</h2>
                <p className="text-xs text-slate-500">Movimentação entre suas contas (não conta como entrada nem saída)</p>
              </div>
            </div>
            <ul className="divide-y divide-slate-800/60">
              {monthTransfers.map((tr) => (
                <li key={tr.id} className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-slate-800/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{tr.description || 'Transferência'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-block px-2 py-0.5 text-[11px] rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {accountName(tr.fromAccount)} → {accountName(tr.toAccount)}
                      </span>
                      <span className="text-[11px] text-slate-500">{shortDate(tr.date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold text-blue-400">{formatCurrency(tr.amount)}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleEditTransferClick(tr)} className={`${iconBtn} hover:text-blue-400 hover:bg-blue-500/10`} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTransfer(tr.id)} className={`${iconBtn} hover:text-rose-400 hover:bg-rose-500/10`} title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Modal */}
      <button
        onClick={() => openNewTransaction()}
        aria-label="Nova Transação"
        className="fab-pop sm:hidden fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {isModalOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="modal-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100 mb-4">
              {editingTransferId ? 'Editar Transferência' : editingId ? 'Editar Transação' : 'Nova Transação'}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {!editingTransferId && (
                <div className={`grid ${editingId ? 'grid-cols-2' : 'grid-cols-3'} gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800`}>
                  <button
                    type="button"
                    onClick={() => setFormMode('expense')}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formMode === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" /> Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('income');
                      if (!editingId) {
                        const contaCorrente = accounts.find((a) => a.name === 'Conta Corrente') ?? activeAccounts[0];
                        if (contaCorrente) setAccountId(contaCorrente.id);
                      }
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formMode === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" /> Receita
                  </button>
                  {!editingId && (
                    <button
                      type="button"
                      onClick={() => setFormMode('transfer')}
                      className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formMode === 'transfer' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      <ArrowRightLeft className="w-4 h-4" /> Transferência
                    </button>
                  )}
                </div>
              )}

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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
                        className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      {activeAccounts.map((acc) => (
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      {activeAccounts.map((acc) => (
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      {activeAccounts.map((acc) => (
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
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {editingTransferId || editingId
                    ? 'Salvar Alterações'
                    : formMode === 'transfer'
                    ? 'Registrar Transferência'
                    : 'Salvar no Banco'}
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
