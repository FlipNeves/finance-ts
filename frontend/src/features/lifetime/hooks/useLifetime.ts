import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../../lib/api';

const FAR_PAST = new Date('2000-01-01').toISOString();

export function useLifetimeData() {
  const now = new Date().toISOString();

  const totalAccumulated = useQuery({
    queryKey: ['reports', 'total-accumulated'],
    queryFn: () => reportsApi.totalAccumulated(),
  });

  const accountsReport = useQuery({
    queryKey: ['reports', 'balance-by-account', 'lifetime'],
    queryFn: () => reportsApi.balanceByAccount({ startDate: FAR_PAST, endDate: now }),
  });

  const evolution = useQuery({
    queryKey: ['reports', 'evolution', 'lifetime'],
    queryFn: () => reportsApi.evolution({ endDate: now, months: 12 }),
  });

  return {
    totalAccumulated,
    accountsReport,
    evolution,
    isLoading:
      totalAccumulated.isLoading ||
      accountsReport.isLoading ||
      evolution.isLoading,
  };
}
