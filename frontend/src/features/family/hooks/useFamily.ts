import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { familyApi } from '../../../lib/api';
import { familyDetailsKey } from '../../../hooks/useFamilyDetails';

export const familyMembersKey = ['family', 'members'] as const;
export const familyPendingKey = ['family', 'pending'] as const;

export function useFamilyMembers(enabled = true) {
  return useQuery({
    queryKey: familyMembersKey,
    queryFn: () => familyApi.members(),
    enabled,
  });
}

export function useFamilyPending(enabled = true) {
  return useQuery({
    queryKey: familyPendingKey,
    queryFn: () => familyApi.pending(),
    enabled,
  });
}

function invalidateFamily(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: familyDetailsKey });
  queryClient.invalidateQueries({ queryKey: familyMembersKey });
  queryClient.invalidateQueries({ queryKey: familyPendingKey });
}

export function useApproveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => familyApi.approve(memberId),
    onSuccess: () => invalidateFamily(queryClient),
  });
}

export function useRejectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => familyApi.reject(memberId),
    onSuccess: () => invalidateFamily(queryClient),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => familyApi.remove(memberId),
    onSuccess: () => invalidateFamily(queryClient),
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => familyApi.create(),
    onSuccess: () => invalidateFamily(queryClient),
  });
}

export function useJoinFamily() {
  return useMutation({
    mutationFn: (familyCode: string) => familyApi.join(familyCode),
  });
}
