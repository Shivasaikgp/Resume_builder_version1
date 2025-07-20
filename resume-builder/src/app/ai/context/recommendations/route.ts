import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContextAgent } from '@/lib/ai/context-agent';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ResumeData } from '@/types';

const recommendationsSchema = z.object({
  currentResume: ResumeData.optional(),
  jobDescription: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentResume, jobDescription } = recommendationsSchema.parse(body);

    const contextAgent = getContextAgent();
    const recommendations = await contextAgent.getRecommendations({
      userId: session.user.id,
      currentResume,
      jobDescription,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
} 