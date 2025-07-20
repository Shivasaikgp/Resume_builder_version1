// API endpoint for job-specific bullet point generation
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { z } from 'zod';

const GenerateBulletPointsSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  industry: z.string().optional()
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
    const validatedData = GenerateBulletPointsSchema.parse(body);

    const { jobTitle, company, experienceLevel, industry } = validatedData;

    // Get content generation agent
    const agent = getContentGenerationAgent();

    // Generate job-specific bullet points
    const bulletPoints = await agent.generateBulletPoints(
      jobTitle,
      company,
      experienceLevel,
      industry
    );

    return NextResponse.json({
      success: true,
      bulletPoints,
      metadata: {
        jobTitle,
        company,
        experienceLevel,
        industry,
        count: bulletPoints?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bullet point generation error:', error);

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
      { error: 'Failed to generate bullet points' },
      { status: 500 }
    );
  }
}