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
import type { Theme } from '../hooks/useTheme';

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

// Paleta "joia sobre papel": 24 tons vivos e bem espaçados na roda de cor,
// cada um com uma variante pro tema claro (mais escura, lê bem no papel
// bege) e uma pro escuro (mais clara, lê bem no papel quase preto) — checado
// contra as duas cores de fundo do DESIGN.md (contraste ≥3:1 nos dois).
// `value` é o que fica salvo na categoria; `dark` só existe no front, é
// resolvido em tempo real pelo tema atual (ver categoryStyle).
export const COLOR_OPTIONS: { key: string; value: string; dark: string; label: string }[] = [
  { key: 'rubi', value: '#bc2f46', dark: '#d87989', label: 'Rubi' },
  { key: 'laranja-queimado', value: '#c65c2f', dark: '#da9577', label: 'Laranja-queimado' },
  { key: 'ambar', value: '#9c6d1c', dark: '#e1b770', label: 'Âmbar' },
  { key: 'ouro-velho', value: '#8b711d', dark: '#dac16c', label: 'Ouro-velho' },
  { key: 'oliva', value: '#737e25', dark: '#c2cf6e', label: 'Oliva' },
  { key: 'verde-limao', value: '#648a38', dark: '#a5c581', label: 'Verde-limão' },
  { key: 'esmeralda', value: '#309164', dark: '#72caa1', label: 'Esmeralda' },
  { key: 'jade', value: '#328f7d', dark: '#74c8b7', label: 'Jade' },
  { key: 'turquesa', value: '#23848b', dark: '#71cfd6', label: 'Turquesa' },
  { key: 'ciano-petroleo', value: '#2e849e', dark: '#7dbfd4', label: 'Ciano-petróleo' },
  { key: 'azul-cobalto', value: '#3776be', dark: '#8cb0d9', label: 'Azul-cobalto' },
  { key: 'azul-royal', value: '#395fc6', dark: '#94a7db', label: 'Azul-royal' },
  { key: 'indigo', value: '#4642bd', dark: '#a2a0d9', label: 'Índigo' },
  { key: 'violeta', value: '#764ebc', dark: '#b6a2d7', label: 'Violeta' },
  { key: 'roxo-ametista', value: '#8847ae', dark: '#bf9dd2', label: 'Roxo-ametista' },
  { key: 'magenta', value: '#b83d9f', dark: '#d590c7', label: 'Magenta' },
  { key: 'framboesa', value: '#be377a', dark: '#d98cb2', label: 'Framboesa' },
  { key: 'rosa-antigo', value: '#bc5c7c', dark: '#d29daf', label: 'Rosa-antigo' },
  { key: 'bordo', value: '#8e292d', dark: '#cf6e71', label: 'Bordô' },
  { key: 'terracota', value: '#b65335', dark: '#d69885', label: 'Terracota' },
  { key: 'sienna', value: '#995c33', dark: '#cd9b7a', label: 'Sienna' },
  { key: 'caramelo', value: '#a66f30', dark: '#d4ab7d', label: 'Caramelo' },
  { key: 'grafite-azulado', value: '#52667a', dark: '#93a8be', label: 'Grafite-azulado' },
  { key: 'verde-musgo', value: '#557c3c', dark: '#98bb81', label: 'Verde-musgo' },
];

const COLOR_MAP: Record<string, { value: string; dark: string }> = Object.fromEntries(
  COLOR_OPTIONS.map((o) => [o.value, { value: o.value, dark: o.dark }])
);

// Categorias que o app cria sozinho na primeira vez que alguém abre (mesmo
// padrão do "Conta Corrente" auto-criada em Accounts) — dá pra renomear,
// trocar cor/ícone ou apagar depois, isso é só o ponto de partida.
export const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: 'Alimentação', icon: 'utensils', color: '#a66f30' },
  { name: 'Moradia', icon: 'house', color: '#3776be' },
  { name: 'Lazer', icon: 'gamepad', color: '#8847ae' },
  { name: 'Transporte', icon: 'car', color: '#23848b' },
  { name: 'Salário', icon: 'banknote', color: '#309164' },
  { name: 'Freela', icon: 'briefcase', color: '#b65335' },
  { name: 'Outros', icon: 'tag', color: '#52667a' },
];

const FALLBACK = { value: '#6b7260', dark: '#9ca28d' };

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbToHex = (r: number, g: number, b: number) =>
  '#' +
  [r, g, b]
    .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
    .join('');

// Clareia qualquer hex (mistura com branco) pro tema escuro — usado quando a
// cor salva na categoria não é uma das opções atuais da paleta (cor de uma
// paleta anterior, ou digitada à mão em algum momento). Mantém a cor que a
// pessoa escolheu em vez de cair num cinza genérico.
export const lightenForDark = (hex: string, amount = 0.45): string => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
};

/** Ícone/cor de uma categoria pelo nome salvo na transação, já resolvidos
 * pro tema atual — cai num selo neutro quando o nome não bate com nenhuma
 * categoria cadastrada (categoria renomeada ou apagada depois que a
 * transação já existia). Quando a categoria existe mas sua cor salva não é
 * uma das opções atuais (paleta trocada depois que ela foi criada), usa o
 * hex salvo direto no tema claro e uma variante clareada no escuro, em vez
 * de cair no fallback — a cor escolhida pela pessoa não se perde numa
 * repaginação de paleta. */
export const categoryStyle = (
  categories: Category[],
  name: string,
  theme: Theme
): { icon: LucideIcon; color: string } => {
  // Sem diferenciar maiúsculas/acentuação de caixa: "ENERGIA" e "Energia"
  // são a mesma categoria pra quem olha a tela, mesmo que o texto salvo em
  // transações antigas tenha vindo digitado diferente.
  const key = name.trim().toLowerCase();
  const found = categories.find((c) => c.name.trim().toLowerCase() === key);
  const icon = (found && ICON_MAP[found.icon]) || Tag;
  if (!found) {
    return { icon, color: theme === 'dark' ? FALLBACK.dark : FALLBACK.value };
  }
  const pair = COLOR_MAP[found.color];
  const color = pair
    ? theme === 'dark'
      ? pair.dark
      : pair.value
    : theme === 'dark'
      ? lightenForDark(found.color)
      : found.color;
  return { icon, color };
};
