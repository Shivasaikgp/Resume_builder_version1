import React from 'react';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { AIServiceError, RateLimitError } from '@/lib/ai/errors';

interface ErrorDisplayProps {
  error: string | Error | AIServiceError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className,
  showDetails = false 
}: ErrorDisplayProps) {
  const getErrorInfo = () => {
    if (typeof error === 'string') {
      return {
        title: 'Error',
        message: error,
        type: 'generic' as const,
        retryable: true,
      };
    }

    if (error instanceof RateLimitError) {
      const timeUntilReset = Math.ceil((error.resetTime.getTime() - Date.now()) / 1000);
      return {
        title: 'Rate Limit Exceeded',
        message: `Too many requests. Please wait ${timeUntilReset} seconds before trying again.`,
        type: 'rate-limit' as const,
        retryable: true,
        resetTime: error.resetTime,
      };
    }

    if (error instanceof AIServiceError) {
      return {
        title: getErrorTitle(error.code),
        message: error.message,
        type: error.code.toLowerCase().replace('_', '-') as const,
        retryable: error.retryable,
        provider: error.provider,
        requestId: error.requestId,
      };
    }

    return {
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred',
      type: 'generic' as const,
      retryable: true,
    };
  };

  const getErrorTitle = (code: string): string => {
    switch (code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 'Rate Limit Exceeded';
      case 'PROVIDER_UNAVAILABLE':
        return 'Service Temporarily Unavailable';
      case 'AUTHENTICATION_ERROR':
        return 'Authentication Failed';
      case 'QUOTA_EXCEEDED':
        return 'Usage Quota Exceeded';
      case 'INVALID_REQUEST':
        return 'Invalid Request';
      default:
        return 'Service Error';
    }
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'rate-limit':
        return '⏱️';
      case 'provider-unavailable':
        return '🔌';
      case 'authentication-error':
        return '🔐';
      case 'quota-exceeded':
        return '📊';
      case 'invalid-request':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getRecoveryActions = (type: string) => {
    switch (type) {
      case 'rate-limit':
        return [
          'Wait for the rate limit to reset',
          'Try reducing the frequency of requests',
          'Consider upgrading your plan for higher limits',
        ];
      case 'provider-unavailable':
        return [
          'Check your internet connection',
          'Try again in a few minutes',
          'The service may be experiencing temporary issues',
        ];
      case 'authentication-error':
        return [
          'Check your API credentials',
          'Try signing out and signing back in',
          'Contact support if the issue persists',
        ];
      case 'quota-exceeded':
        return [
          'You have reached your usage limit',
          'Consider upgrading your plan',
          'Wait for your quota to reset',
        ];
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact support if the issue persists',
        ];
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <Alert variant="destructive" className={cn('', className)}>
      <AlertDescription>
        <div className="space-y-3">
          {/* Error Header */}
          <div className="flex items-start space-x-2">
            <span className="text-lg flex-shrink-0 mt-0.5">
              {getErrorIcon(errorInfo.type)}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-red-800">
                {errorInfo.title}
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {errorInfo.message}
              </p>
            </div>
          </div>

          {/* Error Details */}
          {showDetails && (errorInfo.provider || errorInfo.requestId) && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
              {errorInfo.provider && (
                <p>Provider: {errorInfo.provider}</p>
              )}
              {errorInfo.requestId && (
                <p>Request ID: {errorInfo.requestId}</p>
              )}
            </div>
          )}

          {/* Recovery Actions */}
          <div className="text-sm text-red-700">
            <p className="font-medium mb-1">What you can do:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {getRecoveryActions(errorInfo.type).map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-2">
            {errorInfo.retryable && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Specialized error displays
interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorDisplay
      error="Network connection failed. Please check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    />
  );
}

interface AIServiceErrorDisplayProps {
  error: AIServiceError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AIServiceErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className 
}: AIServiceErrorDisplayProps) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      className={className}
      showDetails={true}
    />
  );
}

// Error toast notification
interface ErrorToastProps {
  error: string | Error;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function ErrorToast({ 
  error, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}: ErrorToastProps) {
  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onDismiss]);

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert variant="destructive" className="shadow-lg">
        <AlertDescription>
          <div className="flex items-start justify-between">
            <p className="text-sm pr-2">{message}</p>
            <button
              onClick={onDismiss}
              className="text-red-500 hover:text-red-700 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}