import { prisma } from './prisma';
import { AIServiceError } from './ai/errors';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface ErrorLogEntry {
  errorType: string;
  errorCode?: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  userId?: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private queue: ErrorLogEntry[] = [];
  private isProcessing = false;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  async logError(
    error: Error | AIServiceError | string,
    context: ErrorContext = {}
  ): Promise<void> {
    try {
      const errorEntry = this.createErrorEntry(error, context);
      
      // Add to queue for batch processing
      this.queue.push(errorEntry);
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error logged:', errorEntry);
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private createErrorEntry(
    error: Error | AIServiceError | string,
    context: ErrorContext
  ): ErrorLogEntry {
    if (typeof error === 'string') {
      return {
        errorType: 'generic',
        message: error,
        context,
        userId: context.userId,
      };
    }

    if (error instanceof AIServiceError) {
      return {
        errorType: 'ai_service',
        errorCode: error.code,
        message: error.message,
        stack: error.stack,
        context: {
          ...context,
          provider: error.provider,
          retryable: error.retryable,
          requestId: error.requestId,
        },
        userId: context.userId,
      };
    }

    // Regular Error
    return {
      errorType: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      context,
      userId: context.userId,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process in batches of 10
      const batch = this.queue.splice(0, 10);
      
      if (batch.length > 0) {
        await prisma.errorLog.createMany({
          data: batch.map(entry => ({
            userId: entry.userId,
            errorType: entry.errorType,
            errorCode: entry.errorCode,
            message: entry.message,
            stack: entry.stack,
            context: entry.context,
          })),
        });
      }

      // Continue processing if there are more items
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      console.error('Failed to process error log queue:', error);
      this.isProcessing = false;
    }
  }

  async getErrorStats(userId?: string, timeframe: string = '24h'): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: any[];
  }> {
    const now = new Date();
    const timeframeMap: Record<string, number> = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    };
    
    const hours = timeframeMap[timeframe] || 24;
    const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    const errors = await prisma.errorLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const errorsByType = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: errors.length,
      errorsByType,
      recentErrors: errors.slice(0, 10),
    };
  }

  async markErrorResolved(errorId: string): Promise<void> {
    await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }
}

// Singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Convenience functions
export async function logError(
  error: Error | AIServiceError | string,
  context: ErrorContext = {}
): Promise<void> {
  return errorLogger.logError(error, context);
}

export async function logAIError(
  error: AIServiceError,
  userId?: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return errorLogger.logError(error, {
    userId,
    component: 'ai_service',
    ...additionalContext,
  });
}

export async function logUIError(
  error: Error,
  component: string,
  userId?: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return errorLogger.logError(error, {
    userId,
    component,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    ...additionalContext,
  });
}

// Error boundary helper
export function createErrorBoundaryLogger(componentName: string) {
  return (error: Error, errorInfo: React.ErrorInfo, userId?: string) => {
    logUIError(error, componentName, userId, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  };
}

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, {
      component: 'global_error_handler',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, {
      component: 'unhandled_promise_rejection',
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });
}