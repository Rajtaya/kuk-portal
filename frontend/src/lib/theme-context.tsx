'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'warm' | 'blue';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'warm', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('warm');

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains('theme-blue') ? 'blue' : 'warm');
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('ui-theme', t); } catch {}
    document.documentElement.classList.remove('theme-warm', 'theme-blue');
    document.documentElement.classList.add(`theme-${t}`);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
