import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useResumeAnalysis } from '../useResumeAnalysis';
import { ResumeData, UserContext } from '../../types';

// Mock fetch
global.fetch = vi.fn();

describe('useResumeAnalysis Hook', () => {
  const mockResume: ResumeData = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      location: 'New York, NY'
    },
    sections: [
      {
        type: 'experience',
        title: 'Work Experience',
        items: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'New York, NY',
            startDate: '2022-01',
            endDate: '2023-12',
            description: [
              'Developed web applications using React and Node.js',
              'Improved system performance by 25%'
            ]
          }
        ],
        order: 1,
        visible: true
      }
    ]
  };

  const mockContext: UserContext = {
    profile: {
      industry: 'technology',
      experienceLevel: 'mid',
      targetRoles: ['Software Engineer'],
      skills: ['JavaScript', 'React'],
      careerGoals: ['Technical Leadership']
    }
  };

  const mockAnalysisResult = {
    success: true,
    data: {
      overallScore: 85,
      breakdown: {
        content: 80,
        formatting: 85,
        atsCompatibility: 90,
        keywords: 85
      },
      suggestions: [
        {
          type: 'content',
          priority: 'high',
          message: 'Add more quantified achievements',
          section: 'experience'
        }
      ],
      strengths: ['Good structure'],
      improvements: ['Add metrics']
    }
  };

  const mockScoreResult = {
    success: true,
    data: {
      overall: 85,
      breakdown: {
        content: 80,
        formatting: 85,
        atsCompatibility: 90,
        keywords: 85
      },
      details: {
        strengths: ['Good structure'],
        improvements: ['Add metrics'],
        criticalIssues: []
      }
    }
  };

  const mockATSResult = {
    success: true,
    data: {
      atsResult: {
        score: 90,
        keywords: {
          found: ['software development'],
          missing: ['agile'],
          density: { 'software development': 2 }
        },
        formatting: {
          issues: [],
          recommendations: ['Use standard headings']
        }
      }
    }
  };

  beforeEach(() => {
    vi.mocked(fetch).mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useResumeAnalysis());

    expect(result.current.analysis).toBeNull();
    expect(result.current.score).toBeNull();
    expect(result.current.atsResult).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('analyzeResume', () => {
    it('should perform full resume analysis', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.analyzeResume(mockResume, mockContext);
      });

      expect(fetch).toHaveBeenCalledWith('/api/ai/analyze', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: mockResume,
          context: mockContext,
          options: {
            includeATSCheck: true,
            includeContentAnalysis: true,
            includeKeywordAnalysis: true,
            priorityThreshold: 'medium'
          }
        }),
        signal: expect.any(AbortSignal)
      }));

      expect(result.current.analysis).toEqual(mockAnalysisResult.data);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle analysis with custom options', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      const customOptions = {
        includeATSCheck: false,
        priorityThreshold: 'high' as const
      };

      await act(async () => {
        await result.current.analyzeResume(mockResume, mockContext, customOptions);
      });

      expect(fetch).toHaveBeenCalledWith('/api/ai/analyze', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: mockResume,
          context: mockContext,
          options: {
            includeATSCheck: false,
            includeContentAnalysis: true,
            includeKeywordAnalysis: true,
            priorityThreshold: 'high'
          }
        }),
        signal: expect.any(AbortSignal)
      }));
    });

    it('should set loading state during analysis', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockAnalysisResult
        } as Response), 100))
      );

      const { result } = renderHook(() => useResumeAnalysis());

      act(() => {
        result.current.analyzeResume(mockResume);
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle analysis errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Analysis failed' })
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.analyzeResume(mockResume);
      });

      expect(result.current.error).toBe('Analysis failed');
      expect(result.current.analysis).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.analyzeResume(mockResume);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.analysis).toBeNull();
    });

    it('should cancel previous request when new one is made', async () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      };

      vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any);

      vi.mocked(fetch)
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: async () => mockAnalysisResult
          } as Response), 200))
        )
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalysisResult
        } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      // Start first request
      act(() => {
        result.current.analyzeResume(mockResume);
      });

      // Start second request before first completes
      act(() => {
        result.current.analyzeResume(mockResume);
      });

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('scoreResume', () => {
    it('should score resume successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.scoreResume(mockResume, mockContext);
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/analyze?')
      );

      expect(result.current.score).toEqual(mockScoreResult.data);
      expect(result.current.error).toBeNull();
    });

    it('should handle scoring without context', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.scoreResume(mockResume);
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).not.toContain('context=');
    });

    it('should handle scoring errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Scoring failed' })
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.scoreResume(mockResume);
      });

      expect(result.current.error).toBe('Scoring failed');
      expect(result.current.score).toBeNull();
    });
  });

  describe('checkATS', () => {
    it('should perform ATS check successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockATSResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.checkATS(mockResume);
      });

      expect(fetch).toHaveBeenCalledWith('/api/ai/ats-check', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: mockResume
        }),
        signal: expect.any(AbortSignal)
      }));

      expect(result.current.atsResult).toEqual(mockATSResult.data.atsResult);
    });

    it('should perform ATS check with job description', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockATSResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());
      const jobDescription = 'Looking for a software engineer';

      await act(async () => {
        await result.current.checkATS(mockResume, jobDescription);
      });

      expect(fetch).toHaveBeenCalledWith('/api/ai/ats-check', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: mockResume,
          jobDescription
        }),
        signal: expect.any(AbortSignal)
      }));
    });

    it('should handle ATS check errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ATS check failed'));

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.checkATS(mockResume);
      });

      expect(result.current.error).toBe('ATS check failed');
      expect(result.current.atsResult).toBeNull();
    });
  });

  describe('clearResults', () => {
    it('should clear all results and error state', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      // Set some state first
      await act(async () => {
        await result.current.analyzeResume(mockResume);
      });

      expect(result.current.analysis).not.toBeNull();

      // Clear results
      act(() => {
        result.current.clearResults();
      });

      expect(result.current.analysis).toBeNull();
      expect(result.current.score).toBeNull();
      expect(result.current.atsResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Real-time scoring', () => {
    it('should enable real-time scoring with interval', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoreResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      act(() => {
        result.current.enableRealTimeScoring(mockResume, mockContext, 1000);
      });

      // Initial call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // Advance time to trigger interval
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      // Advance time again
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should disable real-time scoring', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoreResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      // Enable real-time scoring
      act(() => {
        result.current.enableRealTimeScoring(mockResume, mockContext, 1000);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // Disable real-time scoring
      act(() => {
        result.current.disableRealTimeScoring();
      });

      // Advance time - should not trigger more calls
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear existing interval when enabling new real-time scoring', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockScoreResult
      } as Response);

      const { result } = renderHook(() => useResumeAnalysis());

      // Enable first interval
      act(() => {
        result.current.enableRealTimeScoring(mockResume, mockContext, 1000);
      });

      // Enable second interval with different settings
      act(() => {
        result.current.enableRealTimeScoring(mockResume, mockContext, 500);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2); // Initial calls for both
      });

      // Advance by 500ms - should trigger the new interval
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals and abort controllers on unmount', () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      };

      vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any);

      const { result, unmount } = renderHook(() => useResumeAnalysis());

      // Enable real-time scoring
      act(() => {
        result.current.enableRealTimeScoring(mockResume);
      });

      // Start an analysis
      act(() => {
        result.current.analyzeResume(mockResume);
      });

      // Unmount component
      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Abort handling', () => {
    it('should not update state when request is aborted', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';

      vi.mocked(fetch).mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useResumeAnalysis());

      await act(async () => {
        await result.current.analyzeResume(mockResume);
      });

      // Should not set error state for aborted requests
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});