// Personalized Recommendations API
// Provides AI-powered personalized recommendations based on user context

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContextualRecommendations } from '@/lib/ai/context-agent';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ResumeData } from '../../../../../types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentResume } = body;

    const contextAgent = getContextualRecommendations();
    
    // Ensure context continuity
    await contextAgent.ensureContextContinuity(session.user.id);
    
    // Get personalized recommendations
    const recommendations = await contextAgent.getPersonalizedSuggestions(
      session.user.id,
      undefined, // Let the agent build/retrieve context
      currentResume as ResumeData
    );

    return NextResponse.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Failed to get personalized recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contextAgent = getContextualRecommendations();
    
    // Get general recommendations without specific resume context
    const recommendations = await contextAgent.getPersonalizedSuggestions(
      session.user.id
    );

    return NextResponse.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}