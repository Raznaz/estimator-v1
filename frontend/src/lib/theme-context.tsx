'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'estimator-theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Дефолт — тёмная. Реальное значение из localStorage подхватывается в useEffect;
  // до гидрации тему уже проставил inline-скрипт в layout.tsx (анти-FOUC).
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme должен использоваться внутри <ThemeProvider>');
  }
  return ctx;
}
