// API endpoint for action verb suggestions
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { UserContext } from '../../../../../types';
import { z } from 'zod';

const ActionVerbsSchema = z.object({
  currentText: z.string().default(''),
  context: z.object({
    profile: z.object({
      industry: z.string().optional(),
      experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
      targetRoles: z.array(z.string()).default([]),
      skills: z.array(z.string()).default([]),
      careerGoals: z.array(z.string()).default([])
    }).optional(),
    preferences: z.object({
      writingStyle: z.enum(['formal', 'casual', 'technical']).default('formal'),
      contentLength: z.enum(['concise', 'detailed']).default('detailed'),
      focusAreas: z.array(z.string()).default([])
    }).optional(),
    history: z.object({
      interactions: z.array(z.any()).default([]),
      feedbackPatterns: z.array(z.any()).default([]),
      improvementAreas: z.array(z.string()).default([])
    }).optional()
  }),
  maxSuggestions: z.number().min(1).max(15).default(8)
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ActionVerbsSchema.parse(body);

    const { currentText, context, maxSuggestions } = validatedData;

    // Get content generation agent
    const agent = getContentGenerationAgent();

    // Get action verb suggestions
    const suggestions = agent.getActionVerbSuggestions(
      currentText,
      context as UserContext,
      maxSuggestions
    );

    return NextResponse.json({
      success: true,
      suggestions,
      metadata: {
        currentText: currentText.substring(0, 50) + (currentText.length > 50 ? '...' : ''),
        suggestionsCount: suggestions?.length || 0,
        maxRequested: maxSuggestions,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Action verb suggestions error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get action verb suggestions' },
      { status: 500 }
    );
  }
}