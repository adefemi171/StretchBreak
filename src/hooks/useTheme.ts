import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme-preference';

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredTheme = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    console.warn('Failed to read theme preference:', e);
  }
  return 'system';
};

const getEffectiveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
};

export const useTheme = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => 
    getEffectiveTheme(getStoredTheme())
  );

  useEffect(() => {
    const newEffectiveTheme = getEffectiveTheme(themeMode);
    setEffectiveTheme(newEffectiveTheme);
    applyTheme(newEffectiveTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setEffectiveTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  return {
    themeMode,
    effectiveTheme,
    setThemeMode,
  };
};
