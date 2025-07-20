import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobOptimization } from '../JobOptimization';
import { ResumeData } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

describe('JobOptimization Component', () => {
  const mockResume: ResumeData = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john.doe@example.com'
    },
    sections: [
      {
        type: 'experience',
        title: 'Experience',
        items: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            startDate: '2022-01',
            description: ['Developed applications using React']
          }
        ],
        visible: true
      }
    ]
  };

  const mockJobAnalysis = {
    keywords: {
      technical: ['React', 'TypeScript', 'JavaScript'],
      soft: ['communication', 'teamwork'],
      industry: ['software development'],
      tools: ['Git', 'Jest'],
      certifications: [],
      actionVerbs: ['develop', 'implement'],
      buzzwords: ['scalable', 'modern']
    },
    requirements: {
      mustHave: ['React experience'],
      niceToHave: ['TypeScript knowledge'],
      experienceLevel: 'mid' as const,
      yearsRequired: 3,
      educationLevel: "Bachelor's degree"
    },
    skills: {
      technical: [],
      soft: [],
      tools: [],
      missing: [],
      priority: 'medium' as const
    },
    experience: {
      relevantExperience: [],
      missingExperience: [],
      transferableSkills: [],
      recommendedHighlights: []
    },
    culture: {
      values: ['innovation'],
      workStyle: ['agile'],
      environment: 'startup',
      teamStructure: 'cross-functional'
    }
  };

  const mockOptimization = {
    keywordOptimization: [
      {
        keyword: 'TypeScript',
        importance: 'critical' as const,
        suggestedPlacement: ['Skills section'],
        currentUsage: 0,
        recommendedUsage: 2
      }
    ],
    contentEnhancements: [
      {
        section: 'experience',
        type: 'modify' as const,
        suggestion: 'Add TypeScript to experience descriptions',
        reasoning: 'TypeScript is a critical skill for this role',
        impact: 'high' as const
      }
    ],
    structuralChanges: [],
    priorityActions: [
      {
        action: 'Add TypeScript to Skills section',
        reasoning: 'Critical keyword missing from resume',
        impact: 'high' as const,
        effort: 'low' as const,
        order: 1
      }
    ],
    matchScore: 75
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders job description input', () => {
    render(<JobOptimization resume={mockResume} />);
    
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/paste the job description here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze job/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /optimize resume/i })).toBeInTheDocument();
  });

  it('disables buttons when job description is empty', () => {
    render(<JobOptimization resume={mockResume} />);
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    const optimizeButton = screen.getByRole('button', { name: /optimize resume/i });
    
    expect(analyzeButton).toBeDisabled();
    expect(optimizeButton).toBeDisabled();
  });

  it('enables buttons when job description is entered', () => {
    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer needed' } });
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    const optimizeButton = screen.getByRole('button', { name: /optimize resume/i });
    
    expect(analyzeButton).not.toBeDisabled();
    expect(optimizeButton).not.toBeDisabled();
  });

  it('analyzes job description successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockJobAnalysis
      })
    } as Response);

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    fireEvent.click(analyzeButton);
    
    expect(screen.getByText(/analyzing.../i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/job analysis/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText(/mid level/i)).toBeInTheDocument();
  });

  it('optimizes resume successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOptimization
      })
    } as Response);

    const onOptimizationComplete = vi.fn();
    render(
      <JobOptimization 
        resume={mockResume} 
        onOptimizationComplete={onOptimizationComplete}
      />
    );
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const optimizeButton = screen.getByRole('button', { name: /optimize resume/i });
    fireEvent.click(optimizeButton);
    
    expect(screen.getByText(/optimizing.../i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/resume match score/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/priority actions/i)).toBeInTheDocument();
    expect(screen.getByText(/missing keywords/i)).toBeInTheDocument();
    expect(screen.getByText(/content suggestions/i)).toBeInTheDocument();
    
    expect(onOptimizationComplete).toHaveBeenCalledWith(mockOptimization);
  });

  it('displays error when analysis fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Analysis failed'
      })
    } as Response);

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    fireEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to analyze job description/i)).toBeInTheDocument();
    });
  });

  it('displays error when optimization fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const optimizeButton = screen.getByRole('button', { name: /optimize resume/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('clears results when clear button is clicked', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockJobAnalysis
      })
    } as Response);

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    fireEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/job analysis/i)).toBeInTheDocument();
    });
    
    const clearButton = screen.getByRole('button', { name: /clear results/i });
    fireEvent.click(clearButton);
    
    expect(screen.queryByText(/job analysis/i)).not.toBeInTheDocument();
  });

  it('shows validation error for empty job description', () => {
    render(<JobOptimization resume={mockResume} />);
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    
    // Button should be disabled when job description is empty
    expect(analyzeButton).toBeDisabled();
  });

  it('displays match score with appropriate styling', async () => {
    const mockFetch = vi.mocked(fetch);
    
    // Test high score
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...mockOptimization, matchScore: 85 }
      })
    } as Response);

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const optimizeButton = screen.getByRole('button', { name: /optimize resume/i });
    fireEvent.click(optimizeButton);
    
    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText(/excellent match!/i)).toBeInTheDocument();
    });
  });

  it('categorizes keywords correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockJobAnalysis
      })
    } as Response);

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const analyzeButton = screen.getByRole('button', { name: /analyze job/i });
    fireEvent.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/key technologies/i)).toBeInTheDocument();
      expect(screen.getByText(/soft skills/i)).toBeInTheDocument();
      expect(screen.getByText(/tools & frameworks/i)).toBeInTheDocument();
    });
    
    // Check that keywords are displayed in appropriate sections
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('communication')).toBeInTheDocument();
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('handles loading states correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    
    // Mock a delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: mockOptimization })
        } as Response), 100)
      )
    );

    render(<JobOptimization resume={mockResume} />);
    
    const textarea = screen.getByPlaceholderText(/paste the job description here/i);
    fireEvent.change(textarea, { target: { value: 'React developer position' } });
    
    const optimizeButton = screen.getByRole('button', { name: /optimize resume/i });
    fireEvent.click(optimizeButton);
    
    // Check loading state
    expect(screen.getByText(/optimizing.../i)).toBeInTheDocument();
    expect(optimizeButton).toBeDisabled();
    expect(textarea).toBeDisabled();
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/resume match score/i)).toBeInTheDocument();
    });
    
    // Check that loading state is cleared
    expect(screen.queryByText(/optimizing.../i)).not.toBeInTheDocument();
    expect(optimizeButton).not.toBeDisabled();
    expect(textarea).not.toBeDisabled();
  });
});