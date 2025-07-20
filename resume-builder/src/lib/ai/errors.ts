// AI Service Error Handling

export class AIServiceError extends Error {
  public readonly code: string;
  public readonly provider?: string;
  public readonly retryable: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: string,
    provider?: string,
    retryable: boolean = false,
    requestId?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.provider = provider;
    this.retryable = retryable;
    this.timestamp = new Date();
    this.requestId = requestId;
  }
}

export class RateLimitError extends AIServiceError {
  public readonly resetTime: Date;

  constructor(message: string, resetTime: Date, provider?: string, requestId?: string) {
    super(message, 'RATE_LIMIT_EXCEEDED', provider, true, requestId);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

export class ProviderUnavailableError extends AIServiceError {
  constructor(message: string, provider: string, requestId?: string) {
    super(message, 'PROVIDER_UNAVAILABLE', provider, true, requestId);
    this.name = 'ProviderUnavailableError';
  }
}

export class InvalidRequestError extends AIServiceError {
  constructor(message: string, provider?: string, requestId?: string) {
    super(message, 'INVALID_REQUEST', provider, false, requestId);
    this.name = 'InvalidRequestError';
  }
}

export class AuthenticationError extends AIServiceError {
  constructor(message: string, provider: string, requestId?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider, false, requestId);
    this.name = 'AuthenticationError';
  }
}

export class QuotaExceededError extends AIServiceError {
  constructor(message: string, provider: string, requestId?: string) {
    super(message, 'QUOTA_EXCEEDED', provider, false, requestId);
    this.name = 'QuotaExceededError';
  }
}

export function handleAIError(error: any, provider: string, requestId?: string): AIServiceError {
  // OpenAI error handling
  if (provider === 'openai') {
    if (error.status === 429) {
      const resetTime = new Date(Date.now() + 60000); // Default 1 minute
      return new RateLimitError(
        'OpenAI rate limit exceeded',
        resetTime,
        provider,
        requestId
      );
    }
    if (error.status === 401) {
      return new AuthenticationError(
        'OpenAI authentication failed',
        provider,
        requestId
      );
    }
    if (error.status === 403) {
      return new QuotaExceededError(
        'OpenAI quota exceeded',
        provider,
        requestId
      );
    }
    if (error.status >= 500) {
      return new ProviderUnavailableError(
        'OpenAI service unavailable',
        provider,
        requestId
      );
    }
    if (error.status >= 400) {
      return new InvalidRequestError(
        error.message || 'Invalid request to OpenAI',
        provider,
        requestId
      );
    }
  }

  // Anthropic error handling
  if (provider === 'anthropic') {
    if (error.status === 429) {
      const resetTime = new Date(Date.now() + 60000); // Default 1 minute
      return new RateLimitError(
        'Anthropic rate limit exceeded',
        resetTime,
        provider,
        requestId
      );
    }
    if (error.status === 401) {
      return new AuthenticationError(
        'Anthropic authentication failed',
        provider,
        requestId
      );
    }
    if (error.status === 403) {
      return new QuotaExceededError(
        'Anthropic quota exceeded',
        provider,
        requestId
      );
    }
    if (error.status >= 500) {
      return new ProviderUnavailableError(
        'Anthropic service unavailable',
        provider,
        requestId
      );
    }
    if (error.status >= 400) {
      return new InvalidRequestError(
        error.message || 'Invalid request to Anthropic',
        provider,
        requestId
      );
    }
  }

  // Generic error handling
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new ProviderUnavailableError(
      `Network error connecting to ${provider}`,
      provider,
      requestId
    );
  }

  // Default error
  return new AIServiceError(
    error.message || 'Unknown AI service error',
    'UNKNOWN_ERROR',
    provider,
    true,
    requestId
  );
}