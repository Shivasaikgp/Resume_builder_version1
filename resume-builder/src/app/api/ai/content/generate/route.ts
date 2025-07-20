// API endpoint for content generation
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { UserContext } from '../../../../../types';
import { z } from 'zod';

const GenerateContentSchema = z.object({
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
  section: z.string(),
  currentContent: z.string().optional(),
  options: z.object({
    maxSuggestions: z.number().min(1).max(10).default(5),
    includeReasoning: z.boolean().default(true),
    contextWeight: z.number().min(0).max(1).default(0.8)
  }).optional()
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
    const validatedData = GenerateContentSchema.parse(body);

    const { context, section, currentContent, options = {} } = validatedData;

    // Get content generation agent
    const agent = getContentGenerationAgent();

    // Generate suggestions
    const suggestions = await agent.generateSuggestions(
      context as UserContext,
      section,
      currentContent,
      options
    );

    return NextResponse.json({
      success: true,
      suggestions,
      metadata: {
        section,
        suggestionsCount: suggestions?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Content generation error:', error);

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
      { error: 'Failed to generate content suggestions' },
      { status: 500 }
    );
  }
}