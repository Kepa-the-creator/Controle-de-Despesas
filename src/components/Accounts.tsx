import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Landmark, X, Pencil, Check } from 'lucide-react';
import { pb } from '../services/pocketbase';
import { toast } from '../lib/toast';

export interface Account {
 id: string;
 name: string;
 initialBalance: number;
 active: boolean;
}

interface Transaction {
 account: string;
 type: 'income' | 'expense';
 amount: number;
}

interface Transfer {
 fromAccount: string;
 toAccount: string;
 amount: number;
}

interface AccountsProps {
 accounts: Account[];
 onChange: (list: Account[]) => void;
 transactions: Transaction[];
 transfers: Transfer[];
 onClose: () => void;
}

const formatCurrency = (val: number) =>
 new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function Accounts({ accounts, onChange, transactions, transfers, onClose }: AccountsProps) {
 const [name, setName] = useState('');
 const [initialBalance, setInitialBalance] = useState('0');
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editingName, setEditingName] = useState('');
 const [editingInitialBalance, setEditingInitialBalance] = useState('0');
 const [submitting, setSubmitting] = useState(false);

 const balanceFor = (accountId: string, base: number) => {
 let total = base;
 for (const t of transactions) {
 if (t.account !== accountId) continue;
 total += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
 }
 for (const tr of transfers) {
 if (tr.fromAccount === accountId) total -= Number(tr.amount);
 if (tr.toAccount === accountId) total += Number(tr.amount);
 }
 return total;
 };

 const handleAdd = async (e: FormEvent) => {
 e.preventDefault();
 if (!name || submitting) return;

 setSubmitting(true);
 try {
 const record = await pb.collection('accounts').create<Account>({
 name,
 initialBalance: parseFloat(initialBalance) || 0,
 active: true,
 user: pb.authStore.record?.id,
 });
 onChange([...accounts, record]);
 setName('');
 setInitialBalance('0');
 } catch (err: any) {
 toast.error('Erro ao criar conta: ' + err.message);
 } finally {
 setSubmitting(false);
 }
 };

 const handleToggleActive = async (acc: Account) => {
 try {
 await pb.collection('accounts').update(acc.id, { active: !acc.active });
 onChange(accounts.map((a) => (a.id === acc.id ? { ...a, active: !a.active } : a)));
 } catch (err: any) {
 toast.error('Erro ao atualizar conta: ' + err.message);
 }
 };

 const handleDelete = async (id: string) => {
 if (
 !window.confirm(
 'Excluir esta conta? Só é possível se não houver nenhuma transação ou lançamento fixo vinculado a ela.'
 )
 ) {
 return;
 }
 try {
 await pb.collection('accounts').delete(id);
 onChange(accounts.filter((a) => a.id !== id));
 } catch (err: any) {
 const isBlockedByRelation = /required relation/i.test(err.message || '');
 toast.error(
 isBlockedByRelation
 ? 'Não é possível excluir: essa conta ainda tem transações ou lançamentos fixos vinculados a ela. Mova ou apague-os primeiro.'
 : 'Erro ao excluir conta: ' + err.message
 );
 }
 };

 const startEditing = (acc: Account) => {
 setEditingId(acc.id);
 setEditingName(acc.name);
 setEditingInitialBalance(String(acc.initialBalance || 0));
 };

 const handleSaveEdit = async (id: string) => {
 if (!editingName) return;
 try {
 const newInitialBalance = parseFloat(editingInitialBalance) || 0;
 await pb.collection('accounts').update(id, { name: editingName, initialBalance: newInitialBalance });
 onChange(
 accounts.map((a) => (a.id === id ? { ...a, name: editingName, initialBalance: newInitialBalance } : a))
 );
 setEditingId(null);
 } catch (err: any) {
 toast.error('Erro ao renomear conta: ' + err.message);
 }
 };

 return (
 <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 ">
 <div className="modal-panel bg-paper-raised border border-rule rounded-md w-full max-w-lg p-6 shadow-md">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xl font-bold text-ink flex items-center gap-2">
 <Landmark className="w-5 h-5 text-accent" /> Contas e Carteiras
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
 {accounts.length === 0 ? (
 <p className="text-sm text-ink-soft text-center py-4">Nenhuma conta cadastrada.</p>
 ) : (
 accounts.map((acc) =>
 editingId === acc.id ? (
 <div
 key={acc.id}
 className="bg-paper border border-accent/50 rounded-md px-4 py-2.5 space-y-2"
 >
 <input
 type="text"
 autoFocus
 value={editingName}
 onChange={(e) => setEditingName(e.target.value)}
 className="w-full bg-paper-raised border border-rule rounded-sm px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
 />
 <div className="flex items-center gap-2">
 <input
 type="number"
 step="0.01"
 value={editingInitialBalance}
 onChange={(e) => setEditingInitialBalance(e.target.value)}
 placeholder="Saldo inicial"
 className="flex-1 bg-paper-raised border border-rule rounded-sm px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
 />
 <button
 type="button"
 onClick={() => handleSaveEdit(acc.id)}
 className="px-2.5 py-1.5 rounded-sm text-xs font-medium bg-accent hover:opacity-90 text-paper cursor-pointer flex items-center gap-1"
 >
 <Check className="w-3.5 h-3.5" /> Salvar
 </button>
 <button
 type="button"
 onClick={() => setEditingId(null)}
 className="px-2 py-1.5 rounded-sm text-xs text-ink-soft hover:text-ink cursor-pointer"
 >
 Cancelar
 </button>
 </div>
 </div>
 ) : (
 <div
 key={acc.id}
 className="flex items-center justify-between gap-3 bg-paper border border-rule rounded-md px-4 py-2.5"
 >
 <div className="min-w-0">
 <p className="text-sm font-medium text-ink truncate">{acc.name}</p>
 <p className="text-xs tabular text-ink-soft">
 Saldo: {formatCurrency(balanceFor(acc.id, acc.initialBalance || 0))}
 </p>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button
 type="button"
 onClick={() => handleToggleActive(acc)}
 className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
 acc.active ? 'bg-income-soft text-income' : 'bg-paper-hover text-ink-soft'
 }`}
 >
 {acc.active ? 'Ativa' : 'Inativa'}
 </button>
 <button
 type="button"
 onClick={() => startEditing(acc)}
 className="p-1.5 rounded-sm text-ink-soft hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
 title="Renomear"
 >
 <Pencil className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => handleDelete(acc.id)}
 className="p-1.5 rounded-sm text-ink-soft hover:text-expense hover:bg-expense-soft transition-colors cursor-pointer"
 title="Excluir"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 )
 )
 )}
 </div>

 <form onSubmit={handleAdd} className="space-y-3 border-t border-rule pt-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor="acc-name" className="block text-xs font-medium text-ink-soft mb-1">Nome da conta</label>
 <input
 id="acc-name"
 type="text"
 required
 placeholder="Ex: Conta Corrente, Carteira..."
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-4 py-2.5 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
 />
 </div>
 <div>
 <label htmlFor="acc-initial-balance" className="block text-xs font-medium text-ink-soft mb-1">Saldo inicial (R$)</label>
 <input
 id="acc-initial-balance"
 type="number"
 step="0.01"
 value={initialBalance}
 onChange={(e) => setInitialBalance(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={submitting}
 className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-paper py-2.5 rounded-md font-medium shadow-lg transition-all active:scale-95 cursor-pointer"
 >
 <Plus className="w-4 h-4" /> {submitting ? 'Criando...' : 'Criar conta'}
 </button>
 </form>
 </div>
 </div>
 );
}
