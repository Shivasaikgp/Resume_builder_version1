// Performance monitoring and metrics collection

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageResponseTime: number;
  memoryUsage: number;
  evictionCount: number;
}

export interface DatabaseMetrics {
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionCount: number;
  errorRate: number;
}

export interface AIMetrics {
  requestCount: number;
  averageProcessingTime: number;
  errorRate: number;
  rateLimitHits: number;
  cacheHitRate: number;
  queueSize: number;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  uptime: number;
  activeConnections: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private maxMetricsHistory = 10000;

  // Timer methods
  public startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  public endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags,
    });

    return duration;
  }

  public timeFunction<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, tags);
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, error: 'true' });
      throw error;
    }
  }

  public async timeAsyncFunction<T>(
    name: string, 
    fn: () => Promise<T>, 
    tags?: Record<string, string>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, tags);
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, error: 'true' });
      throw error;
    }
  }

  // Counter methods
  public incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    const currentValue = this.counters.get(name) || 0;
    this.counters.set(name, currentValue + value);

    this.recordMetric({
      name: `${name}_count`,
      value: currentValue + value,
      unit: 'count',
      timestamp: new Date(),
      tags,
    });
  }

  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  public resetCounter(name: string): void {
    this.counters.set(name, 0);
  }

  // Histogram methods
  public recordValue(name: string, value: number, tags?: Record<string, string>): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    
    // Keep only recent values to prevent memory growth
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
    
    this.histograms.set(name, values);

    this.recordMetric({
      name,
      value,
      unit: 'value',
      timestamp: new Date(),
      tags,
    });
  }

  public getHistogramStats(name: string): {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      mean: sorted.reduce((sum, val) => sum + val, 0) / count,
      median: sorted[Math.floor(count / 2)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  // Metric recording
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Prevent memory growth
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }
  }

  public getMetrics(
    name?: string, 
    since?: Date, 
    limit?: number
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  // Cache monitoring
  public monitorCachePerformance(
    cacheManager: any,
    intervalMs = 60000
  ): NodeJS.Timeout {
    return setInterval(() => {
      try {
        const stats = cacheManager.getOverallStats();
        
        this.recordMetric({
          name: 'cache_memory_usage',
          value: stats.totalMemoryUsage,
          unit: 'bytes',
          timestamp: new Date(),
          tags: { type: 'client_cache' },
        });

        this.recordMetric({
          name: 'cache_size',
          value: stats.totalSize,
          unit: 'items',
          timestamp: new Date(),
          tags: { type: 'client_cache' },
        });

        // Record individual cache stats
        Object.entries(stats.cacheStats).forEach(([cacheType, cacheStats]: [string, any]) => {
          this.recordMetric({
            name: 'cache_hit_rate',
            value: cacheStats.hitRate || 0,
            unit: 'percentage',
            timestamp: new Date(),
            tags: { cache_type: cacheType },
          });
        });
      } catch (error) {
        console.error('Error monitoring cache performance:', error);
      }
    }, intervalMs);
  }

  // Database monitoring
  public async monitorDatabasePerformance(prisma: any): Promise<DatabaseMetrics> {
    try {
      const startTime = performance.now();
      
      // Test query to measure response time
      await prisma.user.count();
      const queryTime = performance.now() - startTime;

      // Get connection info (if available)
      let connectionCount = 0;
      try {
        const connectionInfo = await prisma.$queryRaw`
          SELECT count(*) as total_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `;
        connectionCount = connectionInfo[0]?.total_connections || 0;
      } catch {
        // Connection info not available
      }

      const metrics: DatabaseMetrics = {
        queryCount: this.getCounter('database_queries'),
        averageQueryTime: queryTime,
        slowQueries: this.getCounter('slow_queries'),
        connectionCount,
        errorRate: this.getCounter('database_errors') / Math.max(this.getCounter('database_queries'), 1),
      };

      // Record metrics
      Object.entries(metrics).forEach(([key, value]) => {
        this.recordMetric({
          name: `database_${key}`,
          value: typeof value === 'number' ? value : 0,
          unit: key.includes('time') ? 'ms' : key.includes('rate') ? 'percentage' : 'count',
          timestamp: new Date(),
          tags: { component: 'database' },
        });
      });

      return metrics;
    } catch (error) {
      console.error('Error monitoring database performance:', error);
      return {
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        connectionCount: 0,
        errorRate: 1,
      };
    }
  }

  // AI performance monitoring
  public monitorAIPerformance(aiQueue: any): AIMetrics {
    try {
      const queueStatus = aiQueue.getQueueStatus();
      
      const metrics: AIMetrics = {
        requestCount: queueStatus.totalProcessed,
        averageProcessingTime: this.getHistogramStats('ai_processing_time')?.mean || 0,
        errorRate: queueStatus.failed / Math.max(queueStatus.totalProcessed, 1),
        rateLimitHits: this.getCounter('rate_limit_hits'),
        cacheHitRate: this.getCounter('ai_cache_hits') / Math.max(this.getCounter('ai_requests'), 1),
        queueSize: queueStatus.pending,
      };

      // Record metrics
      Object.entries(metrics).forEach(([key, value]) => {
        this.recordMetric({
          name: `ai_${key}`,
          value: typeof value === 'number' ? value : 0,
          unit: key.includes('time') ? 'ms' : key.includes('rate') ? 'percentage' : 'count',
          timestamp: new Date(),
          tags: { component: 'ai' },
        });
      });

      return metrics;
    } catch (error) {
      console.error('Error monitoring AI performance:', error);
      return {
        requestCount: 0,
        averageProcessingTime: 0,
        errorRate: 1,
        rateLimitHits: 0,
        cacheHitRate: 0,
        queueSize: 0,
      };
    }
  }

  // System monitoring
  public getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const metrics: SystemMetrics = {
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime,
      activeConnections: this.getCounter('active_connections'),
    };

    // Record system metrics
    this.recordMetric({
      name: 'system_memory_heap_used',
      value: memoryUsage.heapUsed,
      unit: 'bytes',
      timestamp: new Date(),
      tags: { component: 'system' },
    });

    this.recordMetric({
      name: 'system_memory_heap_total',
      value: memoryUsage.heapTotal,
      unit: 'bytes',
      timestamp: new Date(),
      tags: { component: 'system' },
    });

    this.recordMetric({
      name: 'system_uptime',
      value: uptime,
      unit: 'seconds',
      timestamp: new Date(),
      tags: { component: 'system' },
    });

    return metrics;
  }

  // Performance report generation
  public generatePerformanceReport(since?: Date): {
    summary: Record<string, any>;
    cache: CacheMetrics | null;
    database: DatabaseMetrics | null;
    ai: AIMetrics | null;
    system: SystemMetrics;
    topSlowOperations: Array<{ name: string; stats: any }>;
  } {
    const sinceTime = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const recentMetrics = this.getMetrics(undefined, sinceTime);

    // Calculate summary statistics
    const summary = {
      totalMetrics: recentMetrics.length,
      timeRange: {
        start: sinceTime,
        end: new Date(),
      },
      errorCount: this.getCounter('errors'),
      requestCount: this.getCounter('requests'),
    };

    // Get top slow operations
    const topSlowOperations = Array.from(this.histograms.entries())
      .map(([name, values]) => ({
        name,
        stats: this.getHistogramStats(name),
      }))
      .filter(op => op.stats && op.stats.count > 10)
      .sort((a, b) => (b.stats?.p95 || 0) - (a.stats?.p95 || 0))
      .slice(0, 10);

    return {
      summary,
      cache: null, // Would be populated with actual cache metrics
      database: null, // Would be populated with actual database metrics
      ai: null, // Would be populated with actual AI metrics
      system: this.getSystemMetrics(),
      topSlowOperations,
    };
  }

  // Cleanup methods
  public clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
    this.counters.clear();
    this.histograms.clear();
  }

  public clearOldMetrics(olderThan: Date): void {
    this.metrics = this.metrics.filter(m => m.timestamp >= olderThan);
  }

  // Export methods
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['name', 'value', 'unit', 'timestamp', 'tags'];
      const rows = this.metrics.map(m => [
        m.name,
        m.value.toString(),
        m.unit,
        m.timestamp.toISOString(),
        JSON.stringify(m.tags || {}),
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.metrics, null, 2);
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

// Decorator for automatic performance monitoring
export function monitor(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitorName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      return monitor.timeFunction(monitorName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Async decorator for automatic performance monitoring
export function monitorAsync(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitorName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      return monitor.timeAsyncFunction(monitorName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}