import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LlmParsedResult {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  date?: string;
  bankAccount?: string;
  confidence: number;
}

interface LlmProvider {
  name: string;
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private readonly providers: LlmProvider[] = [
    {
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.1-8b-instant',
      apiKeyEnv: 'GROQ_API_KEY',
    },
    {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      apiKeyEnv: 'OPENROUTER_API_KEY',
    },
  ];

  constructor(private configService: ConfigService) {}

  async parse(
    message: string,
    language: string,
    availableCategories: string[],
    availableBankAccounts: string[],
    context?: { role: string; content: string }[],
  ): Promise<LlmParsedResult | null> {
    const systemPrompt = this.buildSystemPrompt(language, availableCategories, availableBankAccounts);

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (context && context.length > 0) {
      const recentContext = context.slice(-6);
      for (const ctx of recentContext) {
        messages.push({
          role: ctx.role === 'user' ? 'user' : 'assistant',
          content: ctx.content,
        });
      }
    }

    messages.push({ role: 'user', content: message });

    for (const provider of this.providers) {
      const apiKey = this.configService.get<string>(provider.apiKeyEnv);
      if (!apiKey || apiKey.startsWith('your_')) {
        this.logger.warn(`${provider.name}: API key not configured, skipping`);
        continue;
      }

      try {
        const result = await this.callProvider(provider, apiKey, messages);
        if (result) {
          this.logger.log(`${provider.name}: Successfully parsed message`);
          return result;
        }
      } catch (error) {
        this.logger.warn(`${provider.name} failed: ${error.message}`);
        continue;
      }
    }

    this.logger.warn('All LLM providers failed');
    return null;
  }

  private async callProvider(
    provider: LlmProvider,
    apiKey: string,
    messages: { role: string; content: string }[],
  ): Promise<LlmParsedResult | null> {
    const timeoutMs = provider.name === 'Groq' ? 10000 : 15000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(provider.name === 'OpenRouter' && {
            'HTTP-Referer': 'https://verdantcash.app',
            'X-Title': 'VerdantCash',
          }),
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.1,
          max_tokens: 256,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from LLM');
      }

      return this.validateAndParse(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateAndParse(rawJson: string): LlmParsedResult | null {
    try {
      const parsed = JSON.parse(rawJson);

      if (!parsed.type || !['income', 'expense'].includes(parsed.type)) return null;
      if (typeof parsed.amount !== 'number' || parsed.amount <= 0) return null;
      if (!parsed.description || typeof parsed.description !== 'string') return null;

      return {
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description.trim(),
        category: parsed.category || undefined,
        date: parsed.date || undefined,
        bankAccount: parsed.bankAccount || undefined,
        confidence: typeof parsed.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.7,
      };
    } catch {
      this.logger.warn('Failed to parse LLM JSON response');
      return null;
    }
  }

  private buildSystemPrompt(
    language: string,
    categories: string[],
    bankAccounts: string[],
  ): string {
    const langLabel = language?.startsWith('pt') ? 'pt-BR' : 'en';
    const today = new Date().toISOString().split('T')[0];

    return `You are a financial transaction parser. Your job is to extract structured data from natural language messages about financial transactions.

RULES:
- Respond ONLY with valid JSON (no markdown, no explanation)
- Language of the user message: ${langLabel}
- Today's date: ${today}
- Available categories: ${JSON.stringify(categories)}
- Available bank accounts: ${JSON.stringify(bankAccounts)}
- Transaction type classification: use "income" for money received (e.g., "recebi", "ganhei", "vendi", "depositou", "salário"), and "expense" for money spent (e.g., "gastei", "paguei", "comprei", "custou").

IMPORTANT - CONVERSATION CONTEXT:
- You may receive previous messages for context.
- If the current message is a CORRECTION to a previous message (e.g., "na verdade foi 10000", "actually it was 5000", "o valor era 200"), you MUST use the previous context to understand what the user is correcting, and return the CORRECTED transaction data.
- A correction keeps the same description/category/type from the previous message but updates the corrected field(s).

OUTPUT JSON SCHEMA:
{
  "type": "income" | "expense",
  "amount": number (always positive),
  "description": string (short, clean description of what the transaction is),
  "category": string (one of the available categories, or "Other" if unsure),
  "date": string (ISO 8601 date, e.g. "${today}". Use today if not specified. "ontem"/"yesterday" = yesterday, "dia X" = day X of current month),
  "bankAccount": string | null (one of the available bank accounts if mentioned, or a NEW account name if clearly stated. null if not mentioned),
  "confidence": number (0 to 1, how confident you are in the parsing)
}

EXAMPLES:
- "gastei 50 no mercado" → {"type":"expense","amount":50,"description":"Mercado","category":"Food","date":"${today}","bankAccount":null,"confidence":0.95}
- "recebi 2000 de salário na conta nubank" → {"type":"income","amount":2000,"description":"Salário","category":"Salary","date":"${today}","bankAccount":"Nubank","confidence":0.95}
- "paguei 120 de luz ontem" → {"type":"expense","amount":120,"description":"Conta de luz","category":"Utilities","date":"...yesterday...","bankAccount":null,"confidence":0.9}
- [after previous message about "recebi 1000 de sorteio"] "na verdade foi 10000" → {"type":"income","amount":10000,"description":"Sorteio","category":"Other","date":"${today}","bankAccount":null,"confidence":0.85}`;
  }

  isAvailable(): boolean {
    return this.providers.some((p) => {
      const key = this.configService.get<string>(p.apiKeyEnv);
      return key && !key.startsWith('your_');
    });
  }
}
