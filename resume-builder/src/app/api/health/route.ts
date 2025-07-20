import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/cache/redis-client';

export async function GET() {
  try {
    // Check database connection
    await prisma.$connect();
    await prisma.$disconnect();

    // Check Redis connection
    const redisPing = await redis.ping();
    if (redisPing !== 'PONG') {
      throw new Error('Redis connection failed');
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        details: errorMessage,
      },
      { status: 503 }
    );
  }
}