import { apiClient } from './client';
import type {
  Transaction,
  CreateTransactionDTO,
  CreateTransactionResponse,
  TransactionsFilter,
} from '../../types/api';

export const transactionsApi = {
  list: (filter: TransactionsFilter = {}) =>
    apiClient
      .get<Transaction[]>('/transactions', { params: filter })
      .then((r) => r.data),
  categories: () =>
    apiClient.get<string[]>('/transactions/categories').then((r) => r.data),
  create: (payload: CreateTransactionDTO) =>
    apiClient
      .post<CreateTransactionResponse>('/transactions', payload)
      .then((r) => r.data),
  update: (id: string, payload: CreateTransactionDTO) =>
    apiClient
      .put<CreateTransactionResponse>(`/transactions/${id}`, payload)
      .then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete<void>(`/transactions/${id}`).then((r) => r.data),
};
