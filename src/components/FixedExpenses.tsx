import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Repeat, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { pb } from '../services/pocketbase';
import { toast } from '../lib/toast';
import { categoryStyle, type Category } from '../lib/categories';

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
 active?: boolean;
}

interface FixedExpensesProps {
 fixedExpenses: FixedExpense[];
 onChange: (list: FixedExpense[]) => void;
 accounts: AccountOption[];
 categories: Category[];
 onClose: () => void;
}

export function FixedExpenses({ fixedExpenses, onChange, accounts, categories, onClose }: FixedExpensesProps) {
 const activeAccounts = accounts.filter((a) => a.active !== false);
 const [description, setDescription] = useState('');
 const [amount, setAmount] = useState('');
 const [type, setType] = useState<'income' | 'expense'>('expense');
 const [category, setCategory] = useState('');
 // Cai pra primeira categoria carregada até a pessoa escolher outra —
 // sem efeito, é só o valor mostrado/enviado quando `category` ainda
 // está vazio (ex: categorias chegaram depois do primeiro render).
 const effectiveCategory = category || categories[0]?.name || '';
 const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'debit_card' | 'cash'>('pix');
 const [dayOfMonth, setDayOfMonth] = useState('5');
 const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? '');
 const [submitting, setSubmitting] = useState(false);

 const handleAdd = async (e: FormEvent) => {
 e.preventDefault();
 if (!description || !amount || !accountId || submitting) return;

 setSubmitting(true);
 try {
 const now = new Date();
 const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 const record = await pb.collection('fixed_expenses').create<FixedExpense>({
 description,
 amount: parseFloat(amount),
 type,
 category: effectiveCategory,
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
 toast.error('Erro ao salvar lançamento fixo: ' + err.message);
 } finally {
 setSubmitting(false);
 }
 };

 const handleToggleActive = async (fe: FixedExpense) => {
 try {
 await pb.collection('fixed_expenses').update(fe.id, { active: !fe.active });
 onChange(fixedExpenses.map((item) => (item.id === fe.id ? { ...item, active: !item.active } : item)));
 } catch (err: any) {
 toast.error('Erro ao atualizar despesa fixa: ' + err.message);
 }
 };

 const handleDelete = async (id: string) => {
 if (
 !window.confirm(
 'Excluir este lançamento fixo? Isso também apaga TODAS as transações que ele já gerou automaticamente (histórico incluso), não só as futuras.'
 )
 ) {
 return;
 }
 try {
 await pb.collection('fixed_expenses').delete(id);
 onChange(fixedExpenses.filter((item) => item.id !== id));
 } catch (err: any) {
 toast.error('Erro ao excluir despesa fixa: ' + err.message);
 }
 };

 const formatCurrency = (val: number) =>
 new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

 return (
 <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 ">
 <div className="modal-panel bg-paper-raised border border-rule rounded-md w-full max-w-lg p-6 shadow-md">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xl font-bold text-ink flex items-center gap-2">
 <Repeat className="w-5 h-5 text-accent" /> Lançamentos Fixos
 </h3>
 <button
 onClick={onClose}
 aria-label="Fechar"
 className="p-1.5 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-hover transition-colors cursor-pointer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
 {fixedExpenses.length === 0 ? (
 <p className="text-sm text-ink-soft text-center py-4">Nenhum lançamento fixo cadastrado.</p>
 ) : (
 fixedExpenses.map((fe) => (
 <div
 key={fe.id}
 className="flex items-center justify-between gap-3 bg-paper border border-rule rounded-md px-4 py-2.5"
 >
 <div className="min-w-0 flex items-start gap-2">
 <div className={`mt-0.5 p-1 rounded-md shrink-0 ${fe.type === 'income' ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'}`}>
 {fe.type === 'income' ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-ink truncate">{fe.description}</p>
 <p className="text-xs text-ink-soft flex items-center gap-1 flex-wrap">
 {formatCurrency(fe.amount)} · todo dia {fe.dayOfMonth} ·
 {(() => {
 const { icon: CatIcon, color } = categoryStyle(categories, fe.category);
 return (
 <span className="inline-flex items-center gap-1" style={{ color }}>
 <CatIcon className="w-3 h-3" /> {fe.category}
 </span>
 );
 })()}
 · {accounts.find((a) => a.id === fe.account)?.name ?? '-'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button
 type="button"
 onClick={() => handleToggleActive(fe)}
 className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
 fe.active
 ? 'bg-income-soft text-income'
 : 'bg-paper-hover text-ink-soft'
 }`}
 >
 {fe.active ? 'Ativa' : 'Inativa'}
 </button>
 <button
 type="button"
 onClick={() => handleDelete(fe.id)}
 className="p-1.5 rounded-sm text-ink-soft hover:text-expense hover:bg-expense-soft transition-colors cursor-pointer"
 title="Excluir"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>

 <form onSubmit={handleAdd} className="space-y-3 border-t border-rule pt-4">
 <div className="grid grid-cols-2 gap-2 p-1 bg-paper rounded-md border border-rule">
 <button
 type="button"
 onClick={() => setType('expense')}
 className={`py-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
 type === 'expense' ? 'bg-expense text-paper shadow' : 'text-ink-soft hover:text-ink'
 }`}
 >
 <ArrowDownCircle className="w-4 h-4" /> Despesa
 </button>
 <button
 type="button"
 onClick={() => setType('income')}
 className={`py-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
 type === 'income' ? 'bg-income text-paper shadow' : 'text-ink-soft hover:text-ink'
 }`}
 >
 <ArrowUpCircle className="w-4 h-4" /> Receita
 </button>
 </div>

 <div>
 <label htmlFor="fe-description" className="block text-xs font-medium text-ink-soft mb-1">Descrição</label>
 <input
 id="fe-description"
 type="text"
 required
 placeholder="Ex: Aluguel, Netflix..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-4 py-2.5 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label htmlFor="fe-amount" className="block text-xs font-medium text-ink-soft mb-1">Valor (R$)</label>
 <input
 id="fe-amount"
 type="number"
 step="0.01"
 required
 placeholder="0,00"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 />
 </div>
 <div>
 <label htmlFor="fe-day" className="block text-xs font-medium text-ink-soft mb-1">Dia do mês</label>
 <input
 id="fe-day"
 type="number"
 min={1}
 max={31}
 required
 value={dayOfMonth}
 onChange={(e) => setDayOfMonth(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 />
 </div>
 <div>
 <label htmlFor="fe-payment" className="block text-xs font-medium text-ink-soft mb-1">Pagamento</label>
 <select
 id="fe-payment"
 value={paymentMethod}
 onChange={(e) => setPaymentMethod(e.target.value as any)}
 className="w-full bg-paper border border-rule rounded-md px-2 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
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
 <label htmlFor="fe-category" className="block text-xs font-medium text-ink-soft mb-1">Categoria</label>
 <select
 id="fe-category"
 value={effectiveCategory}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 >
 {categories.map((cat) => (
 <option key={cat.id} value={cat.name}>
 {cat.name}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label htmlFor="fe-account" className="block text-xs font-medium text-ink-soft mb-1">Conta</label>
 <select
 id="fe-account"
 value={accountId}
 required
 onChange={(e) => setAccountId(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 >
 {activeAccounts.map((acc) => (
 <option key={acc.id} value={acc.id}>
 {acc.name}
 </option>
 ))}
 </select>
 </div>
 </div>

 <button
 type="submit"
 disabled={!accountId || submitting}
 className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-paper py-2.5 rounded-md font-medium shadow-lg transition-all active:scale-95 cursor-pointer"
 >
 <Plus className="w-4 h-4" /> {submitting ? 'Salvando...' : 'Adicionar lançamento fixo'}
 </button>
 </form>
 </div>
 </div>
 );
}
