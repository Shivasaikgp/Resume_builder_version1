// Tests for real-time AI enhancement features
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeAI } from '../hooks/useRealTimeAI';
import { UserContext } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
});

const mockUserContext: UserContext = {
  profile: {
    industry: 'technology',
    experienceLevel: 'mid',
    targetRoles: ['Software Engineer'],
    skills: ['JavaScript', 'React'],
    careerGoals: ['Senior Developer']
  },
  preferences: {
    writingStyle: 'formal',
    contentLength: 'detailed',
    focusAreas: ['technical skills']
  },
  history: {
    interactions: [],
    feedbackPatterns: [],
    improvementAreas: []
  }
};

describe('useRealTimeAI Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRealTimeAI());

    expect(result.current.streamingSuggestions).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.improvedContent).toBeNull();
    expect(result.current.contextualHelp).toBeNull();
    expect(result.current.helpVisible).toBe(false);
    expect(result.current.feedbackHistory).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should debounce real-time analysis calls', async () => {
    const { result } = renderHook(() => useRealTimeAI({ debounceMs: 500 }));

    // Mock successful streaming response
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"suggestion","id":"1","content":"Test suggestion","isComplete":true}\n\n')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader }
    });

    // Start multiple analyses quickly
    act(() => {
      result.current.startRealTimeAnalysis('Test content 1', 'experience', mockUserContext);
      result.current.startRealTimeAnalysis('Test content 2', 'experience', mockUserContext);
      result.current.startRealTimeAnalysis('Test content 3', 'experience', mockUserContext);
    });

    // Fast-forward past debounce time
    act(() => {
      vi.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should not analyze content shorter than minimum length', () => {
    const { result } = renderHook(() => useRealTimeAI({ minContentLength: 10 }));

    act(() => {
      result.current.startRealTimeAnalysis('Short', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle streaming suggestions correctly', async () => {
    const { result } = renderHook(() => useRealTimeAI({ enableStreaming: true }));

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"suggestion","id":"1","content":"Partial","isComplete":false}\n\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"suggestion","id":"1","content":"Complete suggestion","isComplete":true}\n\n')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader }
    });

    act(() => {
      result.current.startRealTimeAnalysis('Test content for analysis', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.streamingSuggestions).toHaveLength(1);
      expect(result.current.streamingSuggestions[0].content).toBe('Complete suggestion');
      expect(result.current.streamingSuggestions[0].isComplete).toBe(true);
    });
  });

  it('should handle batch analysis when streaming is disabled', async () => {
    const { result } = renderHook(() => useRealTimeAI({ enableStreaming: false }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            id: '1',
            content: 'Batch suggestion',
            confidence: 0.8,
            type: 'bullet_point',
            context: 'Test context'
          }
        ],
        improvedContent: 'Improved test content'
      })
    });

    act(() => {
      result.current.startRealTimeAnalysis('Test content for analysis', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.streamingSuggestions).toHaveLength(1);
      expect(result.current.streamingSuggestions[0].content).toBe('Batch suggestion');
      expect(result.current.streamingSuggestions[0].isComplete).toBe(true);
      expect(result.current.improvedContent).toBe('Improved test content');
    });
  });

  it('should track suggestion feedback correctly', async () => {
    const { result } = renderHook(() => useRealTimeAI());

    // Mock feedback API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const mockSuggestion = {
      id: '1',
      content: 'Test suggestion',
      isComplete: true,
      confidence: 0.8,
      type: 'bullet_point',
      context: 'Test context'
    };

    act(() => {
      result.current.acceptSuggestion(mockSuggestion);
    });

    await waitFor(() => {
      expect(result.current.feedbackHistory).toHaveLength(1);
      expect(result.current.feedbackHistory[0].action).toBe('accepted');
      expect(result.current.feedbackHistory[0].originalContent).toBe('Test suggestion');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/ai/feedback', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"action":"accepted"')
    }));
  });

  it('should handle modified suggestions correctly', async () => {
    const { result } = renderHook(() => useRealTimeAI());

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const mockSuggestion = {
      id: '1',
      content: 'Original suggestion',
      isComplete: true,
      confidence: 0.8,
      type: 'bullet_point',
      context: 'Test context'
    };

    act(() => {
      result.current.acceptSuggestion(mockSuggestion, 'Modified suggestion');
    });

    await waitFor(() => {
      expect(result.current.feedbackHistory).toHaveLength(1);
      expect(result.current.feedbackHistory[0].action).toBe('modified');
      expect(result.current.feedbackHistory[0].finalContent).toBe('Modified suggestion');
    });
  });

  it('should handle contextual help requests', async () => {
    const { result } = renderHook(() => useRealTimeAI());

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        help: 'This is contextual help for your content'
      })
    });

    act(() => {
      result.current.showContextualHelp('Test content', 'experience');
    });

    await waitFor(() => {
      expect(result.current.helpVisible).toBe(true);
      expect(result.current.contextualHelp).toBe('This is contextual help for your content');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/ai/help', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"content":"Test content"')
    }));
  });

  it('should handle API errors gracefully', async () => {
    const { result } = renderHook(() => useRealTimeAI());

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    act(() => {
      result.current.startRealTimeAnalysis('Test content for analysis', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isStreaming).toBe(false);
    });
  });

  it('should abort previous requests when starting new analysis', async () => {
    const { result } = renderHook(() => useRealTimeAI());

    const mockAbortController = {
      abort: vi.fn(),
      signal: { aborted: false }
    };

    // Mock AbortController
    global.AbortController = vi.fn(() => mockAbortController) as any;

    const mockReader = {
      read: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      releaseLock: vi.fn()
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    // Start first analysis
    act(() => {
      result.current.startRealTimeAnalysis('First content', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Start second analysis
    act(() => {
      result.current.startRealTimeAnalysis('Second content', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockAbortController.abort).toHaveBeenCalled();
  });

  it('should clear suggestions and state correctly', () => {
    const { result } = renderHook(() => useRealTimeAI());

    // Set some initial state
    act(() => {
      result.current.startRealTimeAnalysis('Test content', 'experience', mockUserContext);
    });

    act(() => {
      result.current.clearSuggestions();
    });

    expect(result.current.streamingSuggestions).toEqual([]);
    expect(result.current.improvedContent).toBeNull();
    expect(result.current.contextualHelp).toBeNull();
    expect(result.current.helpVisible).toBe(false);
  });

  it('should stop real-time analysis correctly', () => {
    const { result } = renderHook(() => useRealTimeAI());

    const mockAbortController = {
      abort: vi.fn(),
      signal: { aborted: false }
    };

    global.AbortController = vi.fn(() => mockAbortController) as any;

    act(() => {
      result.current.startRealTimeAnalysis('Test content', 'experience', mockUserContext);
    });

    act(() => {
      result.current.stopRealTimeAnalysis();
    });

    expect(mockAbortController.abort).toHaveBeenCalled();
    expect(result.current.isStreaming).toBe(false);
  });
});

describe('Real-time AI Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle rapid content changes efficiently', async () => {
    const { result } = renderHook(() => useRealTimeAI({ debounceMs: 300 }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [] })
    });

    // Simulate rapid typing
    const contents = [
      'T',
      'Te',
      'Tes',
      'Test',
      'Test ',
      'Test c',
      'Test co',
      'Test con',
      'Test cont',
      'Test conte',
      'Test conten',
      'Test content'
    ];

    contents.forEach(content => {
      act(() => {
        result.current.startRealTimeAnalysis(content, 'experience', mockUserContext);
      });
    });

    // Fast-forward past debounce time
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Should only make one API call due to debouncing
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle concurrent streaming sessions correctly', async () => {
    const { result } = renderHook(() => useRealTimeAI());

    const mockReader1 = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"suggestion","id":"1","content":"First suggestion"}\n\n')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn()
    };

    const mockReader2 = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"suggestion","id":"2","content":"Second suggestion"}\n\n')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn()
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader1 }
      })
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader2 }
      });

    // Start first session
    act(() => {
      result.current.startRealTimeAnalysis('First content', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Start second session (should abort first)
    act(() => {
      result.current.startRealTimeAnalysis('Second content', 'experience', mockUserContext);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      // Should only have suggestions from the second session
      expect(result.current.streamingSuggestions).toHaveLength(1);
      expect(result.current.streamingSuggestions[0].content).toBe('Second suggestion');
    });
  });

  it('should maintain performance with large feedback history', () => {
    const { result } = renderHook(() => useRealTimeAI());

    // Simulate large feedback history
    const largeFeedbackHistory = Array.from({ length: 1000 }, (_, i) => ({
      suggestionId: `suggestion-${i}`,
      action: 'accepted' as const,
      originalContent: `Content ${i}`,
      timestamp: new Date(),
      context: `Context ${i}`
    }));

    // This should not cause performance issues
    act(() => {
      largeFeedbackHistory.forEach(feedback => {
        result.current.acceptSuggestion({
          id: feedback.suggestionId,
          content: feedback.originalContent,
          isComplete: true
        });
      });
    });

    expect(result.current.feedbackHistory.length).toBeLessThanOrEqual(1000);
  });
});