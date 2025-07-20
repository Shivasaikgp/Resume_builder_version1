// AI Request Queue System with Rate Limiting

import PQueue from 'p-queue';
import pRetry from 'p-retry';
import { getAIConfig } from './config';
import { getAIClients } from './clients';
import { AIRequest, AIResponse, QueueStatus, RateLimitStatus } from './types';
import { RateLimitError, AIServiceError } from './errors';
import { getRedisClient, getCacheManager } from '../cache/redis-client';

export class AIRequestQueue {
  private queue: PQueue;
  private redis = getRedisClient();
  private cacheManager = getCacheManager();
  private config = getAIConfig();
  private aiClients = getAIClients();
  private stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
  };

  constructor() {
    // Initialize queue with concurrency limits
    this.queue = new PQueue({
      concurrency: this.config.rateLimiting.concurrentRequests,
      interval: 60000, // 1 minute
      intervalCap: this.config.rateLimiting.requestsPerMinute,
    });

    // Set up queue event handlers
    this.setupQueueHandlers();
  }

  private setupQueueHandlers(): void {
    this.queue.on('add', () => {
      this.stats.pending++;
    });

    this.queue.on('active', () => {
      this.stats.pending--;
      this.stats.processing++;
    });

    this.queue.on('completed', () => {
      this.stats.processing--;
      this.stats.completed++;
      this.stats.totalProcessed++;
    });

    this.queue.on('error', (error) => {
      this.stats.processing--;
      this.stats.failed++;
      this.stats.totalProcessed++;
      console.error('Queue processing error:', error);
    });
  }

  public async addRequest(request: AIRequest): Promise<AIResponse> {
    // Check rate limits
    await this.checkRateLimit(request.userId);

    // Add to queue with priority
    const priority = this.getPriority(request.priority);
    
    return this.queue.add(
      () => this.processRequest(request),
      { priority }
    );
  }

  private async processRequest(request: AIRequest): Promise<AIResponse> {
    return pRetry(
      async () => {
        // Check if response is cached
        const cachedResponse = await this.getCachedResponse(request);
        if (cachedResponse) {
          return { ...cachedResponse, cached: true };
        }

        // Process request with AI clients
        const response = await this.aiClients.generateCompletion(request);

        // Cache the response
        await this.cacheResponse(request, response);

        return response;
      },
      {
        retries: this.config.fallback.retryAttempts,
        minTimeout: this.config.fallback.retryDelay,
        maxTimeout: this.config.fallback.retryDelay * 4,
        onFailedAttempt: (error) => {
          console.warn(`Request ${request.id} failed, attempt ${error.attemptNumber}:`, error.message);
        },
        shouldRetry: (error) => {
          if (error instanceof AIServiceError) {
            return error.retryable;
          }
          return true;
        },
      }
    );
  }

  private async checkRateLimit(userId: string): Promise<void> {
    if (!this.redis.isAvailable()) {
      // Simple in-memory rate limiting (not persistent across restarts)
      return;
    }

    const now = Date.now();
    const minuteKey = `rate_limit:${userId}:${Math.floor(now / 60000)}`;
    const hourKey = `rate_limit:${userId}:${Math.floor(now / 3600000)}`;

    try {
      // Get current counts
      const [minuteCount, hourCount] = await Promise.all([
        this.redis.get<number>(minuteKey).then(count => count || 0),
        this.redis.get<number>(hourKey).then(count => count || 0),
      ]);

      // Check limits before incrementing
      if (minuteCount >= this.config.rateLimiting.requestsPerMinute) {
        const resetTime = new Date(Math.ceil(now / 60000) * 60000);
        throw new RateLimitError(
          'Rate limit exceeded: too many requests per minute',
          resetTime
        );
      }

      if (hourCount >= this.config.rateLimiting.requestsPerHour) {
        const resetTime = new Date(Math.ceil(now / 3600000) * 3600000);
        throw new RateLimitError(
          'Rate limit exceeded: too many requests per hour',
          resetTime
        );
      }

      // Increment counters
      await Promise.all([
        this.redis.set(minuteKey, minuteCount + 1, 60),
        this.redis.set(hourKey, hourCount + 1, 3600),
      ]);
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.warn('Failed to check rate limits:', error);
    }
  }

  private async getCachedResponse(request: AIRequest): Promise<AIResponse | null> {
    try {
      const requestHash = this.hashRequest(request);
      return await this.cacheManager.getCachedAIResponse(requestHash);
    } catch (error) {
      console.warn('Failed to get cached response:', error);
      return null;
    }
  }

  private async cacheResponse(request: AIRequest, response: AIResponse): Promise<void> {
    try {
      const requestHash = this.hashRequest(request);
      const ttl = 3600; // 1 hour cache
      await this.cacheManager.cacheAIResponse(requestHash, response, ttl);
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  private hashRequest(request: AIRequest): string {
    // Simple hash of request content for caching
    const content = `${request.type}:${request.prompt}:${JSON.stringify(request.context || {})}`;
    return Buffer.from(content).toString('base64').slice(0, 32);
  }

  private getPriority(priority: AIRequest['priority']): number {
    switch (priority) {
      case 'high': return 10;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }

  public async getRateLimitStatus(userId: string): Promise<RateLimitStatus> {
    if (!this.redis.isAvailable()) {
      return {
        requestsRemaining: this.config.rateLimiting.requestsPerMinute,
        resetTime: new Date(Date.now() + 60000),
        isLimited: false,
      };
    }

    const now = Date.now();
    const minuteKey = `rate_limit:${userId}:${Math.floor(now / 60000)}`;
    
    try {
      const count = await this.redis.get<number>(minuteKey);
      const currentCount = count || 0;
      const remaining = Math.max(0, this.config.rateLimiting.requestsPerMinute - currentCount);
      const resetTime = new Date(Math.ceil(now / 60000) * 60000);

      return {
        requestsRemaining: remaining,
        resetTime,
        isLimited: remaining === 0,
      };
    } catch (error) {
      console.warn('Failed to get rate limit status:', error);
      return {
        requestsRemaining: 0,
        resetTime: new Date(Date.now() + 60000),
        isLimited: true,
      };
    }
  }

  public getQueueStatus(): QueueStatus {
    return {
      pending: this.queue.pending,
      processing: this.stats.processing,
      completed: this.stats.completed,
      failed: this.stats.failed,
      totalProcessed: this.stats.totalProcessed,
    };
  }

  public async clearQueue(): Promise<void> {
    this.queue.clear();
    this.stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalProcessed: 0,
    };
  }

  public async shutdown(): Promise<void> {
    await this.queue.onIdle();
    await this.redis.disconnect();
  }
}

// Singleton instance
let queueInstance: AIRequestQueue | null = null;

export function getAIQueue(): AIRequestQueue {
  if (!queueInstance) {
    queueInstance = new AIRequestQueue();
  }
  return queueInstance;
}