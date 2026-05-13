import { useQuery } from '@tanstack/react-query';
import { familyApi } from '../lib/api';
import type { FamilyDetails } from '../types/api';

export const familyDetailsKey = ['family', 'details'] as const;

const emptyFamily: FamilyDetails = {
  _id: '',
  owner: '',
  familyCode: '',
  bankAccounts: [],
};

export function useFamilyDetails(enabled: boolean = true) {
  return useQuery({
    queryKey: familyDetailsKey,
    queryFn: async () => {
      try {
        return await familyApi.details();
      } catch {
        return emptyFamily;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
