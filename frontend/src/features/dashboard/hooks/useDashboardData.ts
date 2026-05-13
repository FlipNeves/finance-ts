import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { reportsApi, transactionsApi, budgetsApi } from '../../../lib/api';
import { useFamilyDetails } from '../../../hooks/useFamilyDetails';
import { useCategories } from '../../../hooks/useCategories';
import { useMonthRange } from '../../../hooks/useMonthRange';
import type { TypeFilter } from '../../../types/api';

const NOW_ISO = () => new Date().toISOString();

export function useDashboardData(reference: Date, typeFilter: TypeFilter) {
  const range = useMonthRange(reference);
  const { startISO, endISO, month, year } = range;
  const rangeKey = { startISO, endISO } as const;

  const summary = useQuery({
    queryKey: ['reports', 'summary', rangeKey],
    queryFn: () => reportsApi.summary({ startDate: startISO, endDate: endISO }),
  });

  const spending = useQuery({
    queryKey: ['reports', 'spending-by-category', rangeKey, typeFilter],
    queryFn: () =>
      reportsApi.spendingByCategory({
        startDate: startISO,
        endDate: endISO,
        type: typeFilter,
      }),
  });

  const transactions = useQuery({
    queryKey: ['transactions', { ...rangeKey, type: typeFilter }],
    queryFn: () =>
      transactionsApi.list({
        startDate: startISO,
        endDate: endISO,
        type: typeFilter === 'all' ? undefined : typeFilter,
      }),
    select: (data) => data.slice(0, 5),
  });

  const categories = useCategories();
  const family = useFamilyDetails();

  const evolution = useQuery({
    queryKey: ['reports', 'evolution', { endISO }],
    queryFn: () => reportsApi.evolution({ endDate: endISO }),
  });

  const topSpending = useQuery({
    queryKey: ['reports', 'top-spending', rangeKey],
    queryFn: () => reportsApi.topSpending({ startDate: startISO, endDate: endISO }),
  });

  const daily = useQuery({
    queryKey: ['reports', 'daily-spending', rangeKey, typeFilter],
    queryFn: () =>
      reportsApi.dailySpending({
        startDate: startISO,
        endDate: endISO,
        type: typeFilter,
      }),
  });

  const accountsReport = useQuery({
    queryKey: ['reports', 'balance-by-account', rangeKey],
    queryFn: () =>
      reportsApi.balanceByAccount({ startDate: startISO, endDate: endISO }),
  });

  const membersReport = useQuery({
    queryKey: ['reports', 'spending-by-member', rangeKey],
    queryFn: () =>
      reportsApi.spendingByMember({ startDate: startISO, endDate: endISO }),
  });

  const upcomingFixed = useQuery({
    queryKey: ['reports', 'upcoming-fixed'],
    queryFn: async () => {
      try {
        return await reportsApi.upcomingFixed({ referenceDate: NOW_ISO() });
      } catch {
        return [];
      }
    },
  });

  const incomeSummary = useQuery({
    queryKey: ['reports', 'income-summary', rangeKey],
    queryFn: async () => {
      try {
        return await reportsApi.incomeSummary({
          startDate: startISO,
          endDate: endISO,
          referenceDate: NOW_ISO(),
        });
      } catch {
        return { events: [], upcoming: [], missed: [] };
      }
    },
  });

  const budget = useQuery({
    queryKey: ['budget', { month, year }],
    queryFn: async () => {
      try {
        return await budgetsApi.get({ month, year });
      } catch {
        return { month, year, totalLimit: 0, categoryLimits: [] };
      }
    },
  });

  const isLoading =
    summary.isLoading ||
    spending.isLoading ||
    transactions.isLoading ||
    categories.isLoading ||
    family.isLoading ||
    evolution.isLoading ||
    topSpending.isLoading ||
    daily.isLoading ||
    accountsReport.isLoading ||
    membersReport.isLoading;

  return useMemo(
    () => ({
      range,
      isLoading,
      summary,
      spending,
      transactions,
      categories,
      family,
      evolution,
      topSpending,
      daily,
      accountsReport,
      membersReport,
      upcomingFixed,
      incomeSummary,
      budget,
    }),
    [
      range,
      isLoading,
      summary,
      spending,
      transactions,
      categories,
      family,
      evolution,
      topSpending,
      daily,
      accountsReport,
      membersReport,
      upcomingFixed,
      incomeSummary,
      budget,
    ],
  );
}

export function useDashboardInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['budget'] });
  };
}
