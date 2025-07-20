import { NextRequest, NextResponse } from 'next/server';
import { monitoring } from '@/lib/monitoring';

// Prometheus metrics format
interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: Array<{
    labels?: Record<string, string>;
    value: number;
    timestamp?: number;
  }>;
}

class MetricsCollector {
  private metrics: Map<string, PrometheusMetric> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP request metrics
    this.metrics.set('http_requests_total', {
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      type: 'counter',
      values: []
    });

    this.metrics.set('http_request_duration_seconds', {
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      type: 'histogram',
      values: []
    });

    // AI service metrics
    this.metrics.set('ai_requests_total', {
      name: 'ai_requests_total',
      help: 'Total number of AI service requests',
      type: 'counter',
      values: []
    });

    this.metrics.set('ai_request_duration_seconds', {
      name: 'ai_request_duration_seconds',
      help: 'AI request duration in seconds',
      type: 'histogram',
      values: []
    });

    // Database metrics
    this.metrics.set('db_queries_total', {
      name: 'db_queries_total',
      help: 'Total number of database queries',
      type: 'counter',
      values: []
    });

    this.metrics.set('db_query_duration_seconds', {
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      type: 'histogram',
      values: []
    });

    // Application metrics
    this.metrics.set('active_users', {
      name: 'active_users',
      help: 'Number of active users',
      type: 'gauge',
      values: []
    });

    this.metrics.set('resumes_created_total', {
      name: 'resumes_created_total',
      help: 'Total number of resumes created',
      type: 'counter',
      values: []
    });

    // System metrics
    this.metrics.set('process_resident_memory_bytes', {
      name: 'process_resident_memory_bytes',
      help: 'Resident memory size in bytes',
      type: 'gauge',
      values: []
    });

    this.metrics.set('nodejs_heap_size_used_bytes', {
      name: 'nodejs_heap_size_used_bytes',
      help: 'Process heap space size used in bytes',
      type: 'gauge',
      values: []
    });
  }

  async collectMetrics(): Promise<void> {
    try {
      // Collect HTTP metrics from monitoring service
      const httpMetrics = await monitoring.getMetrics('http_request_duration', 3600000);
      this.updateHttpMetrics(httpMetrics);

      // Collect AI metrics
      const aiMetrics = await monitoring.getMetrics('ai_request_duration', 3600000);
      this.updateAIMetrics(aiMetrics);

      // Collect database metrics
      const dbMetrics = await monitoring.getMetrics('db_query_duration', 3600000);
      this.updateDatabaseMetrics(dbMetrics);

      // Collect system metrics
      this.updateSystemMetrics();

      // Collect application metrics
      await this.updateApplicationMetrics();
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  private updateHttpMetrics(metrics: any[]) {
    const httpRequests = this.metrics.get('http_requests_total')!;
    const httpDuration = this.metrics.get('http_request_duration_seconds')!;

    httpRequests.values = [];
    httpDuration.values = [];

    const requestCounts = new Map<string, number>();
    const durations: number[] = [];

    metrics.forEach(metric => {
      const key = `${metric.tags?.method || 'unknown'}_${metric.tags?.status || 'unknown'}`;
      requestCounts.set(key, (requestCounts.get(key) || 0) + 1);
      durations.push(metric.value / 1000); // Convert ms to seconds
    });

    // Add request counts
    requestCounts.forEach((count, key) => {
      const [method, status] = key.split('_');
      httpRequests.values.push({
        labels: { method, status },
        value: count
      });
    });

    // Add duration histogram buckets
    const buckets = [0.1, 0.5, 1, 2, 5, 10];
    buckets.forEach(bucket => {
      const count = durations.filter(d => d <= bucket).length;
      httpDuration.values.push({
        labels: { le: bucket.toString() },
        value: count
      });
    });
  }

  private updateAIMetrics(metrics: any[]) {
    const aiRequests = this.metrics.get('ai_requests_total')!;
    const aiDuration = this.metrics.get('ai_request_duration_seconds')!;

    aiRequests.values = [];
    aiDuration.values = [];

    const requestCounts = new Map<string, number>();
    const durations: number[] = [];

    metrics.forEach(metric => {
      const key = `${metric.tags?.service || 'unknown'}_${metric.tags?.status || 'unknown'}`;
      requestCounts.set(key, (requestCounts.get(key) || 0) + 1);
      durations.push(metric.value / 1000);
    });

    requestCounts.forEach((count, key) => {
      const [service, status] = key.split('_');
      aiRequests.values.push({
        labels: { service, status },
        value: count
      });
    });

    const buckets = [0.5, 1, 2, 5, 10, 30];
    buckets.forEach(bucket => {
      const count = durations.filter(d => d <= bucket).length;
      aiDuration.values.push({
        labels: { le: bucket.toString() },
        value: count
      });
    });
  }

  private updateDatabaseMetrics(metrics: any[]) {
    const dbQueries = this.metrics.get('db_queries_total')!;
    const dbDuration = this.metrics.get('db_query_duration_seconds')!;

    dbQueries.values = [];
    dbDuration.values = [];

    const queryCounts = new Map<string, number>();
    const durations: number[] = [];

    metrics.forEach(metric => {
      const key = `${metric.tags?.operation || 'unknown'}_${metric.tags?.status || 'unknown'}`;
      queryCounts.set(key, (queryCounts.get(key) || 0) + 1);
      durations.push(metric.value / 1000);
    });

    queryCounts.forEach((count, key) => {
      const [operation, status] = key.split('_');
      dbQueries.values.push({
        labels: { operation, status },
        value: count
      });
    });

    const buckets = [0.01, 0.05, 0.1, 0.5, 1, 2];
    buckets.forEach(bucket => {
      const count = durations.filter(d => d <= bucket).length;
      dbDuration.values.push({
        labels: { le: bucket.toString() },
        value: count
      });
    });
  }

  private updateSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    
    const residentMemory = this.metrics.get('process_resident_memory_bytes')!;
    residentMemory.values = [{
      value: memoryUsage.rss
    }];

    const heapUsed = this.metrics.get('nodejs_heap_size_used_bytes')!;
    heapUsed.values = [{
      value: memoryUsage.heapUsed
    }];
  }

  private async updateApplicationMetrics() {
    // These would typically come from your database or application state
    // For now, we'll use placeholder values
    
    const activeUsers = this.metrics.get('active_users')!;
    activeUsers.values = [{
      value: 0 // Would be calculated from active sessions
    }];

    const resumesCreated = this.metrics.get('resumes_created_total')!;
    resumesCreated.values = [{
      value: 0 // Would be calculated from database
    }];
  }

  formatPrometheusOutput(): string {
    let output = '';

    this.metrics.forEach(metric => {
      // Add metric help and type
      output += `# HELP ${metric.name} ${metric.help}\n`;
      output += `# TYPE ${metric.name} ${metric.type}\n`;

      // Add metric values
      metric.values.forEach(value => {
        const labels = value.labels 
          ? `{${Object.entries(value.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
          : '';
        
        const timestamp = value.timestamp ? ` ${value.timestamp}` : '';
        output += `${metric.name}${labels} ${value.value}${timestamp}\n`;
      });

      output += '\n';
    });

    return output;
  }
}

export async function GET(request: NextRequest) {
  try {
    const collector = new MetricsCollector();
    await collector.collectMetrics();
    
    const metricsOutput = collector.formatPrometheusOutput();
    
    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Failed to generate metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}