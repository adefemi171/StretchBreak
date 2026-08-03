import { useState, useEffect } from 'react';

export type ContrastMode = 'normal' | 'high';
export type FontScale = 'normal' | 'large' | 'x-large';

const CONTRAST_STORAGE_KEY = 'accessibility-contrast';
const FONT_SCALE_STORAGE_KEY = 'accessibility-font-scale';

const getStoredContrast = (): ContrastMode => {
  try {
    const stored = localStorage.getItem(CONTRAST_STORAGE_KEY);
    if (stored === 'high') return 'high';
  } catch (e) {
    console.warn('Failed to read contrast preference:', e);
  }
  return 'normal';
};

const getStoredFontScale = (): FontScale => {
  try {
    const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (stored === 'large' || stored === 'x-large') return stored;
  } catch (e) {
    console.warn('Failed to read font scale preference:', e);
  }
  return 'normal';
};

const applyContrast = (mode: ContrastMode) => {
  const root = document.documentElement;
  root.setAttribute('data-contrast', mode);
};

const applyFontScale = (scale: FontScale) => {
  const root = document.documentElement;
  root.setAttribute('data-font-scale', scale);
};

export const useAccessibility = () => {
  const [contrast, setContrast] = useState<ContrastMode>(getStoredContrast);
  const [fontScale, setFontScale] = useState<FontScale>(getStoredFontScale);

  useEffect(() => {
    applyContrast(contrast);
    
    try {
      localStorage.setItem(CONTRAST_STORAGE_KEY, contrast);
    } catch (e) {
      console.warn('Failed to save contrast preference:', e);
    }
  }, [contrast]);

  useEffect(() => {
    applyFontScale(fontScale);
    
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, fontScale);
    } catch (e) {
      console.warn('Failed to save font scale preference:', e);
    }
  }, [fontScale]);

  return {
    contrast,
    setContrast,
    fontScale,
    setFontScale,
  };
};
