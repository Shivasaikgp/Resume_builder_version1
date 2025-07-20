import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackCollector, QuickFeedback, FeedbackSummary } from '../components/feedback/FeedbackCollector';

// Mock fetch
global.fetch = vi.fn();

describe('FeedbackCollector', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render feedback form correctly', () => {
    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('How helpful was this suggestion?')).toBeInTheDocument();
    expect(screen.getAllByText('⭐')).toHaveLength(5);
    expect(screen.getByPlaceholderText('Tell us more about your experience...')).toBeInTheDocument();
  });

  it('should handle rating selection', async () => {
    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const stars = screen.getAllByText('⭐');
    fireEvent.click(stars[3]); // Click 4th star (rating 4)

    await waitFor(() => {
      expect(screen.getByText('Very Good')).toBeInTheDocument();
    });
  });

  it('should submit feedback with rating and comment', async () => {
    render(
      <FeedbackCollector
        type="suggestion"
        suggestionId="test-suggestion-id"
        section="experience"
        content="test content"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Select rating
    const stars = screen.getAllByText('⭐');
    fireEvent.click(stars[4]); // 5 stars

    // Add comment
    const commentInput = screen.getByPlaceholderText('Tell us more about your experience...');
    fireEvent.change(commentInput, { target: { value: 'Great suggestion!' } });

    // Submit
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        type: 'suggestion',
        rating: 5,
        comment: 'Great suggestion!',
        context: {
          suggestionId: 'test-suggestion-id',
          section: 'experience',
          content: 'test content',
          timestamp: expect.any(Date),
        },
      });
    });
  });

  it('should not submit without rating', () => {
    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Submit Feedback');
    expect(submitButton).toBeDisabled();
  });

  it('should handle cancel action', () => {
    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should render compact version', () => {
    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
        compact={true}
      />
    );

    expect(screen.getByText('Rate:')).toBeInTheDocument();
    expect(screen.getAllByText('⭐')).toHaveLength(5);
    expect(screen.queryByText('How helpful was this suggestion?')).not.toBeInTheDocument();
  });

  it('should show loading state during submission', async () => {
    const slowSubmit = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={slowSubmit}
      />
    );

    // Select rating and submit
    const stars = screen.getAllByText('⭐');
    fireEvent.click(stars[2]);
    
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });
});

describe('QuickFeedback', () => {
  const mockOnFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render quick feedback buttons', () => {
    render(<QuickFeedback onFeedback={mockOnFeedback} />);

    expect(screen.getByText('Helpful?')).toBeInTheDocument();
    expect(screen.getByTitle('Yes, helpful')).toBeInTheDocument();
    expect(screen.getByTitle('Not helpful')).toBeInTheDocument();
  });

  it('should handle positive feedback', () => {
    render(<QuickFeedback onFeedback={mockOnFeedback} />);

    const thumbsUp = screen.getByTitle('Yes, helpful');
    fireEvent.click(thumbsUp);

    expect(mockOnFeedback).toHaveBeenCalledWith(5);
  });

  it('should handle negative feedback', () => {
    render(<QuickFeedback onFeedback={mockOnFeedback} />);

    const thumbsDown = screen.getByTitle('Not helpful');
    fireEvent.click(thumbsDown);

    expect(mockOnFeedback).toHaveBeenCalledWith(2);
  });

  it('should show thank you message after feedback', async () => {
    render(<QuickFeedback onFeedback={mockOnFeedback} />);

    const thumbsUp = screen.getByTitle('Yes, helpful');
    fireEvent.click(thumbsUp);

    await waitFor(() => {
      expect(screen.getByText('✓ Thanks for your feedback!')).toBeInTheDocument();
    });
  });
});

describe('FeedbackSummary', () => {
  it('should render feedback summary correctly', () => {
    render(
      <FeedbackSummary
        averageRating={4.2}
        totalFeedback={15}
      />
    );

    expect(screen.getByText('4.2 (15 reviews)')).toBeInTheDocument();
  });

  it('should render singular review text', () => {
    render(
      <FeedbackSummary
        averageRating={5.0}
        totalFeedback={1}
      />
    );

    expect(screen.getByText('5.0 (1 review)')).toBeInTheDocument();
  });

  it('should render correct number of stars', () => {
    render(
      <FeedbackSummary
        averageRating={3.5}
        totalFeedback={10}
      />
    );

    // Should show 3.5 stars (3 full + 1 half + 1 empty)
    const stars = screen.getAllByText('⭐');
    expect(stars).toHaveLength(4); // 3 full + 1 half
  });
});

describe('Feedback API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit feedback to API', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const mockOnSubmit = vi.fn().mockImplementation(async (feedbackData) => {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      });
      return response.json();
    });

    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
      />
    );

    // Submit feedback
    const stars = screen.getAllByText('⭐');
    fireEvent.click(stars[3]);
    
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"rating":4'),
      });
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockOnSubmit = vi.fn().mockImplementation(async (feedbackData) => {
      try {
        await fetch('/api/ai/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackData),
        });
      } catch (error) {
        console.error('Failed to submit feedback:', error);
        throw error;
      }
    });

    render(
      <FeedbackCollector
        type="suggestion"
        onSubmit={mockOnSubmit}
      />
    );

    // Submit feedback
    const stars = screen.getAllByText('⭐');
    fireEvent.click(stars[3]);
    
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to submit feedback:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});