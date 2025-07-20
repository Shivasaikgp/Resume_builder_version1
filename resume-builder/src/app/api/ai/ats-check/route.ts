import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAnalysisAgent } from '@/lib/ai/agents/analysis';
import { ResumeDataSchema } from '../../../../types/database';
import { z } from 'zod';

const ATSCheckRequestSchema = z.object({
  resume: ResumeDataSchema,
  jobDescription: z.string().optional()
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
    const validatedData = ATSCheckRequestSchema.parse(body);

    const { resume, jobDescription } = validatedData;

    // Get analysis agent and perform ATS check
    const analysisAgent = getAnalysisAgent();
    const atsResult = await analysisAgent.checkATSCompatibility(resume);

    // If job description is provided, also analyze keyword matching
    let keywordAnalysis = null;
    if (jobDescription) {
      keywordAnalysis = await analysisAgent.analyzeKeywords(resume, undefined, jobDescription);
    }

    return NextResponse.json({
      success: true,
      data: {
        atsResult,
        keywordAnalysis,
        recommendations: [
          ...atsResult.formatting.recommendations,
          ...(keywordAnalysis?.recommendations || [])
        ]
      }
    });

  } catch (error) {
    console.error('ATS check API error:', error);

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
      { error: 'Failed to perform ATS check' },
      { status: 500 }
    );
  }
}