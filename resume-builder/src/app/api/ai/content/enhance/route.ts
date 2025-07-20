// API endpoint for content enhancement
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { UserContext } from '../../../../../types';
import { z } from 'zod';

const EnhanceContentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  section: z.enum(['experience', 'skills', 'summary', 'achievements']),
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
  targetJob: z.object({
    jobTitle: z.string(),
    company: z.string(),
    industry: z.string().optional(),
    jobDescription: z.string().optional()
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
    const validatedData = EnhanceContentSchema.parse(body);

    const { content, section, context, targetJob } = validatedData;

    // Get content generation agent
    const agent = getContentGenerationAgent();

    // Enhance content
    const enhancedContent = await agent.enhanceContent({
      content,
      section,
      context: context as UserContext,
      targetJob
    });

    return NextResponse.json({
      success: true,
      originalContent: content,
      enhancedContent,
      metadata: {
        section,
        hasTargetJob: !!targetJob,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Content enhancement error:', error);

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
      { error: 'Failed to enhance content' },
      { status: 500 }
    );
  }
}