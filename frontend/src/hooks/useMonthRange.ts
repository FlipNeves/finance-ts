import { useMemo } from 'react';
import { getMonthRange, type MonthRange } from '../lib/date';

export function useMonthRange(reference: Date): MonthRange {
  return useMemo(
    () => getMonthRange(reference),
    [reference.getFullYear(), reference.getMonth()],
  );
}
