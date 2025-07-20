import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandling, useAIErrorHandling } from '../hooks/useErrorHandling';
import { AIServiceError, RateLimitError, ProviderUnavailableError } from '../lib/ai/errors';

describe('useErrorHandling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle successful operations without errors', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const mockOperation = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      const response = await result.current.withErrorHandling(mockOperation);
      expect(response).toBe('success');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should handle and store errors', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const testError = new Error('Test error');
    const mockOperation = vi.fn().mockRejectedValue(testError);
    
    await act(async () => {
      try {
        await result.current.withErrorHandling(mockOperation, { maxRetries: 0 });
      } catch (error) {
        expect(error).toBe(testError);
      }
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.retryCount).toBe(0);
  });

  it('should retry retryable errors', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    let response: any;
    await act(async () => {
      const promise = result.current.withErrorHandling(mockOperation, {
        maxRetries: 2,
        retryDelay: 100,
      });
      
      // Fast-forward timers to trigger retry
      await vi.advanceTimersByTimeAsync(100);
      
      response = await promise;
    });

    expect(response).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('should respect max retry limit', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const testError = new Error('Persistent error');
    const mockOperation = vi.fn().mockRejectedValue(testError);
    
    let caughtError: any;
    await act(async () => {
      try {
        const promise = result.current.withErrorHandling(mockOperation, {
          maxRetries: 2,
          retryDelay: 10,
        });
        
        // Fast-forward through all retries
        await vi.advanceTimersByTimeAsync(50);
        
        await promise;
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBe(testError);
    // Should be called 3 times (initial + 2 retries)
    expect(mockOperation).toHaveBeenCalledTimes(3);
    expect(result.current.retryCount).toBe(2);
  });

  it('should handle rate limit errors with proper delay', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const resetTime = new Date(Date.now() + 5000);
    const rateLimitError = new RateLimitError('Rate limited', resetTime, 'openai');
    
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue('success');
    
    await act(async () => {
      const promise = result.current.withErrorHandling(mockOperation, {
        maxRetries: 1,
      });
      
      // Fast-forward past the rate limit reset time
      vi.advanceTimersByTime(6000);
      
      const response = await promise;
      expect(response).toBe('success');
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff by default', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success');
    
    const startTime = Date.now();
    
    await act(async () => {
      const promise = result.current.withErrorHandling(mockOperation, {
        maxRetries: 2,
        retryDelay: 1000,
      });
      
      // First retry after 1000ms
      vi.advanceTimersByTime(1000);
      // Second retry after 2000ms (exponential backoff)
      vi.advanceTimersByTime(2000);
      
      const response = await promise;
      expect(response).toBe('success');
    });

    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should allow manual retry', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValue('success');
    
    // First attempt fails
    await act(async () => {
      try {
        await result.current.withErrorHandling(mockOperation, { maxRetries: 0 });
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.canRetry).toBe(true);

    // Manual retry
    await act(async () => {
      await result.current.retry();
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.error).toBeNull();
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should clear errors', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const testError = new Error('Test error');
    
    act(() => {
      result.current.setError(testError);
    });

    expect(result.current.error).toBe(testError);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });
});

describe('useAIErrorHandling', () => {
  it('should handle AI service errors appropriately', async () => {
    const { result } = renderHook(() => useAIErrorHandling());
    
    const aiError = new AIServiceError('AI service error', 'PROVIDER_UNAVAILABLE', 'openai', true);
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(aiError)
      .mockResolvedValue('success');
    
    await act(async () => {
      const response = await result.current.withErrorHandling(mockOperation);
      vi.advanceTimersByTime(2000); // Wait for exponential backoff
      expect(response).toBe('success');
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable AI errors', async () => {
    const { result } = renderHook(() => useAIErrorHandling());
    
    const aiError = new AIServiceError('Invalid request', 'INVALID_REQUEST', 'openai', false);
    const mockOperation = vi.fn().mockRejectedValue(aiError);
    
    await act(async () => {
      try {
        await result.current.withErrorHandling(mockOperation);
      } catch (error) {
        expect(error).toBe(aiError);
      }
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.canRetry).toBe(false);
  });
});

describe('Error Recovery Scenarios', () => {
  it('should handle network timeout and retry', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const timeoutError = new Error('Network timeout');
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValue('recovered');
    
    await act(async () => {
      const response = await result.current.withErrorHandling(mockOperation, {
        maxRetries: 1,
        retryDelay: 500,
      });
      
      vi.advanceTimersByTime(500);
      expect(response).toBe('recovered');
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should handle provider unavailable and fallback', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const providerError = new ProviderUnavailableError('OpenAI unavailable', 'openai');
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(providerError)
      .mockResolvedValue('fallback success');
    
    await act(async () => {
      const response = await result.current.withErrorHandling(mockOperation, {
        maxRetries: 1,
        retryDelay: 100,
      });
      
      vi.advanceTimersByTime(100);
      expect(response).toBe('fallback success');
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should handle concurrent error scenarios', async () => {
    const { result } = renderHook(() => useErrorHandling());
    
    const mockOperation1 = vi.fn().mockRejectedValue(new Error('Error 1'));
    const mockOperation2 = vi.fn().mockResolvedValue('Success 2');
    
    await act(async () => {
      // Start first operation that will fail
      const promise1 = result.current.withErrorHandling(mockOperation1, { maxRetries: 0 });
      
      // Start second operation that will succeed
      const promise2 = result.current.withErrorHandling(mockOperation2, { maxRetries: 0 });
      
      try {
        await promise1;
      } catch (error) {
        // Expected to fail
      }
      
      const result2 = await promise2;
      expect(result2).toBe('Success 2');
    });

    expect(mockOperation1).toHaveBeenCalledTimes(1);
    expect(mockOperation2).toHaveBeenCalledTimes(1);
  });
});