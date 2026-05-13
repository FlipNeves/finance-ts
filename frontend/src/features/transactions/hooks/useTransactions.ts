import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../../../lib/api';
import type {
  CreateTransactionDTO,
  TransactionsFilter,
} from '../../../types/api';

export const transactionsKey = (filter: TransactionsFilter = {}) =>
  ['transactions', filter] as const;

export function useTransactionsQuery(filter: TransactionsFilter) {
  return useQuery({
    queryKey: transactionsKey(filter),
    queryFn: () => transactionsApi.list(filter),
  });
}

function invalidateAfterMutation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
  queryClient.invalidateQueries({ queryKey: ['budget'] });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionDTO) => transactionsApi.create(payload),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateTransactionDTO }) =>
      transactionsApi.update(id, payload),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}
