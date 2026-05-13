import { apiClient } from './client';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export const authApi = {
  login: (payload: LoginDTO) =>
    apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data),
  register: (payload: RegisterDTO) =>
    apiClient.post<void>('/auth/register', payload).then((r) => r.data),
};
