// API endpoint for achievement-focused suggestions
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { UserContext, ExperienceItem } from '../../../../../types';
import { z } from 'zod';

const AchievementSuggestionsSchema = z.object({
  experienceItem: z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company name is required'),
    location: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    description: z.array(z.string()).optional()
  }),
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
  })
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
    const validatedData = AchievementSuggestionsSchema.parse(body);

    const { experienceItem, context } = validatedData;

    // Get content generation agent
    const agent = getContentGenerationAgent();

    // Generate achievement suggestions
    const suggestions = await agent.generateAchievementSuggestions(
      experienceItem as ExperienceItem,
      context as UserContext
    );

    return NextResponse.json({
      success: true,
      suggestions,
      metadata: {
        jobTitle: experienceItem.title,
        company: experienceItem.company,
        suggestionsCount: suggestions?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Achievement suggestions error:', error);

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
      { error: 'Failed to generate achievement suggestions' },
      { status: 500 }
    );
  }
}