import type { WishlistItem } from '../utils/types';

const STORAGE_KEY = 'stretchbreak-wishlist';

export const getAllWishlistItems = (): WishlistItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveWishlistItem = (item: WishlistItem): void => {
  const items = getAllWishlistItems();
  const existingIndex = items.findIndex(i => i.id === item.id);
  
  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.push(item);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const deleteWishlistItem = (id: string): void => {
  const items = getAllWishlistItems();
  const filtered = items.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const reorderWishlist = (items: WishlistItem[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const createWishlistItemId = (): string => {
  return `wishlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
