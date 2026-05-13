import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // ignore
    }
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return [value, setValue, remove];
}
