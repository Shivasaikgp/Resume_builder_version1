import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorDisplay, NetworkError, AIServiceErrorDisplay, ErrorToast } from '../components/ui/error-display';
import { AIServiceError, RateLimitError, ProviderUnavailableError } from '../lib/ai/errors';

describe('ErrorDisplay', () => {
  const mockOnRetry = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render generic error message', () => {
    render(
      <ErrorDisplay
        error="Something went wrong"
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should render rate limit error with countdown', () => {
    const resetTime = new Date(Date.now() + 30000); // 30 seconds from now
    const rateLimitError = new RateLimitError('Rate limit exceeded', resetTime, 'openai');

    render(
      <ErrorDisplay
        error={rateLimitError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument();
    expect(screen.getByText(/Please wait \d+ seconds/)).toBeInTheDocument();
    expect(screen.getByText('⏱️')).toBeInTheDocument();
  });

  it('should render provider unavailable error', () => {
    const providerError = new ProviderUnavailableError('Service unavailable', 'openai');

    render(
      <ErrorDisplay
        error={providerError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();
    expect(screen.getByText('🔌')).toBeInTheDocument();
  });

  it('should show error details when requested', () => {
    const aiError = new AIServiceError('Test error', 'TEST_ERROR', 'openai', true, 'req-123');

    render(
      <ErrorDisplay
        error={aiError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
        showDetails={true}
      />
    );

    expect(screen.getByText('Provider: openai')).toBeInTheDocument();
    expect(screen.getByText('Request ID: req-123')).toBeInTheDocument();
  });

  it('should handle retry action', () => {
    render(
      <ErrorDisplay
        error="Test error"
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('should handle dismiss action', () => {
    render(
      <ErrorDisplay
        error="Test error"
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should not show retry button for non-retryable errors', () => {
    const nonRetryableError = new AIServiceError('Invalid request', 'INVALID_REQUEST', 'openai', false);

    render(
      <ErrorDisplay
        error={nonRetryableError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should show appropriate recovery actions for different error types', () => {
    const authError = new AIServiceError('Auth failed', 'AUTHENTICATION_ERROR', 'openai', false);

    render(<ErrorDisplay error={authError} />);

    expect(screen.getByText('Check your API credentials')).toBeInTheDocument();
    expect(screen.getByText('Try signing out and signing back in')).toBeInTheDocument();
  });
});

describe('NetworkError', () => {
  it('should render network error message', () => {
    const mockOnRetry = vi.fn();

    render(<NetworkError onRetry={mockOnRetry} />);

    expect(screen.getByText('Network connection failed. Please check your internet connection and try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});

describe('AIServiceErrorDisplay', () => {
  it('should render AI service error with details', () => {
    const aiError = new AIServiceError('AI service failed', 'PROVIDER_UNAVAILABLE', 'anthropic', true, 'req-456');
    const mockOnRetry = vi.fn();
    const mockOnDismiss = vi.fn();

    render(
      <AIServiceErrorDisplay
        error={aiError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Provider: anthropic')).toBeInTheDocument();
    expect(screen.getByText('Request ID: req-456')).toBeInTheDocument();
  });
});

describe('ErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render error toast', () => {
    const mockOnDismiss = vi.fn();

    render(
      <ErrorToast
        error="Toast error message"
        onDismiss={mockOnDismiss}
        autoHide={false}
      />
    );

    expect(screen.getByText('Toast error message')).toBeInTheDocument();
  });

  it('should auto-hide after specified duration', async () => {
    const mockOnDismiss = vi.fn();

    render(
      <ErrorToast
        error="Auto-hide error"
        onDismiss={mockOnDismiss}
        autoHide={true}
        duration={2000}
      />
    );

    // Fast-forward time
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('should handle manual dismiss', () => {
    const mockOnDismiss = vi.fn();

    render(
      <ErrorToast
        error="Manual dismiss error"
        onDismiss={mockOnDismiss}
        autoHide={false}
      />
    );

    const dismissButton = screen.getByText('×');
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should handle Error object', () => {
    const mockOnDismiss = vi.fn();
    const error = new Error('Error object message');

    render(
      <ErrorToast
        error={error}
        onDismiss={mockOnDismiss}
        autoHide={false}
      />
    );

    expect(screen.getByText('Error object message')).toBeInTheDocument();
  });
});

describe('Error Recovery Actions', () => {
  it('should show appropriate actions for quota exceeded error', () => {
    const quotaError = new AIServiceError('Quota exceeded', 'QUOTA_EXCEEDED', 'openai', false);

    render(<ErrorDisplay error={quotaError} />);

    expect(screen.getByText('You have reached your usage limit')).toBeInTheDocument();
    expect(screen.getByText('Consider upgrading your plan')).toBeInTheDocument();
    expect(screen.getByText('Wait for your quota to reset')).toBeInTheDocument();
  });

  it('should show appropriate actions for provider unavailable error', () => {
    const providerError = new ProviderUnavailableError('Service down', 'anthropic');

    render(<ErrorDisplay error={providerError} />);

    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('Try again in a few minutes')).toBeInTheDocument();
    expect(screen.getByText('The service may be experiencing temporary issues')).toBeInTheDocument();
  });

  it('should show generic actions for unknown errors', () => {
    const unknownError = new Error('Unknown error');

    render(<ErrorDisplay error={unknownError} />);

    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('Contact support if the issue persists')).toBeInTheDocument();
  });
});