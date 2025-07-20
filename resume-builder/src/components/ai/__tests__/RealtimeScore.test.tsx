import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RealtimeScore } from '../RealtimeScore';
import { ResumeData, UserContext } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

describe('RealtimeScore Component', () => {
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
        strengths: ['Good structure', 'Strong action verbs'],
        improvements: ['Add metrics', 'Include keywords'],
        criticalIssues: ['Missing contact information']
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

  it('should render loading state initially', () => {
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockScoreResult
      } as Response), 100))
    );

    render(<RealtimeScore resume={mockResume} />);

    expect(screen.getByText('Calculating score...')).toBeInTheDocument();
  });

  it('should fetch and display score on mount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} context={mockContext} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/analyze?')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Resume Score')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // Overall score
    });
  });

  it('should display score breakdown with progress bars', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Formatting')).toBeInTheDocument();
      expect(screen.getByText('ATS')).toBeInTheDocument();
      expect(screen.getByText('Keywords')).toBeInTheDocument();
    });

    // Check that scores are displayed
    await waitFor(() => {
      expect(screen.getByText('80')).toBeInTheDocument(); // Content score
      expect(screen.getByText('85')).toBeInTheDocument(); // Formatting score
      expect(screen.getByText('90')).toBeInTheDocument(); // ATS score
    });
  });

  it('should display critical issues when present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText('Critical Issues')).toBeInTheDocument();
      expect(screen.getByText('Missing contact information')).toBeInTheDocument();
    });
  });

  it('should display quick wins when present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText('Quick Wins')).toBeInTheDocument();
      expect(screen.getByText('Add metrics')).toBeInTheDocument();
      expect(screen.getByText('Include keywords')).toBeInTheDocument();
    });
  });

  it('should display strengths when present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText('Strengths')).toBeInTheDocument();
      expect(screen.getByText('Good structure')).toBeInTheDocument();
      expect(screen.getByText('Strong action verbs')).toBeInTheDocument();
    });
  });

  it('should update score periodically', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreResult
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockScoreResult,
          data: { ...mockScoreResult.data, overall: 90 }
        })
      } as Response);

    render(<RealtimeScore resume={mockResume} updateInterval={1000} />);

    // Initial fetch
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    // Advance time to trigger update
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument();
    });
  });

  it('should call onScoreUpdate callback when score changes', async () => {
    const onScoreUpdate = vi.fn();
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(
      <RealtimeScore 
        resume={mockResume} 
        onScoreUpdate={onScoreUpdate}
      />
    );

    await waitFor(() => {
      expect(onScoreUpdate).toHaveBeenCalledWith(mockScoreResult.data);
    });
  });

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText(/Scoring Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Scoring failed' })
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText(/Scoring Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch score/)).toBeInTheDocument();
    });
  });

  it('should display "No score available" when no score is returned', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null })
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText('No score available')).toBeInTheDocument();
    });
  });

  it('should include context in API request when provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} context={mockContext} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('context=')
      );
    });
  });

  it('should not include context in API request when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).not.toContain('context=');
    });
  });

  it('should show loading indicator during updates', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockScoreResult
      } as Response)
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockScoreResult
        } as Response), 100))
      );

    render(<RealtimeScore resume={mockResume} updateInterval={1000} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    // Trigger update
    vi.advanceTimersByTime(1000);

    // Should show loading indicator
    expect(screen.getByRole('generic', { hidden: true })).toHaveClass('animate-spin');
  });

  it('should display last updated timestamp', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  it('should use correct score colors based on score value', async () => {
    // Test high score (green)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockScoreResult,
        data: { ...mockScoreResult.data, overall: 90 }
      })
    } as Response);

    const { rerender } = render(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      const scoreElement = screen.getByText('90');
      expect(scoreElement).toHaveClass('text-green-600');
    });

    // Test medium score (yellow)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockScoreResult,
        data: { ...mockScoreResult.data, overall: 65 }
      })
    } as Response);

    rerender(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      const scoreElement = screen.getByText('65');
      expect(scoreElement).toHaveClass('text-yellow-600');
    });

    // Test low score (red)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockScoreResult,
        data: { ...mockScoreResult.data, overall: 45 }
      })
    } as Response);

    rerender(<RealtimeScore resume={mockResume} />);

    await waitFor(() => {
      const scoreElement = screen.getByText('45');
      expect(scoreElement).toHaveClass('text-red-600');
    });
  });

  it('should prevent multiple concurrent requests', async () => {
    vi.mocked(fetch).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockScoreResult
      } as Response), 100))
    );

    render(<RealtimeScore resume={mockResume} updateInterval={50} />);

    // Advance time to trigger multiple updates quickly
    vi.advanceTimersByTime(150);

    await waitFor(() => {
      // Should only have made one request due to loading state check
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});