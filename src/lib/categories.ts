import { Utensils, House, Gamepad2, Car, Banknote, Briefcase, Tag, type LucideIcon } from 'lucide-react';

interface CategoryStyle {
  icon: LucideIcon;
  cls: string;
}

const STYLES: Record<string, CategoryStyle> = {
  Alimentação: { icon: Utensils, cls: 'bg-amber-500/15 text-amber-500' },
  Moradia: { icon: House, cls: 'bg-blue-500/15 text-blue-400' },
  Lazer: { icon: Gamepad2, cls: 'bg-fuchsia-500/15 text-fuchsia-500' },
  Transporte: { icon: Car, cls: 'bg-cyan-500/15 text-cyan-500' },
  Salário: { icon: Banknote, cls: 'bg-emerald-500/15 text-emerald-400' },
  Freela: { icon: Briefcase, cls: 'bg-violet-500/15 text-violet-500' },
};

const FALLBACK: CategoryStyle = { icon: Tag, cls: 'bg-slate-500/15 text-slate-400' };

export const categoryStyle = (category: string): CategoryStyle => STYLES[category] ?? FALLBACK;
