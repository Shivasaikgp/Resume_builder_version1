// AI Service Status API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIClients } from '@/lib/ai/clients';
import { getAIQueue } from '@/lib/ai/queue';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const aiClients = getAIClients();
    const queue = getAIQueue();

    // Get health status
    const healthStatus = aiClients.getHealthStatus();
    const availableProviders = aiClients.getAvailableProviders();
    const queueStatus = queue.getQueueStatus();
    const rateLimitStatus = await queue.getRateLimitStatus(session.user.id);

    return NextResponse.json({
      providers: {
        available: availableProviders,
        health: Object.fromEntries(healthStatus),
      },
      queue: queueStatus,
      rateLimit: rateLimitStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Status Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI service status' },
      { status: 500 }
    );
  }
}