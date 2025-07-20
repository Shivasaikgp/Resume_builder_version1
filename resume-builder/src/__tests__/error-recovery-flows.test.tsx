import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { ContentSuggestions } from '../components/ai/ContentSuggestions';
import { ResumeAnalysis } from '../components/ai/ResumeAnalysis';
import { AIServiceError, RateLimitError, ProviderUnavailableError } from '../lib/ai/errors';
import { UserContext, ResumeData } from '../types';

// Mock fetch
global.fetch = vi.fn();

// Mock hooks
vi.mock('../hooks/useContentGeneration', () => ({
  useContentGeneration: () => ({
    isLoading: false,
    error: null,
    suggestions: [],
    generateSuggestions: vi.fn(),
    clearError: vi.fn(),
    clearSuggestions: vi.fn(),
  }),
}));

describe('Error Recovery Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('AI Service Error Recovery', () => {
    it('should recover from rate limit errors with proper delay', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const resetTime = new Date(Date.now() + 5000);
      const rateLimitError = new RateLimitError('Rate limited', resetTime, 'openai');
      
      let callCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw rateLimitError;
        }
        return Promise.resolve('success');
      });

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
      expect(result.current.error).toBeNull();
    });

    it('should fallback to alternative provider on service unavailable', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const providerError = new ProviderUnavailableError('OpenAI unavailable', 'openai');
      
      let callCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw providerError;
        }
        // Simulate fallback to Anthropic
        return Promise.resolve('fallback_success');
      });

      await act(async () => {
        const response = await result.current.withErrorHandling(mockOperation, {
          maxRetries: 1,
          retryDelay: 100,
        });
        
        vi.advanceTimersByTime(100);
        expect(response).toBe('fallback_success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const authError = new AIServiceError('Invalid API key', 'AUTHENTICATION_ERROR', 'openai', false);
      const mockOperation = vi.fn().mockRejectedValue(authError);

      await act(async () => {
        try {
          await result.current.withErrorHandling(mockOperation, {
            maxRetries: 3,
          });
        } catch (error) {
          expect(error).toBe(authError);
        }
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('Network Error Recovery', () => {
    it('should retry network timeouts with exponential backoff', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const networkError = new Error('Network timeout');
      
      let callCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw networkError;
        }
        return Promise.resolve('recovered');
      });

      await act(async () => {
        const promise = result.current.withErrorHandling(mockOperation, {
          maxRetries: 3,
          retryDelay: 1000,
          exponentialBackoff: true,
        });
        
        // First retry after 1000ms
        vi.advanceTimersByTime(1000);
        // Second retry after 2000ms (exponential backoff)
        vi.advanceTimersByTime(2000);
        
        const response = await promise;
        expect(response).toBe('recovered');
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle connection refused errors', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const connectionError = new Error('ECONNREFUSED');
      
      let callCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw connectionError;
        }
        return Promise.resolve('reconnected');
      });

      await act(async () => {
        const response = await result.current.withErrorHandling(mockOperation, {
          maxRetries: 1,
          retryDelay: 500,
        });
        
        vi.advanceTimersByTime(500);
        expect(response).toBe('reconnected');
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Error Recovery', () => {
    it('should handle ContentSuggestions error recovery', async () => {
      const mockContext: UserContext = {
        userId: 'user-123',
        profile: {
          industry: 'tech',
          experienceLevel: 'mid',
          targetRoles: ['developer'],
          skills: ['javascript'],
          careerGoals: ['senior developer'],
        },
        preferences: {
          writingStyle: 'professional',
          contentLength: 'detailed',
          focusAreas: ['technical skills'],
        },
        history: {
          interactions: [],
          feedbackPatterns: [],
          improvementAreas: [],
        },
        embedding: [],
      };

      const mockFetch = vi.mocked(fetch);
      
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ suggestions: [] }),
        } as Response);

      render(
        <ContentSuggestions
          context={mockContext}
          section="experience"
          currentContent="Software developer"
        />
      );

      // Click generate suggestions
      const generateButton = screen.getByText('Generate AI Suggestions');
      fireEvent.click(generateButton);

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Should recover
      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });

    it('should handle ResumeAnalysis error recovery', async () => {
      const mockResume: ResumeData = {
        id: 'resume-123',
        userId: 'user-123',
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          location: 'New York, NY',
        },
        sections: [],
        template: {
          id: 'modern',
          name: 'Modern Template',
          layout: {},
          styling: {},
          adaptationRules: [],
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFetch = vi.mocked(fetch);
      
      // First call fails with rate limit, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            data: {
              overallScore: 85,
              breakdown: { content: 80, formatting: 90, atsCompatibility: 85, keywords: 80 },
              strengths: ['Good formatting'],
              improvements: ['Add more keywords'],
              suggestions: [],
            }
          }),
        } as Response);

      render(<ResumeAnalysis resume={mockResume} />);

      // Click full analysis
      const analyzeButton = screen.getByText('Full Analysis');
      fireEvent.click(analyzeButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Should recover and show results
      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide offline functionality when possible', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const offlineError = new Error('Failed to fetch');
      
      const mockOperation = vi.fn().mockImplementation(() => {
        // Simulate offline mode - return cached data
        if (navigator.onLine === false) {
          return Promise.resolve('cached_data');
        }
        throw offlineError;
      });

      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await act(async () => {
        const response = await result.current.withErrorHandling(mockOperation, {
          maxRetries: 0,
        });
        expect(response).toBe('cached_data');
      });
    });

    it('should show appropriate fallback UI for critical errors', async () => {
      const criticalError = new AIServiceError('Service permanently unavailable', 'SERVICE_DOWN', 'openai', false);
      
      const mockContext: UserContext = {
        userId: 'user-123',
        profile: {
          industry: 'tech',
          experienceLevel: 'mid',
          targetRoles: ['developer'],
          skills: ['javascript'],
          careerGoals: ['senior developer'],
        },
        preferences: {
          writingStyle: 'professional',
          contentLength: 'detailed',
          focusAreas: ['technical skills'],
        },
        history: {
          interactions: [],
          feedbackPatterns: [],
          improvementAreas: [],
        },
        embedding: [],
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(criticalError);

      render(
        <ContentSuggestions
          context={mockContext}
          section="experience"
          currentContent="Software developer"
        />
      );

      // Click generate suggestions
      const generateButton = screen.getByText('Generate AI Suggestions');
      fireEvent.click(generateButton);

      // Should show error with no retry option for non-retryable errors
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State Persistence', () => {
    it('should maintain error state across component re-renders', async () => {
      const { result, rerender } = renderHook(() => useErrorHandling());
      
      const testError = new Error('Persistent error');
      
      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toBe(testError);

      // Re-render hook
      rerender();

      expect(result.current.error).toBe(testError);
    });

    it('should clear error state when operation succeeds', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValue('success');

      // First call fails
      await act(async () => {
        try {
          await result.current.withErrorHandling(mockOperation, { maxRetries: 0 });
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.error).toBeTruthy();

      // Second call succeeds
      await act(async () => {
        const response = await result.current.withErrorHandling(mockOperation, { maxRetries: 0 });
        expect(response).toBe('success');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Concurrent Error Handling', () => {
    it('should handle multiple concurrent operations with different error states', async () => {
      const { result } = renderHook(() => useErrorHandling());
      
      const operation1 = vi.fn().mockRejectedValue(new Error('Error 1'));
      const operation2 = vi.fn().mockResolvedValue('Success 2');
      const operation3 = vi.fn().mockRejectedValue(new Error('Error 3'));

      await act(async () => {
        const promises = [
          result.current.withErrorHandling(operation1, { maxRetries: 0 }).catch(e => e),
          result.current.withErrorHandling(operation2, { maxRetries: 0 }),
          result.current.withErrorHandling(operation3, { maxRetries: 0 }).catch(e => e),
        ];

        const results = await Promise.all(promises);
        
        expect(results[0]).toBeInstanceOf(Error);
        expect(results[1]).toBe('Success 2');
        expect(results[2]).toBeInstanceOf(Error);
      });
    });
  });
});