import { apiClient } from './client';
import type { User } from '../../types/api';

export const usersApi = {
  profile: () => apiClient.get<User>('/users/profile').then((r) => r.data),
};
