// AI Service Types and Interfaces

export interface AIServiceConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  rateLimiting: {
    requestsPerMinute: number;
    requestsPerHour: number;
    concurrentRequests: number;
  };
  fallback: {
    enabled: boolean;
    retryAttempts: number;
    retryDelay: number;
  };
}

export interface AIRequest {
  id: string;
  type: 'content-generation' | 'analysis' | 'optimization' | 'context';
  prompt: string;
  context?: Record<string, any>;
  userId: string;
  priority: 'low' | 'normal' | 'high';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  id: string;
  requestId: string;
  content: string;
  provider: 'openai' | 'anthropic';
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: Date;
  processingTime: number;
  cached?: boolean;
}

export interface AIError {
  code: string;
  message: string;
  provider?: 'openai' | 'anthropic';
  retryable: boolean;
  timestamp: Date;
  requestId?: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
}

export interface RateLimitStatus {
  requestsRemaining: number;
  resetTime: Date;
  isLimited: boolean;
}

export type AIProvider = 'openai' | 'anthropic';

export interface ProviderHealth {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}