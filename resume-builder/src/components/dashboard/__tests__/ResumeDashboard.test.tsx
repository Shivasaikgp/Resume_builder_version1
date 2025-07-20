import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResumeDashboard } from '../ResumeDashboard';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    resumes: [
      {
        id: '1',
        title: 'Software Engineer Resume',
        metadata: {
          tags: ['tech', 'frontend'],
          targetJob: 'Software Engineer',
          targetCompany: 'Google',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        analyses: [{ score: 85 }],
      },
      {
        id: '2',
        title: 'Product Manager Resume',
        metadata: {
          tags: ['product', 'management'],
          targetJob: 'Product Manager',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        analyses: [{ score: 78 }],
      },
    ],
    loading: false,
    error: null,
    fetchResumes: vi.fn(),
    deleteResume: vi.fn(),
    duplicateResume: vi.fn(),
    createResume: vi.fn(),
  }),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('ResumeDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard with resumes', () => {
    render(<ResumeDashboard />);
    
    expect(screen.getByText('Resume Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer Resume')).toBeInTheDocument();
    expect(screen.getByText('Product Manager Resume')).toBeInTheDocument();
  });

  it('should show search input', () => {
    render(<ResumeDashboard />);
    
    const searchInput = screen.getByPlaceholderText(/Search resumes/);
    expect(searchInput).toBeInTheDocument();
  });

  it('should show create new resume button', () => {
    render(<ResumeDashboard />);
    
    const createButton = screen.getByText('New Resume');
    expect(createButton).toBeInTheDocument();
  });

  it('should display resume scores', () => {
    render(<ResumeDashboard />);
    
    expect(screen.getByText('85% Score')).toBeInTheDocument();
    expect(screen.getByText('78% Score')).toBeInTheDocument();
  });

  it('should show view mode toggle buttons', () => {
    render(<ResumeDashboard />);
    
    // Grid and List view buttons should be present
    const buttons = screen.getAllByRole('button');
    const viewButtons = buttons.filter(button => 
      button.getAttribute('class')?.includes('rounded-r-none') || 
      button.getAttribute('class')?.includes('rounded-l-none')
    );
    expect(viewButtons).toHaveLength(2);
  });

  it('should allow resume selection', async () => {
    render(<ResumeDashboard />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    // Click first checkbox
    fireEvent.click(checkboxes[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/1 resume selected/)).toBeInTheDocument();
    });
  });

  it('should show comparison option when multiple resumes selected', async () => {
    render(<ResumeDashboard />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Select two resumes
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    
    await waitFor(() => {
      expect(screen.getByText(/2 resumes selected/)).toBeInTheDocument();
      expect(screen.getByText('Compare')).toBeInTheDocument();
    });
  });
});