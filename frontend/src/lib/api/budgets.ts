import { apiClient } from './client';
import type { Budget, SaveBudgetDTO } from '../../types/api';

export interface BudgetMonthQuery {
  month: number;
  year: number;
}

export const budgetsApi = {
  get: (params: BudgetMonthQuery) =>
    apiClient.get<Budget>('/budgets', { params }).then((r) => r.data),
  save: (payload: SaveBudgetDTO) =>
    apiClient.post<Budget>('/budgets', payload).then((r) => r.data),
  copyPrevious: (params: BudgetMonthQuery) =>
    apiClient.post<Budget>('/budgets/copy', params).then((r) => r.data),
};
