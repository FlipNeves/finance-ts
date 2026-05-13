import { apiClient } from './client';
import type {
  Summary,
  SpendingByCategory,
  EvolutionPoint,
  TopSpending,
  AccountReport,
  MemberReport,
  DailySpendingPoint,
  UpcomingFixed,
  IncomeSummary,
  TotalAccumulated,
  TypeFilter,
} from '../../types/api';

export interface DateRangeQuery {
  startDate: string;
  endDate: string;
}

export interface TypedRangeQuery extends DateRangeQuery {
  type?: TypeFilter;
}

export const reportsApi = {
  summary: (params: DateRangeQuery) =>
    apiClient.get<Summary>('/reports/summary', { params }).then((r) => r.data),
  spendingByCategory: (params: TypedRangeQuery) =>
    apiClient
      .get<SpendingByCategory[]>('/reports/spending-by-category', { params })
      .then((r) => r.data),
  evolution: (params: { endDate: string; months?: number }) =>
    apiClient
      .get<EvolutionPoint[]>('/reports/evolution', { params })
      .then((r) => r.data),
  topSpending: (params: DateRangeQuery) =>
    apiClient
      .get<TopSpending>('/reports/top-spending', { params })
      .then((r) => r.data),
  dailySpending: (params: TypedRangeQuery) =>
    apiClient
      .get<DailySpendingPoint[]>('/reports/daily-spending', { params })
      .then((r) => r.data),
  balanceByAccount: (params: DateRangeQuery) =>
    apiClient
      .get<AccountReport[]>('/reports/balance-by-account', { params })
      .then((r) => r.data),
  spendingByMember: (params: DateRangeQuery) =>
    apiClient
      .get<MemberReport[]>('/reports/spending-by-member', { params })
      .then((r) => r.data),
  upcomingFixed: (params: { referenceDate: string }) =>
    apiClient
      .get<UpcomingFixed[]>('/reports/upcoming-fixed', { params })
      .then((r) => r.data),
  incomeSummary: (params: DateRangeQuery & { referenceDate: string }) =>
    apiClient
      .get<IncomeSummary>('/reports/income-summary', { params })
      .then((r) => r.data),
  totalAccumulated: () =>
    apiClient
      .get<TotalAccumulated>('/reports/total-accumulated')
      .then((r) => r.data),
};
