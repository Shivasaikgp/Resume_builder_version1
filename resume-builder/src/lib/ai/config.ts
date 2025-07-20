// AI Service Configuration

import { AIServiceConfig } from './types';

export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.7,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-haiku-20240307',
    maxTokens: 2000,
    temperature: 0.7,
  },
  rateLimiting: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    concurrentRequests: 5,
  },
  fallback: {
    enabled: true,
    retryAttempts: 3,
    retryDelay: 1000, // milliseconds
  },
};

export function getAIConfig(): AIServiceConfig {
  return {
    ...DEFAULT_AI_CONFIG,
    openai: {
      ...DEFAULT_AI_CONFIG.openai,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || DEFAULT_AI_CONFIG.openai.model,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },
    anthropic: {
      ...DEFAULT_AI_CONFIG.anthropic,
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || DEFAULT_AI_CONFIG.anthropic.model,
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
    },
    rateLimiting: {
      requestsPerMinute: parseInt(process.env.AI_REQUESTS_PER_MINUTE || '60'),
      requestsPerHour: parseInt(process.env.AI_REQUESTS_PER_HOUR || '1000'),
      concurrentRequests: parseInt(process.env.AI_CONCURRENT_REQUESTS || '5'),
    },
    fallback: {
      enabled: process.env.AI_FALLBACK_ENABLED !== 'false',
      retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000'),
    },
  };
}

export function validateAIConfig(config: AIServiceConfig): string[] {
  const errors: string[] = [];

  if (!config.openai.apiKey && !config.anthropic.apiKey) {
    errors.push('At least one AI provider API key must be configured');
  }

  if (config.openai.apiKey && !config.openai.apiKey.startsWith('sk-')) {
    errors.push('OpenAI API key appears to be invalid');
  }

  if (config.anthropic.apiKey && !config.anthropic.apiKey.startsWith('sk-ant-')) {
    errors.push('Anthropic API key appears to be invalid');
  }

  if (config.rateLimiting.requestsPerMinute <= 0) {
    errors.push('Requests per minute must be greater than 0');
  }

  if (config.rateLimiting.concurrentRequests <= 0) {
    errors.push('Concurrent requests must be greater than 0');
  }

  if (config.fallback.retryAttempts < 0) {
    errors.push('Retry attempts cannot be negative');
  }

  return errors;
}