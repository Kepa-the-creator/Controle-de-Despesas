import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { pb } from '../services/pocketbase';

export function Login() {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setLoading(true);
 try {
 await pb.collection('users').authWithPassword(email, password);
 } catch {
 setError('E-mail ou senha inválidos.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4">
 <div className="w-full max-w-sm bg-paper-raised border border-rule rounded-md p-8 ">
 <div className="flex flex-col items-center gap-3 mb-6">
 <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center shadow-lg ">
 <LogIn className="w-6 h-6 text-ink" />
 </div>
 <h1 className="text-xl font-bold text-ink">Entrar</h1>
 <p className="text-ink-soft text-sm text-center">Acesse seus registros financeiros</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label htmlFor="login-email" className="block text-xs font-medium text-ink-soft mb-1">E-mail</label>
 <input
 id="login-email"
 type="email"
 required
 autoFocus
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-4 py-2.5 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
 placeholder="voce@email.com"
 />
 </div>
 <div>
 <label htmlFor="login-password" className="block text-xs font-medium text-ink-soft mb-1">Senha</label>
 <input
 id="login-password"
 type="password"
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full bg-paper border border-rule rounded-md px-4 py-2.5 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
 placeholder="••••••••"
 />
 </div>

 {error && <p className="text-expense text-xs">{error}</p>}

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-accent hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-paper py-2.5 rounded-md font-medium shadow-lg transition-all active:scale-95 cursor-pointer"
 >
 {loading ? 'Entrando...' : 'Entrar'}
 </button>
 </form>
 </div>
 </div>
 );
}
