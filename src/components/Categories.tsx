import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Tags, X, Pencil, Check } from 'lucide-react';
import { pb } from '../services/pocketbase';
import { toast } from '../lib/toast';
import { ICON_OPTIONS, COLOR_OPTIONS, lightenForDark, type Category } from '../lib/categories';
import type { Theme } from '../hooks/useTheme';

interface CategoriesProps {
  categories: Category[];
  onChange: (list: Category[]) => void;
  theme: Theme;
  onClose: () => void;
}

// A categoria guarda sempre o tom "claro" (a fonte da verdade); pra mostrar
// o selo com a cor certa no tema escuro, resolve pro par mais vivo daquele
// tom — mesma lógica de categoryStyle, só que a partir do hex direto.
const resolveSwatch = (hex: string, theme: Theme) => {
  if (theme !== 'dark') return hex;
  const match = COLOR_OPTIONS.find((o) => o.value === hex)?.dark;
  return match ?? lightenForDark(hex);
};

// Grade de ícones/cores reaproveitada no criar e no editar — evita repetir
// o mesmo markup duas vezes.
function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto p-1 bg-paper border border-rule rounded-md">
      {ICON_OPTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          aria-label={label}
          aria-pressed={value === key}
          className={`aspect-square flex items-center justify-center rounded-sm border transition-colors cursor-pointer ${
            value === key ? 'border-accent bg-accent-soft text-accent' : 'border-transparent text-ink-soft hover:bg-paper-hover'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange, theme }: { value: string; onChange: (hex: string) => void; theme: Theme }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {COLOR_OPTIONS.map(({ key, value: hex, dark, label }) => {
        const swatch = theme === 'dark' ? dark : hex;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(hex)}
            title={label}
            aria-label={label}
            aria-pressed={value === hex}
            className={`aspect-square rounded-sm border-2 transition-transform cursor-pointer ${
              value === hex ? 'scale-90' : 'border-transparent hover:scale-95'
            }`}
            style={{ backgroundColor: swatch, borderColor: value === hex ? swatch : 'transparent' }}
          >
            {value === hex && <Check className="w-4 h-4 text-paper mx-auto" />}
          </button>
        );
      })}
    </div>
  );
}

export function Categories({ categories, onChange, theme, onClose }: CategoriesProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0].key);
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    if (categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error('Já existe uma categoria com esse nome.');
      return;
    }

    setSubmitting(true);
    try {
      const record = await pb.collection('categories').create<Category>({
        name: name.trim(),
        icon,
        color,
        user: pb.authStore.record?.id,
      });
      onChange([...categories, record]);
      setName('');
      setIcon(ICON_OPTIONS[0].key);
      setColor(COLOR_OPTIONS[0].value);
    } catch (err: any) {
      toast.error('Erro ao criar categoria: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingIcon(cat.icon);
    setEditingColor(cat.color);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const updated = { name: editingName.trim(), icon: editingIcon, color: editingColor };
      await pb.collection('categories').update(id, updated);
      onChange(categories.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      setEditingId(null);
    } catch (err: any) {
      toast.error('Erro ao salvar categoria: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Excluir esta categoria? Transações que já usam ela continuam com o nome salvo, só somem da lista de opções.'
      )
    ) {
      return;
    }
    try {
      await pb.collection('categories').delete(id);
      onChange(categories.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error('Erro ao excluir categoria: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="modal-panel bg-paper-raised border border-rule rounded-md w-full max-w-lg p-6 shadow-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-xl font-bold text-ink flex items-center gap-2">
            <Tags className="w-5 h-5 text-accent" /> Categorias
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-hover transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto mb-4 pr-1">
          {categories.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-4">Nenhuma categoria cadastrada.</p>
          ) : (
            categories.map((cat) => {
              const iconMeta = ICON_OPTIONS.find((o) => o.key === cat.icon);
              const CatIcon = iconMeta?.icon ?? Tags;
              return editingId === cat.id ? (
                <div key={cat.id} className="bg-paper border border-accent rounded-md px-4 py-3 space-y-3">
                  <input
                    type="text"
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full bg-paper-raised border border-rule rounded-md px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
                  />
                  <IconPicker value={editingIcon} onChange={setEditingIcon} />
                  <ColorPicker value={editingColor} onChange={setEditingColor} theme={theme} />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
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
                <div key={cat.id} className="flex items-center justify-between gap-3 bg-paper border border-rule rounded-md px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-sm border flex items-center justify-center shrink-0"
                      style={{ borderColor: resolveSwatch(cat.color, theme), color: resolveSwatch(cat.color, theme) }}
                    >
                      <CatIcon className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-sm font-medium text-ink truncate">{cat.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(cat)}
                      aria-label="Editar"
                      title="Editar"
                      className="p-2 rounded-sm text-ink-soft hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      aria-label="Excluir"
                      title="Excluir"
                      className="p-2 rounded-sm text-ink-soft hover:text-expense hover:bg-expense-soft transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-3 border-t border-rule pt-4 shrink-0">
          <div>
            <label htmlFor="cat-name" className="block text-xs font-medium text-ink-soft mb-1">Nome da categoria</label>
            <input
              id="cat-name"
              type="text"
              required
              placeholder="Ex: Assinaturas, Pet, Estudos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper border border-rule rounded-md px-4 py-2.5 text-sm text-ink placeholder-ink-soft focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <p className="block text-xs font-medium text-ink-soft mb-1">Ícone</p>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div>
            <p className="block text-xs font-medium text-ink-soft mb-1">Cor</p>
            <ColorPicker value={color} onChange={setColor} theme={theme} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-paper py-2.5 rounded-md font-medium transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {submitting ? 'Criando...' : 'Criar categoria'}
          </button>
        </form>
      </div>
    </div>
  );
}
