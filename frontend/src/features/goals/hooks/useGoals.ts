import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../../lib/api';
import type {
  CreateGoalDTO,
  UpdateGoalDTO,
  CreateContributionDTO,
} from '../../../types/api';

export const goalsKey = ['goals'] as const;
export const goalKey = (id: string) => ['goals', id] as const;
export const contributionsKey = (id: string) =>
  ['goals', id, 'contributions'] as const;

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['goals'] });
}

export function useGoalsQuery() {
  return useQuery({
    queryKey: goalsKey,
    queryFn: () => goalsApi.list(),
  });
}

export function useGoalQuery(id: string) {
  return useQuery({
    queryKey: goalKey(id),
    queryFn: () => goalsApi.get(id),
    enabled: Boolean(id),
  });
}

export function useContributionsQuery(id: string) {
  return useQuery({
    queryKey: contributionsKey(id),
    queryFn: () => goalsApi.listContributions(id),
    enabled: Boolean(id),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGoalDTO) => goalsApi.create(payload),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGoalDTO }) =>
      goalsApi.update(id, payload),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useAddContribution(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContributionDTO) =>
      goalsApi.addContribution(goalId, payload),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteContribution(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) =>
      goalsApi.removeContribution(goalId, contributionId),
    onSuccess: () => invalidateAll(queryClient),
  });
}
