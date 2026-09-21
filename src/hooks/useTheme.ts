import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function readTheme(): Theme {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // armazenamento indisponível: o tema só vale nesta sessão
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  return { theme, toggle };
}
