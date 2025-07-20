// Context Insights API
// Provides insights about user behavior patterns and context analysis

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContextAgent } from '@/lib/ai/context-agent';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contextAgent = getContextAgent();
    const insights = await contextAgent.getContextualInsights(session.user.id);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Failed to get context insights:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve insights' },
      { status: 500 }
    );
  }
}