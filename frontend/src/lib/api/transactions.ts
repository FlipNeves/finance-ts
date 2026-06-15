import { apiClient } from './client';
import type {
  Transaction,
  CreateTransactionDTO,
  CreateTransactionResponse,
  TransactionsFilter,
  ImportPreviewDTO,
  ImportPreviewPdfDTO,
  ImportPreviewResponse,
  ImportPreviewRow,
  ImportCommitResponse,
  QuickAddDTO,
  QuickAddResponse,
} from '../../types/api';

export const transactionsApi = {
  list: (filter: TransactionsFilter = {}) =>
    apiClient
      .get<Transaction[]>('/transactions', { params: filter })
      .then((r) => r.data),
  categories: () =>
    apiClient.get<string[]>('/transactions/categories').then((r) => r.data),
  bankAccounts: () =>
    apiClient.get<string[]>('/transactions/bank-accounts').then((r) => r.data),
  create: (payload: CreateTransactionDTO) =>
    apiClient
      .post<CreateTransactionResponse>('/transactions', payload)
      .then((r) => r.data),
  quick: (payload: QuickAddDTO) =>
    apiClient
      .post<QuickAddResponse>('/transactions/quick', payload)
      .then((r) => r.data),
  update: (id: string, payload: CreateTransactionDTO) =>
    apiClient
      .put<CreateTransactionResponse>(`/transactions/${id}`, payload)
      .then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete<void>(`/transactions/${id}`).then((r) => r.data),
  importPreview: (payload: ImportPreviewDTO) =>
    apiClient
      .post<ImportPreviewResponse>('/transactions/import/preview', payload)
      .then((r) => r.data),
  importPreviewPdf: ({ file, bankAccount }: ImportPreviewPdfDTO) => {
    const form = new FormData();
    form.append('file', file);
    if (bankAccount) form.append('bankAccount', bankAccount);
    // Let the browser/axios set the multipart boundary in Content-Type.
    return apiClient
      .post<ImportPreviewResponse>('/transactions/import/preview-pdf', form)
      .then((r) => r.data);
  },
  importCommit: (rows: ImportPreviewRow[]) =>
    apiClient
      .post<ImportCommitResponse>('/transactions/import/commit', { rows })
      .then((r) => r.data),
  importUndo: (batchId: string) =>
    apiClient
      .delete<{ deleted: number }>(`/transactions/import/${batchId}`)
      .then((r) => r.data),
};
