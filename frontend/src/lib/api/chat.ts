import { apiClient } from './client';
import type { ParsedChatTransaction } from '../../types/api';

export interface ChatContextMessage {
  role: string;
  content: string;
}

export interface ParseChatDTO {
  message: string;
  language: string;
  context: ChatContextMessage[];
}

export interface ParseChatResponse {
  success: boolean;
  message: string;
  parsed?: ParsedChatTransaction;
  source?: 'regex' | 'llm' | 'none';
  skipConfirmation?: boolean;
}

export interface ConfirmChatDTO {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  bankAccount?: string;
  language: string;
}

export interface ConfirmChatResponse {
  message: string;
  alert?: string;
  bankAccountCreated?: boolean;
}

export const chatApi = {
  parse: (payload: ParseChatDTO) =>
    apiClient.post<ParseChatResponse>('/chat/parse', payload).then((r) => r.data),
  confirm: (payload: ConfirmChatDTO) =>
    apiClient.post<ConfirmChatResponse>('/chat/confirm', payload).then((r) => r.data),
};
