import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../../../lib/api';
import type { SaveBudgetDTO } from '../../../types/api';

export const budgetKey = (month: number, year: number) =>
  ['budget', { month, year }] as const;

export function useBudgetQuery(month: number, year: number) {
  return useQuery({
    queryKey: budgetKey(month, year),
    queryFn: () => budgetsApi.get({ month, year }),
  });
}

export function useSaveBudget(month: number, year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveBudgetDTO) => budgetsApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKey(month, year) });
    },
  });
}

export function useCopyPreviousBudget(month: number, year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => budgetsApi.copyPrevious({ month, year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKey(month, year) });
    },
  });
}
