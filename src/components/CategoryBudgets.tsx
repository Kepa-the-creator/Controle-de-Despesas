import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Gauge, X } from 'lucide-react';
import { pb } from '../services/pocketbase';
import type { Transaction } from './Dashboard';
import { toast } from '../lib/toast';

export interface CategoryBudget {
 id: string;
 category: string;
 limit: number;
}

interface CategoryBudgetsProps {
 budgets: CategoryBudget[];
 onChange: (list: CategoryBudget[]) => void;
 monthTransactions: Transaction[];
 onClose: () => void;
}

const CATEGORIES = ['Alimentação', 'Moradia', 'Lazer', 'Transporte', 'Salário', 'Freela', 'Outros'];

const formatCurrency = (val: number) =>
 new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function CategoryBudgets({ budgets, onChange, monthTransactions, onClose }: CategoryBudgetsProps) {
 const [category, setCategory] = useState(CATEGORIES[0]);
 const [limit, setLimit] = useState('');

 const spentByCategory = (cat: string) =>
 monthTransactions
 .filter((t) => t.type === 'expense' && t.category === cat)
 .reduce((sum, t) => sum + Number(t.amount), 0);

 const handleSave = async (e: FormEvent) => {
 e.preventDefault();
 if (!limit || parseFloat(limit) <= 0) return;

 const existing = budgets.find((b) => b.category === category);
 try {
 if (existing) {
 await pb.collection('category_budgets').update(existing.id, { limit: parseFloat(limit) });
 onChange(budgets.map((b) => (b.id === existing.id ? { ...b, limit: parseFloat(limit) } : b)));
 } else {
 const record = await pb.collection('category_budgets').create<CategoryBudget>({
 category,
 limit: parseFloat(limit),
 user: pb.authStore.record?.id,
 });
 onChange([...budgets, record]);
 }
 setLimit('');
 } catch (err: any) {
 toast.error('Erro ao salvar orçamento: ' + err.message);
 }
 };

 const handleDelete = async (id: string) => {
 try {
 await pb.collection('category_budgets').delete(id);
 onChange(budgets.filter((b) => b.id !== id));
 } catch (err: any) {
 toast.error('Erro ao excluir orçamento: ' + err.message);
 }
 };

 return (
 <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 ">
 <div className="modal-panel bg-paper-raised border border-rule rounded-md w-full max-w-lg p-6 shadow-md">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xl font-bold text-ink flex items-center gap-2">
 <Gauge className="w-5 h-5 text-accent" /> Orçamento por Categoria
 </h3>
 <button
 onClick={onClose}
 aria-label="Fechar"
 className="p-1.5 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-hover transition-colors cursor-pointer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
 {budgets.length === 0 ? (
 <p className="text-sm text-ink-soft text-center py-4">Nenhum limite cadastrado.</p>
 ) : (
 budgets.map((b) => {
 const spent = spentByCategory(b.category);
 const pct = Math.min(100, (spent / b.limit) * 100);
 const color = pct >= 100 ? 'bg-expense' : pct >= 80 ? 'bg-warning' : 'bg-income';
 return (
 <div key={b.id} className="bg-paper border border-rule rounded-md px-4 py-3">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-sm font-medium text-ink">{b.category}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs tabular text-ink-soft">
 {formatCurrency(spent)} / {formatCurrency(b.limit)}
 </span>
 <button
 type="button"
 onClick={() => handleDelete(b.id)}
 className="p-1 rounded-sm text-ink-soft hover:text-expense hover:bg-expense-soft transition-colors cursor-pointer"
 title="Excluir"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 <div className="w-full h-2 rounded-full bg-paper-hover overflow-hidden">
 <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
 </div>
 </div>
 );
 })
 )}
 </div>

 <form onSubmit={handleSave} className="space-y-3 border-t border-rule pt-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor="cb-category" className="block text-xs font-medium text-ink-soft mb-1">Categoria</label>
 <select
 id="cb-category"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 >
 {CATEGORIES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label htmlFor="cb-limit" className="block text-xs font-medium text-ink-soft mb-1">Limite mensal (R$)</label>
 <input
 id="cb-limit"
 type="number"
 step="0.01"
 min="0.01"
 required
 placeholder="0,00"
 value={limit}
 onChange={(e) => setLimit(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 />
 </div>
 </div>

 <button
 type="submit"
 className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-paper py-2.5 rounded-md font-medium shadow-lg transition-all active:scale-95 cursor-pointer"
 >
 <Plus className="w-4 h-4" /> Salvar limite
 </button>
 </form>
 </div>
 </div>
 );
}
