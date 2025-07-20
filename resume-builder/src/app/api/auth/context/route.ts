import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, updateUserContext, trackUserInteraction } from '@/lib/session';

const contextUpdateSchema = z.object({
  profile: z.object({
    industry: z.string().optional(),
    experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
    targetRoles: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    careerGoals: z.array(z.string()).optional(),
  }).optional(),
  preferences: z.object({
    writingStyle: z.enum(['formal', 'casual', 'technical', 'professional']).optional(),
    contentLength: z.enum(['concise', 'detailed']).optional(),
    focusAreas: z.array(z.string()).optional(),
  }).optional(),
});

const interactionSchema = z.object({
  type: z.enum(['suggestion_accepted', 'suggestion_rejected', 'content_generated', 'analysis_requested']),
  data: z.any(),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const contextData = contextUpdateSchema.parse(body);

    const updatedContext = await updateUserContext(user.id, contextData);

    return NextResponse.json({
      message: 'Context updated successfully',
      context: updatedContext.contextData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Context update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const interaction = interactionSchema.parse(body);

    await trackUserInteraction(user.id, {
      ...interaction,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'Interaction tracked successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Interaction tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}