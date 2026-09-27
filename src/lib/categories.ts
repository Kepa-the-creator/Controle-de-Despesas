import {
  Utensils,
  House,
  Gamepad2,
  Car,
  Banknote,
  Briefcase,
  Tag,
  ShoppingCart,
  Heart,
  GraduationCap,
  Plane,
  Dumbbell,
  PawPrint,
  Wifi,
  Zap,
  Droplet,
  Phone,
  Shield,
  Gift,
  Baby,
  BookOpen,
  Music,
  Coffee,
  Shirt,
  Wrench,
  Fuel,
  Bus,
  Smartphone,
  Laptop,
  CreditCard,
  PiggyBank,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Ícones curados pro seletor de categoria — uma lista fechada, não um SVG
// livre, pra manter o traço/peso consistente com o resto do app (ver
// craft-floor: "ícones vêm de uma biblioteca real, um traço só").
export const ICON_OPTIONS: { key: string; icon: LucideIcon; label: string }[] = [
  { key: 'utensils', icon: Utensils, label: 'Comida' },
  { key: 'shopping-cart', icon: ShoppingCart, label: 'Compras' },
  { key: 'house', icon: House, label: 'Casa' },
  { key: 'zap', icon: Zap, label: 'Energia' },
  { key: 'droplet', icon: Droplet, label: 'Água' },
  { key: 'wifi', icon: Wifi, label: 'Internet' },
  { key: 'phone', icon: Phone, label: 'Telefone' },
  { key: 'car', icon: Car, label: 'Carro' },
  { key: 'bus', icon: Bus, label: 'Transporte público' },
  { key: 'fuel', icon: Fuel, label: 'Combustível' },
  { key: 'gamepad', icon: Gamepad2, label: 'Jogos' },
  { key: 'music', icon: Music, label: 'Música' },
  { key: 'coffee', icon: Coffee, label: 'Café' },
  { key: 'plane', icon: Plane, label: 'Viagem' },
  { key: 'dumbbell', icon: Dumbbell, label: 'Academia' },
  { key: 'heart', icon: Heart, label: 'Saúde' },
  { key: 'paw', icon: PawPrint, label: 'Pet' },
  { key: 'baby', icon: Baby, label: 'Filhos' },
  { key: 'graduation-cap', icon: GraduationCap, label: 'Educação' },
  { key: 'book', icon: BookOpen, label: 'Livros' },
  { key: 'shirt', icon: Shirt, label: 'Roupas' },
  { key: 'gift', icon: Gift, label: 'Presentes' },
  { key: 'shield', icon: Shield, label: 'Seguro' },
  { key: 'wrench', icon: Wrench, label: 'Manutenção' },
  { key: 'smartphone', icon: Smartphone, label: 'Celular' },
  { key: 'laptop', icon: Laptop, label: 'Computador' },
  { key: 'credit-card', icon: CreditCard, label: 'Cartão' },
  { key: 'banknote', icon: Banknote, label: 'Salário' },
  { key: 'briefcase', icon: Briefcase, label: 'Trabalho' },
  { key: 'piggy-bank', icon: PiggyBank, label: 'Poupança' },
  { key: 'trending-up', icon: TrendingUp, label: 'Investimento' },
  { key: 'tag', icon: Tag, label: 'Outros' },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.key, o.icon])
);

// Paleta curada de tinta — as mesmas famílias de cor do DESIGN.md, pra um
// selo novo nunca destoar do resto do sistema "papel + tinta".
export const COLOR_OPTIONS = [
  { key: 'mostarda', value: '#b08628', label: 'Mostarda' },
  { key: 'azul', value: '#2b4c7e', label: 'Azul-tinta' },
  { key: 'ameixa', value: '#8b5a83', label: 'Ameixa' },
  { key: 'teal', value: '#3e8a88', label: 'Verde-azulado' },
  { key: 'verde', value: '#2f6f4e', label: 'Verde-cédula' },
  { key: 'terracota', value: '#a8623c', label: 'Terracota' },
  { key: 'vermelho', value: '#9a3b34', label: 'Vermelho-tijolo' },
  { key: 'roxo', value: '#6a5a9c', label: 'Roxo' },
  { key: 'rosa', value: '#a8557a', label: 'Rosa-antigo' },
  { key: 'grafite', value: '#565d4e', label: 'Grafite' },
  { key: 'dourado', value: '#8a7526', label: 'Dourado escuro' },
  { key: 'petroleo', value: '#2c6066', label: 'Azul-petróleo' },
];

// Categorias que o app cria sozinho na primeira vez que alguém abre (mesmo
// padrão do "Conta Corrente" auto-criada em Accounts) — dá pra renomear,
// trocar cor/ícone ou apagar depois, isso é só o ponto de partida.
export const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: 'Alimentação', icon: 'utensils', color: '#b08628' },
  { name: 'Moradia', icon: 'house', color: '#2b4c7e' },
  { name: 'Lazer', icon: 'gamepad', color: '#8b5a83' },
  { name: 'Transporte', icon: 'car', color: '#3e8a88' },
  { name: 'Salário', icon: 'banknote', color: '#2f6f4e' },
  { name: 'Freela', icon: 'briefcase', color: '#a8623c' },
  { name: 'Outros', icon: 'tag', color: '#6b7260' },
];

const FALLBACK = { icon: Tag, color: '#6b7260' };

/** Ícone/cor de uma categoria pelo nome salvo na transação — cai num selo
 * neutro quando o nome não bate com nenhuma categoria cadastrada (categoria
 * renomeada ou apagada depois que a transação já existia). */
export const categoryStyle = (categories: Category[], name: string): { icon: LucideIcon; color: string } => {
  const found = categories.find((c) => c.name === name);
  if (!found) return FALLBACK;
  return { icon: ICON_MAP[found.icon] ?? Tag, color: found.color };
};
