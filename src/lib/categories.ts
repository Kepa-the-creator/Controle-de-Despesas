import { Utensils, House, Gamepad2, Car, Banknote, Briefcase, Tag, type LucideIcon } from 'lucide-react';

interface CategoryStyle {
  icon: LucideIcon;
  /** Cor de tinta da categoria — mesma nos dois temas, funciona sobre
   * papel claro ou escuro. Usada no contorno e no ícone do selo, não
   * como fundo preenchido (isso fica pro papel por trás). */
  color: string;
}

// Tons de tinta/selo, um por categoria — o suficiente pra escanear a lista
// visualmente sem virar um mosaico colorido de badges de SaaS.
const STYLES: Record<string, CategoryStyle> = {
  Alimentação: { icon: Utensils, color: '#b08628' },
  Moradia: { icon: House, color: '#2b4c7e' },
  Lazer: { icon: Gamepad2, color: '#8b5a83' },
  Transporte: { icon: Car, color: '#3e8a88' },
  Salário: { icon: Banknote, color: '#2f6f4e' },
  Freela: { icon: Briefcase, color: '#a8623c' },
};

const FALLBACK: CategoryStyle = { icon: Tag, color: '#6b7260' };

export const categoryStyle = (category: string): CategoryStyle => STYLES[category] ?? FALLBACK;
