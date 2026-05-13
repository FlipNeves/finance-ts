import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../lib/api';

export const categoriesQueryKey = ['transactions', 'categories'] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => transactionsApi.categories(),
    staleTime: 1000 * 60 * 10,
  });
}
