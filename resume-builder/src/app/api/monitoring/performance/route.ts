// Performance monitoring API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import { getClientCacheManager } from '@/lib/cache/client-cache';
import { getAIQueue } from '@/lib/ai/queue';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Authentication check - only allow authenticated users
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const since = searchParams.get('since');
    const format = searchParams.get('format') || 'json';

    const monitor = getPerformanceMonitor();
    const sinceDate = since ? new Date(since) : undefined;

    switch (reportType) {
      case 'summary':
        const report = monitor.generatePerformanceReport(sinceDate);
        
        if (format === 'csv') {
          return new NextResponse(monitor.exportMetrics('csv'), {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename=performance-metrics.csv',
            },
          });
        }

        return NextResponse.json({
          ...report,
          timestamp: new Date().toISOString(),
        });

      case 'cache':
        const cacheManager = getClientCacheManager();
        const cacheStats = cacheManager.getOverallStats();
        
        return NextResponse.json({
          cache: cacheStats,
          timestamp: new Date().toISOString(),
        });

      case 'database':
        const dbMetrics = await monitor.monitorDatabasePerformance(prisma);
        
        return NextResponse.json({
          database: dbMetrics,
          timestamp: new Date().toISOString(),
        });

      case 'ai':
        const aiQueue = getAIQueue();
        const aiMetrics = monitor.monitorAIPerformance(aiQueue);
        
        return NextResponse.json({
          ai: aiMetrics,
          queueStatus: aiQueue.getQueueStatus(),
          timestamp: new Date().toISOString(),
        });

      case 'system':
        const systemMetrics = monitor.getSystemMetrics();
        
        return NextResponse.json({
          system: systemMetrics,
          timestamp: new Date().toISOString(),
        });

      case 'metrics':
        const metricName = searchParams.get('name');
        const limit = parseInt(searchParams.get('limit') || '100');
        
        const metrics = monitor.getMetrics(metricName, sinceDate, limit);
        
        return NextResponse.json({
          metrics,
          count: metrics.length,
          timestamp: new Date().toISOString(),
        });

      case 'histogram':
        const histogramName = searchParams.get('name');
        if (!histogramName) {
          return NextResponse.json(
            { error: 'Histogram name is required' },
            { status: 400 }
          );
        }
        
        const histogramStats = monitor.getHistogramStats(histogramName);
        
        return NextResponse.json({
          name: histogramName,
          stats: histogramStats,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error generating performance report:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    const monitor = getPerformanceMonitor();

    switch (action) {
      case 'record_metric':
        const { name, value, unit, tags } = data;
        
        if (!name || typeof value !== 'number') {
          return NextResponse.json(
            { error: 'Invalid metric data' },
            { status: 400 }
          );
        }

        monitor.recordValue(name, value, tags);
        
        return NextResponse.json({
          success: true,
          message: 'Metric recorded successfully',
        });

      case 'increment_counter':
        const { counterName, increment = 1, counterTags } = data;
        
        if (!counterName) {
          return NextResponse.json(
            { error: 'Counter name is required' },
            { status: 400 }
          );
        }

        monitor.incrementCounter(counterName, increment, counterTags);
        
        return NextResponse.json({
          success: true,
          message: 'Counter incremented successfully',
          value: monitor.getCounter(counterName),
        });

      case 'clear_metrics':
        const { olderThan } = data;
        
        if (olderThan) {
          monitor.clearOldMetrics(new Date(olderThan));
        } else {
          monitor.clearMetrics();
        }
        
        return NextResponse.json({
          success: true,
          message: 'Metrics cleared successfully',
        });

      case 'start_monitoring':
        const { interval = 60000 } = data;
        
        // Start cache monitoring
        const cacheManager = getClientCacheManager();
        const monitoringInterval = monitor.monitorCachePerformance(cacheManager, interval);
        
        return NextResponse.json({
          success: true,
          message: 'Monitoring started successfully',
          interval,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error handling performance monitoring request:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const monitor = getPerformanceMonitor();
    const systemMetrics = monitor.getSystemMetrics();
    
    // Simple health check based on memory usage
    const memoryUsagePercent = (systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      return new NextResponse(null, { status: 503 }); // Service Unavailable
    }
    
    return new NextResponse(null, { status: 200 });
    
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}