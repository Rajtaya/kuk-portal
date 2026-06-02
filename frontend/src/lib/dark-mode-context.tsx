'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeContextType {
  isDark: boolean;
  toggle: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({ isDark: false, toggle: () => {} });

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Sync runtime state with the class the inline head-script already applied (prevents FOUC).
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dark-mode', String(next));
      } catch {}
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  return <DarkModeContext.Provider value={{ isDark, toggle }}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
