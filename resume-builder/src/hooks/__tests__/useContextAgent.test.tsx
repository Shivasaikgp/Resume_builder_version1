// Context Agent Hook Tests
// Tests for React hooks that integrate with the context management system

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContextAgent, useInteractionTracking, useRecommendations } from '../useContextAgent';
import { UserContext, UserInteraction, ResumeData } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useContextAgent', () => {
  const mockUserContext: UserContext = {
    profile: {
      industry: 'technology',
      experienceLevel: 'mid',
      targetRoles: ['Software Engineer'],
      skills: ['JavaScript', 'React'],
      careerGoals: ['Senior Developer'],
    },
    preferences: {
      writingStyle: 'technical',
      contentLength: 'detailed',
      focusAreas: ['technical_skills'],
    },
    history: {
      interactions: [],
      feedbackPatterns: [],
      improvementAreas: [],
    },
  };

  const mockRecommendations = [
    {
      id: 'rec-1',
      type: 'content' as const,
      title: 'Add Quantified Achievements',
      description: 'Include specific numbers in your experience descriptions.',
      confidence: 0.9,
      reasoning: 'Quantified achievements improve resume impact',
      actionable: true,
      category: 'content_improvement',
      priority: 'high' as const,
    },
    {
      id: 'rec-2',
      type: 'template' as const,
      title: 'Optimize for ATS',
      description: 'Ensure your resume is ATS-friendly.',
      confidence: 0.8,
      reasoning: 'ATS optimization improves visibility',
      actionable: true,
      category: 'formatting',
      priority: 'medium' as const,
    },
  ];

  const mockInsights = [
    {
      type: 'pattern' as const,
      insight: 'User consistently accepts content suggestions',
      confidence: 0.85,
      evidence: ['suggestion_accepted', 'suggestion_accepted'],
      actionable: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useContextAgent hook', () => {
    it('should build context on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, context: mockUserContext }),
      });

      const { result } = renderHook(() => useContextAgent());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userContext).toEqual(mockUserContext);
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should handle context building errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.userContext).toBeNull();
    });

    it('should update context with interaction', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Context updated' }),
        });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const interaction: UserInteraction = {
        type: 'suggestion_accepted',
        timestamp: new Date().toISOString(),
        data: { suggestionType: 'content' },
      };

      await act(async () => {
        await result.current.updateContext(interaction);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction }),
      });
    });

    it('should get recommendations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.getRecommendations();
      });

      expect(result.current.recommendations).toEqual(mockRecommendations);
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context/recommendations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should get recommendations with resume context', async () => {
      const mockResume: ResumeData = {
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        sections: [],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.getRecommendations(mockResume);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentResume: mockResume }),
      });
    });

    it('should get insights', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, insights: mockInsights }),
        });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.getInsights();
      });

      expect(result.current.insights).toEqual(mockInsights);
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context/insights', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should clear errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('useInteractionTracking hook', () => {
    it('should track user interactions', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Context updated' }),
        });

      const { result } = renderHook(() => useInteractionTracking());

      await act(async () => {
        await result.current.trackInteraction('suggestion_accepted', {
          suggestionType: 'content',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"type":"suggestion_accepted"'),
      });
    });

    it('should handle tracking errors gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useInteractionTracking());

      // Should not throw
      await act(async () => {
        await result.current.trackInteraction('content_generated');
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('useRecommendations hook', () => {
    const mockResume: ResumeData = {
      personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
      sections: [],
    };

    it('should get recommendations on mount', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        });

      const { result } = renderHook(() => useRecommendations(mockResume));

      await waitFor(() => {
        expect(result.current.recommendations).toEqual(mockRecommendations);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentResume: mockResume }),
      });
    });

    it('should accept recommendations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Context updated' }),
        });

      const { result } = renderHook(() => useRecommendations(mockResume));

      await waitFor(() => {
        expect(result.current.recommendations).toHaveLength(2);
      });

      await act(async () => {
        await result.current.acceptRecommendation('rec-1');
      });

      expect(result.current.recommendations).toHaveLength(1);
      expect(result.current.acceptedRecommendations).toContain('rec-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"type":"suggestion_accepted"'),
      });
    });

    it('should reject recommendations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Context updated' }),
        });

      const { result } = renderHook(() => useRecommendations(mockResume));

      await waitFor(() => {
        expect(result.current.recommendations).toHaveLength(2);
      });

      await act(async () => {
        await result.current.rejectRecommendation('rec-2');
      });

      expect(result.current.recommendations).toHaveLength(1);
      expect(result.current.rejectedRecommendations).toContain('rec-2');
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"type":"suggestion_rejected"'),
      });
    });

    it('should refresh recommendations', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: [mockRecommendations[0]] }),
        });

      const { result } = renderHook(() => useRecommendations(mockResume));

      await waitFor(() => {
        expect(result.current.recommendations).toHaveLength(2);
      });

      await act(async () => {
        await result.current.refreshRecommendations();
      });

      expect(result.current.recommendations).toHaveLength(1);
    });

    it('should handle recommendation errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useRecommendations(mockResume));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.recommendations).toEqual([]);
    });

    it('should update recommendations when resume changes', async () => {
      const newResume: ResumeData = {
        personalInfo: { fullName: 'Jane Doe', email: 'jane@example.com' },
        sections: [],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: mockRecommendations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, recommendations: [mockRecommendations[0]] }),
        });

      const { result, rerender } = renderHook(
        ({ resume }) => useRecommendations(resume),
        { initialProps: { resume: mockResume } }
      );

      await waitFor(() => {
        expect(result.current.recommendations).toHaveLength(2);
      });

      rerender({ resume: newResume });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.userContext).toBeNull();
      });
    });

    it('should handle malformed responses gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during context building', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(promise);

      const { result } = renderHook(() => useContextAgent());

      expect(result.current.isLoading).toBe(true);

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true, context: mockUserContext }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should show loading state during recommendation fetching', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, context: mockUserContext }),
        });

      let resolveRecommendations: (value: any) => void;
      const recommendationsPromise = new Promise(resolve => {
        resolveRecommendations = resolve;
      });

      const { result } = renderHook(() => useContextAgent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockReturnValueOnce(recommendationsPromise);

      act(() => {
        result.current.getRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      resolveRecommendations!({
        ok: true,
        json: async () => ({ success: true, recommendations: mockRecommendations }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});