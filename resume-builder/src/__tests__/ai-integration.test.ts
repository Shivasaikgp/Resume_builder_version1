// AI Service Integration Tests

import { describe, it, expect, vi } from 'vitest';
import { getAIConfig, validateAIConfig, DEFAULT_AI_CONFIG } from '@/lib/ai/config';
import { handleAIError, AIServiceError, RateLimitError } from '@/lib/ai/errors';

describe('AI Service Configuration', () => {
  it('should load default configuration', () => {
    const config = getAIConfig();
    
    expect(config).toBeDefined();
    expect(config.openai).toBeDefined();
    expect(config.anthropic).toBeDefined();
    expect(config.rateLimiting).toBeDefined();
    expect(config.fallback).toBeDefined();
  });

  it('should use default values when env vars are not set', () => {
    const config = getAIConfig();
    
    expect(config.openai.model).toBe(DEFAULT_AI_CONFIG.openai.model);
    expect(config.anthropic.model).toBe(DEFAULT_AI_CONFIG.anthropic.model);
    expect(config.rateLimiting.requestsPerMinute).toBe(DEFAULT_AI_CONFIG.rateLimiting.requestsPerMinute);
  });

  it('should detect invalid configuration', () => {
    const invalidConfig = {
      ...getAIConfig(),
      openai: { ...getAIConfig().openai, apiKey: '' },
      anthropic: { ...getAIConfig().anthropic, apiKey: '' },
    };
    
    const errors = validateAIConfig(invalidConfig);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('At least one AI provider API key must be configured');
  });

  it('should validate OpenAI API key format', () => {
    const config = {
      ...getAIConfig(),
      openai: { ...getAIConfig().openai, apiKey: 'invalid-key' },
      anthropic: { ...getAIConfig().anthropic, apiKey: '' },
    };
    
    const errors = validateAIConfig(config);
    expect(errors).toContain('OpenAI API key appears to be invalid');
  });

  it('should validate Anthropic API key format', () => {
    const config = {
      ...getAIConfig(),
      openai: { ...getAIConfig().openai, apiKey: '' },
      anthropic: { ...getAIConfig().anthropic, apiKey: 'invalid-key' },
    };
    
    const errors = validateAIConfig(config);
    expect(errors).toContain('Anthropic API key appears to be invalid');
  });

  it('should validate rate limiting configuration', () => {
    const config = {
      ...getAIConfig(),
      rateLimiting: {
        ...getAIConfig().rateLimiting,
        requestsPerMinute: 0,
        concurrentRequests: -1,
      },
    };
    
    const errors = validateAIConfig(config);
    expect(errors).toContain('Requests per minute must be greater than 0');
    expect(errors).toContain('Concurrent requests must be greater than 0');
  });
});

describe('AI Error Handling', () => {
  it('should handle OpenAI rate limit errors', () => {
    const error = { status: 429, message: 'Rate limit exceeded' };
    const aiError = handleAIError(error, 'openai', 'test-request-id');
    
    expect(aiError).toBeInstanceOf(RateLimitError);
    expect(aiError.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(aiError.retryable).toBe(true);
    expect(aiError.provider).toBe('openai');
    expect(aiError.requestId).toBe('test-request-id');
  });

  it('should handle authentication errors', () => {
    const error = { status: 401, message: 'Invalid API key' };
    const aiError = handleAIError(error, 'openai', 'test-request-id');
    
    expect(aiError).toBeInstanceOf(AIServiceError);
    expect(aiError.code).toBe('AUTHENTICATION_ERROR');
    expect(aiError.retryable).toBe(false);
    expect(aiError.provider).toBe('openai');
  });

  it('should handle quota exceeded errors', () => {
    const error = { status: 403, message: 'Quota exceeded' };
    const aiError = handleAIError(error, 'anthropic', 'test-request-id');
    
    expect(aiError.code).toBe('QUOTA_EXCEEDED');
    expect(aiError.retryable).toBe(false);
    expect(aiError.provider).toBe('anthropic');
  });

  it('should handle server errors', () => {
    const error = { status: 500, message: 'Internal server error' };
    const aiError = handleAIError(error, 'openai', 'test-request-id');
    
    expect(aiError.code).toBe('PROVIDER_UNAVAILABLE');
    expect(aiError.retryable).toBe(true);
  });

  it('should handle network errors', () => {
    const error = { code: 'ECONNREFUSED', message: 'Connection refused' };
    const aiError = handleAIError(error, 'openai', 'test-request-id');
    
    expect(aiError.code).toBe('PROVIDER_UNAVAILABLE');
    expect(aiError.retryable).toBe(true);
  });

  it('should handle invalid request errors', () => {
    const error = { status: 400, message: 'Bad request' };
    const aiError = handleAIError(error, 'anthropic', 'test-request-id');
    
    expect(aiError.code).toBe('INVALID_REQUEST');
    expect(aiError.retryable).toBe(false);
  });

  it('should handle unknown errors', () => {
    const error = { message: 'Unknown error' };
    const aiError = handleAIError(error, 'openai', 'test-request-id');
    
    expect(aiError.code).toBe('UNKNOWN_ERROR');
    expect(aiError.retryable).toBe(true);
  });
});

describe('AI Service Infrastructure', () => {
  it('should export all required modules', async () => {
    // Test that all modules can be imported
    const aiModule = await import('@/lib/ai');
    
    expect(aiModule.getAIConfig).toBeDefined();
    expect(aiModule.validateAIConfig).toBeDefined();
    expect(aiModule.AIServiceError).toBeDefined();
    expect(aiModule.RateLimitError).toBeDefined();
    expect(aiModule.handleAIError).toBeDefined();
    expect(aiModule.getAIClients).toBeDefined();
    expect(aiModule.getAIQueue).toBeDefined();
  });

  it('should have proper error class hierarchy', () => {
    const baseError = new AIServiceError('Test error', 'TEST_CODE');
    const rateLimitError = new RateLimitError('Rate limit', new Date());
    
    expect(baseError).toBeInstanceOf(Error);
    expect(baseError).toBeInstanceOf(AIServiceError);
    expect(rateLimitError).toBeInstanceOf(Error);
    expect(rateLimitError).toBeInstanceOf(AIServiceError);
    expect(rateLimitError).toBeInstanceOf(RateLimitError);
  });

  it('should handle configuration validation edge cases', () => {
    const config = {
      ...getAIConfig(),
      fallback: {
        ...getAIConfig().fallback,
        retryAttempts: -1,
      },
    };
    
    const errors = validateAIConfig(config);
    expect(errors).toContain('Retry attempts cannot be negative');
  });
});