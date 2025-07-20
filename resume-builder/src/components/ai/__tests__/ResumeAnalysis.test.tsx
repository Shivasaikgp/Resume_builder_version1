import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResumeAnalysis } from '../ResumeAnalysis';
import { ResumeData, UserContext } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

describe('ResumeAnalysis Component', () => {
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
        },
        {
          type: 'keywords',
          priority: 'medium',
          message: 'Include more industry keywords',
          section: 'skills'
        }
      ],
      strengths: ['Good structure', 'Strong action verbs'],
      improvements: ['Add metrics', 'Include keywords']
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
          found: ['software development', 'project management'],
          missing: ['agile', 'scrum'],
          density: { 'software development': 2 }
        },
        formatting: {
          issues: [],
          recommendations: ['Use standard section headings']
        }
      }
    }
  };

  beforeEach(() => {
    vi.mocked(fetch).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render analysis component with initial state', () => {
    render(<ResumeAnalysis resume={mockResume} />);

    expect(screen.getByText('Resume Analysis')).toBeInTheDocument();
    expect(screen.getByText('Quick Score')).toBeInTheDocument();
    expect(screen.getByText('ATS Check')).toBeInTheDocument();
    expect(screen.getByText('Full Analysis')).toBeInTheDocument();
  });

  it('should perform full analysis when button is clicked', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResult
    } as Response);

    const onAnalysisComplete = vi.fn();
    render(
      <ResumeAnalysis 
        resume={mockResume} 
        context={mockContext}
        onAnalysisComplete={onAnalysisComplete}
      />
    );

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/ai/analyze', {
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
        })
      });
    });

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument(); // Overall score
      expect(onAnalysisComplete).toHaveBeenCalledWith(mockAnalysisResult.data);
    });
  });

  it('should perform quick score when button is clicked', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} context={mockContext} />);

    const quickScoreButton = screen.getByText('Quick Score');
    fireEvent.click(quickScoreButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/analyze?')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument(); // Overall score
    });
  });

  it('should perform ATS check when button is clicked', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockATSResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const atsCheckButton = screen.getByText('ATS Check');
    fireEvent.click(atsCheckButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/ai/ats-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume: mockResume })
      });
    });

    // Switch to ATS tab to see results
    const atsTab = screen.getByText('ATS Check');
    fireEvent.click(atsTab);

    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument(); // ATS score
    });
  });

  it('should switch between tabs correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    // Perform analysis first
    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    // Switch to detailed tab
    const detailedTab = screen.getByText('Detailed Analysis');
    fireEvent.click(detailedTab);

    expect(screen.getByText('Detailed Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Add more quantified achievements')).toBeInTheDocument();

    // Switch back to overview
    const overviewTab = screen.getByText('Overview');
    fireEvent.click(overviewTab);

    expect(screen.getByText('Overall Score')).toBeInTheDocument();
  });

  it('should display error message when analysis fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Analysis failed' })
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Analysis failed/)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Analysis failed/)).toBeInTheDocument();
    });
  });

  it('should display score breakdown correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Format')).toBeInTheDocument();
      expect(screen.getByText('ATS')).toBeInTheDocument();
      expect(screen.getByText('Keywords')).toBeInTheDocument();
    });
  });

  it('should display strengths and improvements', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      expect(screen.getByText('Strengths')).toBeInTheDocument();
      expect(screen.getByText('Priority Improvements')).toBeInTheDocument();
      expect(screen.getByText('Good structure')).toBeInTheDocument();
      expect(screen.getByText('Add metrics')).toBeInTheDocument();
    });
  });

  it('should display detailed suggestions with priority levels', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      const detailedTab = screen.getByText('Detailed Analysis');
      fireEvent.click(detailedTab);
    });

    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('experience')).toBeInTheDocument();
      expect(screen.getByText('skills')).toBeInTheDocument();
    });
  });

  it('should enable real-time mode', async () => {
    vi.useFakeTimers();
    
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockScoreResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} realTimeMode={true} />);

    // Fast-forward time to trigger real-time update
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it('should disable buttons during loading', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockAnalysisResult
      } as Response), 100))
    );

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    expect(fullAnalysisButton).toBeDisabled();
    expect(screen.getByText('Quick Score')).toBeDisabled();
    expect(screen.getByText('ATS Check')).toBeDisabled();

    await waitFor(() => {
      expect(fullAnalysisButton).not.toBeDisabled();
    });
  });

  it('should display ATS keyword analysis', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockATSResult
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const atsCheckButton = screen.getByText('ATS Check');
    fireEvent.click(atsCheckButton);

    // Switch to ATS tab
    const atsTab = screen.getByText('ATS Check');
    fireEvent.click(atsTab);

    await waitFor(() => {
      expect(screen.getByText('Found Keywords')).toBeInTheDocument();
      expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
      expect(screen.getByText('software development')).toBeInTheDocument();
      expect(screen.getByText('agile')).toBeInTheDocument();
    });
  });

  it('should handle empty analysis results', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          overallScore: 0,
          breakdown: { content: 0, formatting: 0, atsCompatibility: 0, keywords: 0 },
          suggestions: [],
          strengths: [],
          improvements: []
        }
      })
    } as Response);

    render(<ResumeAnalysis resume={mockResume} />);

    const fullAnalysisButton = screen.getByText('Full Analysis');
    fireEvent.click(fullAnalysisButton);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Overall score
    });
  });
});