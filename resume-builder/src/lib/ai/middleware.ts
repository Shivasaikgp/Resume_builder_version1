// AI Middleware for Request/Response Processing

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIQueue } from './queue';
import { AIRequest, AIResponse } from './types';
import { AIServiceError, RateLimitError } from './errors';

export interface AIMiddlewareOptions {
  requireAuth?: boolean;
  rateLimitByUser?: boolean;
  validateRequest?: (request: any) => boolean;
  transformRequest?: (request: any) => Partial<AIRequest>;
  transformResponse?: (response: AIResponse) => any;
}

export function withAIMiddleware(
  handler: (request: AIRequest) => Promise<AIResponse>,
  options: AIMiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Parse request body
      const body = await req.json();

      // Authentication check
      if (options.requireAuth !== false) {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        body.userId = session.user.id;
      }

      // Request validation
      if (options.validateRequest && !options.validateRequest(body)) {
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }

      // Transform request
      const aiRequest: AIRequest = {
        id: crypto.randomUUID(),
        type: body.type || 'content-generation',
        prompt: body.prompt,
        context: body.context,
        userId: body.userId,
        priority: body.priority || 'normal',
        timestamp: new Date(),
        metadata: body.metadata,
        ...options.transformRequest?.(body),
      };

      // Validate required fields
      if (!aiRequest.prompt) {
        return NextResponse.json(
          { error: 'Prompt is required' },
          { status: 400 }
        );
      }

      // Process request through queue
      const queue = getAIQueue();
      const response = await queue.addRequest(aiRequest);

      // Transform response
      const transformedResponse = options.transformResponse
        ? options.transformResponse(response)
        : response;

      return NextResponse.json(transformedResponse);

    } catch (error) {
      return handleAIMiddlewareError(error);
    }
  };
}

export function handleAIMiddlewareError(error: unknown): NextResponse {
  console.error('AI Middleware Error:', error);

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: error.message,
        resetTime: error.resetTime.toISOString(),
        retryAfter: Math.ceil((error.resetTime.getTime() - Date.now()) / 1000),
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((error.resetTime.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  if (error instanceof AIServiceError) {
    const statusCode = getStatusCodeForError(error);
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        provider: error.provider,
        retryable: error.retryable,
        timestamp: error.timestamp.toISOString(),
      },
      { status: statusCode }
    );
  }

  // Generic error handling
  return NextResponse.json(
    {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

function getStatusCodeForError(error: AIServiceError): number {
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'AUTHENTICATION_ERROR':
      return 401;
    case 'QUOTA_EXCEEDED':
      return 402;
    case 'INVALID_REQUEST':
      return 400;
    case 'PROVIDER_UNAVAILABLE':
      return 503;
    default:
      return 500;
  }
}

// Request validation helpers
export const validateContentGenerationRequest = (body: any): boolean => {
  return (
    typeof body.prompt === 'string' &&
    body.prompt.length > 0 &&
    body.prompt.length <= 10000 &&
    (!body.context || typeof body.context === 'object') &&
    (!body.type || ['content-generation', 'analysis', 'optimization', 'context'].includes(body.type))
  );
};

export const validateAnalysisRequest = (body: any): boolean => {
  return (
    typeof body.prompt === 'string' &&
    body.prompt.length > 0 &&
    body.type === 'analysis' &&
    body.context &&
    typeof body.context === 'object'
  );
};

// Response transformation helpers
export const transformContentResponse = (response: AIResponse) => {
  return {
    id: response.id,
    content: response.content,
    provider: response.provider,
    cached: response.cached || false,
    processingTime: response.processingTime,
    timestamp: response.timestamp,
  };
};

export const transformAnalysisResponse = (response: AIResponse) => {
  try {
    // Try to parse JSON content for analysis responses
    const analysis = JSON.parse(response.content);
    return {
      id: response.id,
      analysis,
      provider: response.provider,
      cached: response.cached || false,
      processingTime: response.processingTime,
      timestamp: response.timestamp,
    };
  } catch {
    // If not JSON, return as-is
    return transformContentResponse(response);
  }
};

// Middleware factory for different AI endpoints
export const createContentGenerationMiddleware = () =>
  withAIMiddleware(
    async (request) => {
      const queue = getAIQueue();
      return queue.addRequest(request);
    },
    {
      requireAuth: true,
      validateRequest: validateContentGenerationRequest,
      transformResponse: transformContentResponse,
    }
  );

export const createAnalysisMiddleware = () =>
  withAIMiddleware(
    async (request) => {
      const queue = getAIQueue();
      return queue.addRequest(request);
    },
    {
      requireAuth: true,
      validateRequest: validateAnalysisRequest,
      transformResponse: transformAnalysisResponse,
    }
  );