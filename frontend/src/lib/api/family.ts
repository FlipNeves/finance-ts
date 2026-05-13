import { apiClient } from './client';
import type { FamilyDetails, Member } from '../../types/api';

export const familyApi = {
  details: () =>
    apiClient.get<FamilyDetails>('/family/details').then((r) => r.data),
  members: () => apiClient.get<Member[]>('/family/members').then((r) => r.data),
  pending: () => apiClient.get<Member[]>('/family/pending').then((r) => r.data),
  create: () => apiClient.post<FamilyDetails>('/family/create', {}).then((r) => r.data),
  join: (familyCode: string) =>
    apiClient.post<void>('/family/join', { familyCode }).then((r) => r.data),
  approve: (memberId: string) =>
    apiClient.post<void>(`/family/approve/${memberId}`).then((r) => r.data),
  reject: (memberId: string) =>
    apiClient.post<void>(`/family/reject/${memberId}`).then((r) => r.data),
  remove: (memberId: string) =>
    apiClient.delete<void>(`/family/members/${memberId}`).then((r) => r.data),
  addCategory: (category: string) =>
    apiClient.post<void>('/family/categories', { category }).then((r) => r.data),
  addBankAccount: (bankAccount: string) =>
    apiClient.post<void>('/family/bank-accounts', { bankAccount }).then((r) => r.data),
};
