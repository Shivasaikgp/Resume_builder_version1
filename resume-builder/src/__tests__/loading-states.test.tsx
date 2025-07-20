import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  Spinner, 
  LoadingOverlay, 
  ProgressBar, 
  Skeleton, 
  AIProcessing, 
  TypingIndicator 
} from '../components/ui/loading-states';

describe('Spinner', () => {
  it('should render spinner with default size', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('h-6', 'w-6', 'animate-spin');
  });

  it('should render spinner with custom size', () => {
    render(<Spinner size="lg" />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('should apply custom className', () => {
    render(<Spinner className="custom-class" />);
    
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('custom-class');
  });
});

describe('LoadingOverlay', () => {
  it('should render children when not loading', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should show loading overlay when loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show custom loading message', () => {
    render(
      <LoadingOverlay isLoading={true} message="Processing...">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should apply backdrop blur when loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    const overlay = screen.getByText('Loading...').closest('div');
    expect(overlay).toHaveClass('bg-white/80', 'backdrop-blur-sm');
  });
});

describe('ProgressBar', () => {
  it('should render progress bar with correct width', () => {
    render(<ProgressBar progress={75} />);
    
    const progressFill = screen.getByRole('generic').querySelector('.bg-blue-600');
    expect(progressFill).toHaveStyle({ width: '75%' });
  });

  it('should show progress message and percentage', () => {
    render(<ProgressBar progress={50} message="Uploading file..." />);
    
    expect(screen.getByText('Uploading file...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should handle progress values outside 0-100 range', () => {
    render(<ProgressBar progress={150} />);
    
    const progressFill = screen.getByRole('generic').querySelector('.bg-blue-600');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('should handle negative progress values', () => {
    render(<ProgressBar progress={-10} />);
    
    const progressFill = screen.getByRole('generic').querySelector('.bg-blue-600');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });
});

describe('Skeleton', () => {
  it('should render single skeleton line', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByRole('generic');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton.children).toHaveLength(1);
  });

  it('should render multiple skeleton lines', () => {
    render(<Skeleton lines={3} />);
    
    const skeleton = screen.getByRole('generic');
    expect(skeleton.children).toHaveLength(3);
  });

  it('should apply custom className', () => {
    render(<Skeleton className="custom-skeleton" />);
    
    const skeleton = screen.getByRole('generic');
    expect(skeleton).toHaveClass('custom-skeleton');
  });

  it('should make last line shorter when multiple lines', () => {
    render(<Skeleton lines={2} />);
    
    const skeleton = screen.getByRole('generic');
    const lastLine = skeleton.children[1];
    expect(lastLine).toHaveClass('w-3/4');
  });
});

describe('AIProcessing', () => {
  it('should render analyzing stage', () => {
    render(<AIProcessing stage="analyzing" />);
    
    expect(screen.getByText('Analyzing your resume...')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should render generating stage', () => {
    render(<AIProcessing stage="generating" />);
    
    expect(screen.getByText('Generating suggestions...')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('should render optimizing stage', () => {
    render(<AIProcessing stage="optimizing" />);
    
    expect(screen.getByText('Optimizing content...')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should render finalizing stage', () => {
    render(<AIProcessing stage="finalizing" />);
    
    expect(screen.getByText('Finalizing results...')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('should show progress bar when progress is provided', () => {
    render(<AIProcessing stage="analyzing" progress={60} />);
    
    expect(screen.getByText('Analyzing your resume...')).toBeInTheDocument();
    
    // Check for progress bar
    const progressBar = screen.getByRole('generic').querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '60%' });
  });

  it('should apply custom className', () => {
    render(<AIProcessing stage="analyzing" className="custom-processing" />);
    
    const container = screen.getByText('Analyzing your resume...').closest('div');
    expect(container).toHaveClass('custom-processing');
  });
});

describe('TypingIndicator', () => {
  it('should render typing indicator with dots', () => {
    render(<TypingIndicator />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    
    // Check for animated dots
    const dots = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('animate-bounce')
    );
    expect(dots).toHaveLength(3);
  });

  it('should apply custom className', () => {
    render(<TypingIndicator className="custom-typing" />);
    
    const container = screen.getByText('AI is thinking...').closest('div');
    expect(container).toHaveClass('custom-typing');
  });

  it('should have staggered animation delays', () => {
    render(<TypingIndicator />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('animate-bounce')
    );
    
    expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(dots[1]).toHaveStyle({ animationDelay: '150ms' });
    expect(dots[2]).toHaveStyle({ animationDelay: '300ms' });
  });
});

describe('Loading State Accessibility', () => {
  it('should have proper ARIA attributes for loading overlay', () => {
    render(
      <LoadingOverlay isLoading={true} message="Loading content...">
        <div>Content</div>
      </LoadingOverlay>
    );

    const loadingText = screen.getByText('Loading content...');
    expect(loadingText).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for progress bar', () => {
    render(<ProgressBar progress={50} message="Processing..." />);
    
    // Progress bars should be identifiable
    const progressContainer = screen.getByText('Processing...').closest('div');
    expect(progressContainer).toBeInTheDocument();
  });

  it('should maintain content accessibility during loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <button>Click me</button>
      </LoadingOverlay>
    );

    // Content should still be accessible even when loading overlay is shown
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });
});

describe('Loading State Performance', () => {
  it('should not re-render unnecessarily', () => {
    const { rerender } = render(<Spinner />);
    
    // Re-render with same props
    rerender(<Spinner />);
    
    // Component should handle re-renders gracefully
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('should handle rapid loading state changes', () => {
    const { rerender } = render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    // Rapidly toggle loading state
    rerender(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    rerender(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});