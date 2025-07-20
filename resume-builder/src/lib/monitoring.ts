import { performance } from 'perf_hooks';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/cache/redis-client';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

class MonitoringService {
  private metricsEnabled: boolean;
  private logLevel: string;

  constructor() {
    this.metricsEnabled = process.env.ENABLE_METRICS === 'true';
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  // Metrics collection
  async recordMetric(metric: MetricData): Promise<void> {
    if (!this.metricsEnabled) return;

    try {
      const key = `metrics:${metric.name}`;
      const data = {
        ...metric,
        timestamp: metric.timestamp || Date.now()
      };

      if (redis) {
        // Store metric in Redis with TTL of 7 days
        await redis.zadd(key, data.timestamp, JSON.stringify(data));
        await redis.expire(key, 7 * 24 * 60 * 60);
      }
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  // AI service metrics
  async recordAIRequest(service: 'openai' | 'anthropic', duration: number, success: boolean): Promise<void> {
    await Promise.all([
      this.recordMetric({
        name: 'ai_request_duration',
        value: duration,
        timestamp: Date.now(),
        tags: { service, status: success ? 'success' : 'error' }
      }),
      this.recordMetric({
        name: 'ai_request_count',
        value: 1,
        timestamp: Date.now(),
        tags: { service, status: success ? 'success' : 'error' }
      })
    ]);
  }

  // Database metrics
  async recordDatabaseQuery(operation: string, duration: number, success: boolean): Promise<void> {
    await Promise.all([
      this.recordMetric({
        name: 'db_query_duration',
        value: duration,
        timestamp: Date.now(),
        tags: { operation, status: success ? 'success' : 'error' }
      }),
      this.recordMetric({
        name: 'db_query_count',
        value: 1,
        timestamp: Date.now(),
        tags: { operation, status: success ? 'success' : 'error' }
      })
    ]);
  }

  // User activity metrics
  async recordUserActivity(activity: string, userId: string): Promise<void> {
    await this.recordMetric({
      name: 'user_activity',
      value: 1,
      timestamp: Date.now(),
      tags: { activity, userId }
    });
  }

  // Logging
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const context = entry.context ? JSON.stringify(entry.context) : '';
    const userId = entry.userId ? `[User: ${entry.userId}]` : '';
    const requestId = entry.requestId ? `[Request: ${entry.requestId}]` : '';
    
    return `[${timestamp}] ${entry.level.toUpperCase()} ${userId}${requestId} ${entry.message} ${context}`.trim();
  }

  log(level: LogEntry['level'], message: string, context?: Record<string, any>, userId?: string, requestId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      userId,
      requestId
    };

    const formattedLog = this.formatLogEntry(entry);

    // Console output
    switch (level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'debug':
        console.debug(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }

    // Store in Redis for centralized logging (optional)
    if (redis && this.metricsEnabled) {
      redis.lpush('logs', JSON.stringify(entry)).catch(console.error);
      redis.ltrim('logs', 0, 9999).catch(console.error); // Keep last 10k logs
    }
  }

  info(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log('info', message, context, userId, requestId);
  }

  warn(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log('warn', message, context, userId, requestId);
  }

  error(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log('error', message, context, userId, requestId);
  }

  debug(message: string, context?: Record<string, any>, userId?: string, requestId?: string): void {
    this.log('debug', message, context, userId, requestId);
  }

  // Get metrics for monitoring dashboard
  async getMetrics(metricName: string, timeRange: number = 3600000): Promise<MetricData[]> {
    if (!redis) return [];

    try {
      const key = `metrics:${metricName}`;
      const now = Date.now();
      const since = now - timeRange;

      const results = await redis.zrangebyscore(key, since, now);
      return results.map(result => JSON.parse(result));
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return [];
    }
  }

  // Health check for monitoring service
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    try {
      const testMetric: MetricData = {
        name: 'health_check',
        value: 1,
        timestamp: Date.now()
      };

      await this.recordMetric(testMetric);
      
      return {
        status: 'healthy',
        details: {
          metricsEnabled: this.metricsEnabled,
          logLevel: this.logLevel,
          redisConnected: !!redis
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          metricsEnabled: this.metricsEnabled,
          logLevel: this.logLevel,
          redisConnected: !!redis
        }
      };
    }
  }
}

export const monitoring = new MonitoringService();

// Middleware for request logging
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    req.requestId = requestId;

    monitoring.info('Request started', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    }, req.user?.id, requestId);

    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      
      monitoring.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration
      }, req.user?.id, requestId);

      monitoring.recordMetric({
        name: 'http_request_duration',
        value: duration,
        timestamp: Date.now(),
        tags: {
          method: req.method,
          status: res.statusCode.toString(),
          endpoint: req.route?.path || req.url
        }
      });

      return originalSend.call(this, data);
    };

    next();
  };
}