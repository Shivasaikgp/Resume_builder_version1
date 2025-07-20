import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAnalysisAgent } from '@/lib/ai/agents/analysis';
import { ResumeDataSchema, UserContextSchema } from '../../../../types/database';
import { z } from 'zod';

// Request schema for analysis
const AnalysisRequestSchema = z.object({
  resume: ResumeDataSchema,
  context: UserContextSchema.optional(),
  options: z.object({
    includeATSCheck: z.boolean().optional(),
    includeContentAnalysis: z.boolean().optional(),
    includeKeywordAnalysis: z.boolean().optional(),
    targetJobDescription: z.string().optional(),
    priorityThreshold: z.enum(['low', 'medium', 'high']).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AnalysisRequestSchema.parse(body);

    const { resume, context, options = {} } = validatedData;

    // Get analysis agent and perform analysis
    const analysisAgent = getAnalysisAgent();
    const analysis = await analysisAgent.analyzeResume(resume, context, options);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Resume analysis API error:', error);

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
      { error: 'Failed to analyze resume' },
      { status: 500 }
    );
  }
}

// GET endpoint for quick scoring
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resumeData = searchParams.get('resume');
    const contextData = searchParams.get('context');

    if (!resumeData) {
      return NextResponse.json(
        { error: 'Resume data is required' },
        { status: 400 }
      );
    }

    // Parse resume and context data
    const resume = ResumeDataSchema.parse(JSON.parse(resumeData));
    const context = contextData ? UserContextSchema.parse(JSON.parse(contextData)) : undefined;

    // Get analysis agent and generate score
    const analysisAgent = getAnalysisAgent();
    const score = await analysisAgent.scoreResume(resume, context);

    return NextResponse.json({
      success: true,
      data: score
    });

  } catch (error) {
    console.error('Resume scoring API error:', error);

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
      { error: 'Failed to score resume' },
      { status: 500 }
    );
  }
}