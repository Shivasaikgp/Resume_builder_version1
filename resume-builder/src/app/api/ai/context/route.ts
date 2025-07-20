// Context Management API Routes
// Handles user context building, updates, and personalized recommendations

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateContext } from '@/lib/ai/context-agent';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getContextAgent } from '../../../../lib/ai/agents/context';
import { UserInteraction } from '../../../../types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contextAgent = getContextAgent();
    const userContext = await contextAgent.buildUserContext(session.user.id);

    return NextResponse.json({
      success: true,
      context: userContext
    });
  } catch (error) {
    console.error('Failed to get user context:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user context' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { interaction } = body;

    if (!interaction) {
      return NextResponse.json(
        { error: 'Interaction data is required' },
        { status: 400 }
      );
    }

    const contextAgent = getContextAgent();
    await contextAgent.updateContext(session.user.id, interaction as UserInteraction);

    return NextResponse.json({
      success: true,
      message: 'Context updated successfully'
    });
  } catch (error) {
    console.error('Failed to update user context:', error);
    return NextResponse.json(
      { error: 'Failed to update user context' },
      { status: 500 }
    );
  }
}