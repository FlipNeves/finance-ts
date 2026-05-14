import { apiClient } from './client';
import type {
  Goal,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalContribution,
  CreateContributionDTO,
} from '../../types/api';

export const goalsApi = {
  list: () => apiClient.get<Goal[]>('/goals').then((r) => r.data),
  get: (id: string) => apiClient.get<Goal>(`/goals/${id}`).then((r) => r.data),
  create: (payload: CreateGoalDTO) =>
    apiClient.post<Goal>('/goals', payload).then((r) => r.data),
  update: (id: string, payload: UpdateGoalDTO) =>
    apiClient.put<Goal>(`/goals/${id}`, payload).then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete<void>(`/goals/${id}`).then((r) => r.data),
  listContributions: (id: string) =>
    apiClient
      .get<GoalContribution[]>(`/goals/${id}/contributions`)
      .then((r) => r.data),
  addContribution: (id: string, payload: CreateContributionDTO) =>
    apiClient
      .post<GoalContribution>(`/goals/${id}/contributions`, payload)
      .then((r) => r.data),
  removeContribution: (id: string, contributionId: string) =>
    apiClient
      .delete<void>(`/goals/${id}/contributions/${contributionId}`)
      .then((r) => r.data),
};
