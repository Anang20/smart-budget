/**
 * useLocalStorage.ts
 * Generic, typed hook for syncing state with localStorage.
 * Wraps read/write in try/catch with a safe default fallback.
 */

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return initialValue;
      return JSON.parse(item) as T;
    } catch {
      return initialValue;
    }
  });

  // Persist to localStorage whenever storedValue changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Storage quota exceeded or private-mode restrictions — ignore
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
