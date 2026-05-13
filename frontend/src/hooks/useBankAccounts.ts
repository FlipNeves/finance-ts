import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../lib/api';

export const bankAccountsQueryKey = ['transactions', 'bank-accounts'] as const;

export function useBankAccounts() {
  return useQuery({
    queryKey: bankAccountsQueryKey,
    queryFn: () => transactionsApi.bankAccounts(),
    staleTime: 1000 * 60 * 10,
  });
}
