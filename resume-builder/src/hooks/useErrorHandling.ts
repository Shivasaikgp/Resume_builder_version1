import { useState, useCallback, useRef } from 'react';
import { AIServiceError, RateLimitError, ProviderUnavailableError } from '@/lib/ai/errors';

interface ErrorState {
  error: Error | AIServiceError | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryAt: Date | null;
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryCondition?: (error: Error | AIServiceError) => boolean;
}

interface UseErrorHandlingReturn {
  error: Error | AIServiceError | null;
  isRetrying: boolean;
  retryCount: number;
  
  // Actions
  setError: (error: Error | AIServiceError | null) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  canRetry: boolean;
  
  // Wrapper for async operations
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ) => Promise<T>;
}

export function useErrorHandling(
  defaultRetryOptions: RetryOptions = {}
): UseErrorHandlingReturn {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryAt: null,
  });

  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const retryOptionsRef = useRef<RetryOptions>(defaultRetryOptions);

  const setError = useCallback((error: Error | AIServiceError | null) => {
    setErrorState(prev => ({
      ...prev,
      error,
      isRetrying: false,
    }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryAt: null,
    });
    lastOperationRef.current = null;
  }, []);

  const shouldRetry = useCallback((
    error: Error | AIServiceError,
    retryCount: number,
    options: RetryOptions
  ): boolean => {
    const maxRetries = options.maxRetries ?? 3;
    
    if (retryCount >= maxRetries) {
      return false;
    }

    // Custom retry condition
    if (options.retryCondition) {
      return options.retryCondition(error);
    }

    // Default retry logic
    if (error instanceof RateLimitError) {
      return true; // Always retry rate limit errors after delay
    }

    if (error instanceof ProviderUnavailableError) {
      return true; // Retry provider unavailable errors
    }

    if (error instanceof AIServiceError) {
      return error.retryable;
    }

    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }

    return false;
  }, []);

  const getRetryDelay = useCallback((
    error: Error | AIServiceError,
    retryCount: number,
    options: RetryOptions
  ): number => {
    const baseDelay = options.retryDelay ?? 1000;

    // Rate limit specific delay
    if (error instanceof RateLimitError) {
      const timeUntilReset = error.resetTime.getTime() - Date.now();
      return Math.max(timeUntilReset, 1000);
    }

    // Exponential backoff
    if (options.exponentialBackoff !== false) {
      return baseDelay * Math.pow(2, retryCount);
    }

    return baseDelay;
  }, []);

  const retry = useCallback(async () => {
    if (!lastOperationRef.current || errorState.isRetrying) {
      return;
    }

    const operation = lastOperationRef.current;
    const options = retryOptionsRef.current;

    if (!shouldRetry(errorState.error!, errorState.retryCount, options)) {
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
    }));

    const delay = getRetryDelay(errorState.error!, errorState.retryCount, options);
    
    // Wait for retry delay
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const result = await operation();
      
      // Success - clear error state
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        lastRetryAt: null,
      });

      return result;
    } catch (error) {
      const newRetryCount = errorState.retryCount + 1;
      
      setErrorState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
        isRetrying: false,
        retryCount: newRetryCount,
        lastRetryAt: new Date(),
      }));

      throw error;
    }
  }, [errorState, shouldRetry, getRetryDelay]);

  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    // Store operation and options for retry
    lastOperationRef.current = operation;
    retryOptionsRef.current = { ...defaultRetryOptions, ...options };

    // Clear previous error
    setErrorState(prev => ({
      ...prev,
      error: null,
      isRetrying: false,
    }));

    let lastError: Error | AIServiceError;
    let retryCount = 0;
    const maxRetries = options.maxRetries ?? 3;

    while (retryCount <= maxRetries) {
      try {
        const result = await operation();
        
        // Success - clear error state
        if (retryCount > 0) {
          setErrorState({
            error: null,
            isRetrying: false,
            retryCount: 0,
            lastRetryAt: null,
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Update error state
        setErrorState(prev => ({
          ...prev,
          error: lastError,
          isRetrying: retryCount < maxRetries && shouldRetry(lastError, retryCount, options),
          retryCount,
          lastRetryAt: retryCount > 0 ? new Date() : null,
        }));

        // Check if we should retry
        if (retryCount < maxRetries && shouldRetry(lastError, retryCount, options)) {
          const delay = getRetryDelay(lastError, retryCount, options);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        // No more retries - throw the error
        throw lastError;
      }
    }

    throw lastError!;
  }, [defaultRetryOptions, shouldRetry, getRetryDelay]);

  const canRetry = Boolean(
    errorState.error &&
    !errorState.isRetrying &&
    lastOperationRef.current &&
    shouldRetry(errorState.error, errorState.retryCount, retryOptionsRef.current)
  );

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    setError,
    clearError,
    retry,
    canRetry,
    withErrorHandling,
  };
}

// Specialized hooks for different error scenarios
export function useAIErrorHandling() {
  return useErrorHandling({
    maxRetries: 3,
    exponentialBackoff: true,
    retryCondition: (error) => {
      if (error instanceof AIServiceError) {
        return error.retryable;
      }
      return true;
    },
  });
}

export function useNetworkErrorHandling() {
  return useErrorHandling({
    maxRetries: 2,
    retryDelay: 1000,
    retryCondition: (error) => {
      return error.message.includes('fetch') || 
             error.message.includes('network') ||
             error.message.includes('timeout');
    },
  });
}