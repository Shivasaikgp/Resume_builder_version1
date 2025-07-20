import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getJobOptimizationAgent } from '@/lib/ai/agents/job-optimization';
import { ResumeDataSchema, UserContextSchema } from '../../../../types/database';
import { z } from 'zod';

// Request schema for job optimization
const JobOptimizationRequestSchema = z.object({
  resume: ResumeDataSchema,
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters'),
  context: UserContextSchema.optional(),
  options: z.object({
    includeKeywordAnalysis: z.boolean().optional().default(true),
    includeContentSuggestions: z.boolean().optional().default(true),
    includeStructuralChanges: z.boolean().optional().default(true),
    maxSuggestions: z.number().min(1).max(20).optional().default(10)
  }).optional()
});

// Job analysis request schema
const JobAnalysisRequestSchema = z.object({
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters')
});

// Content generation request schema
const ContentGenerationRequestSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters'),
  userExperience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    description: z.array(z.string()).optional()
  }))
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

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'optimize';

    const jobOptimizationAgent = getJobOptimizationAgent();

    switch (action) {
      case 'optimize':
        return await handleOptimizeResume(request, jobOptimizationAgent);
      
      case 'analyze-job':
        return await handleAnalyzeJob(request, jobOptimizationAgent);
      
      case 'generate-content':
        return await handleGenerateContent(request, jobOptimizationAgent);
      
      case 'match-skills':
        return await handleMatchSkills(request, jobOptimizationAgent);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Job optimization API error:', error);

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
      { error: 'Failed to process job optimization request' },
      { status: 500 }
    );
  }
}

async function handleOptimizeResume(
  request: NextRequest,
  agent: any
): Promise<NextResponse> {
  const body = await request.json();
  const validatedData = JobOptimizationRequestSchema.parse(body);

  const { resume, jobDescription, context, options = {} } = validatedData;

  const optimization = await agent.optimizeResumeForJob(
    resume,
    jobDescription,
    context
  );

  // Apply options to filter results
  if (options.maxSuggestions) {
    optimization.keywordOptimization = optimization.keywordOptimization.slice(0, options.maxSuggestions);
    optimization.contentEnhancements = optimization.contentEnhancements.slice(0, options.maxSuggestions);
    optimization.structuralChanges = optimization.structuralChanges.slice(0, options.maxSuggestions);
  }

  if (!options.includeKeywordAnalysis) {
    delete optimization.keywordOptimization;
  }

  if (!options.includeContentSuggestions) {
    delete optimization.contentEnhancements;
  }

  if (!options.includeStructuralChanges) {
    delete optimization.structuralChanges;
  }

  return NextResponse.json({
    success: true,
    data: optimization
  });
}

async function handleAnalyzeJob(
  request: NextRequest,
  agent: any
): Promise<NextResponse> {
  const body = await request.json();
  const validatedData = JobAnalysisRequestSchema.parse(body);

  const { jobDescription } = validatedData;

  const analysis = await agent.analyzeJobDescription(jobDescription);

  return NextResponse.json({
    success: true,
    data: analysis
  });
}

async function handleGenerateContent(
  request: NextRequest,
  agent: any
): Promise<NextResponse> {
  const body = await request.json();
  const validatedData = ContentGenerationRequestSchema.parse(body);

  const { jobTitle, company, jobDescription, userExperience } = validatedData;

  const contentSuggestions = await agent.generateJobSpecificContent(
    jobTitle,
    company,
    jobDescription,
    userExperience
  );

  return NextResponse.json({
    success: true,
    data: {
      suggestions: contentSuggestions
    }
  });
}

async function handleMatchSkills(
  request: NextRequest,
  agent: any
): Promise<NextResponse> {
  const body = await request.json();
  const validatedData = JobOptimizationRequestSchema.parse(body);

  const { resume, jobDescription } = validatedData;

  // First analyze the job
  const jobAnalysis = await agent.analyzeJobDescription(jobDescription);
  
  // Then match skills and experience
  const matchResults = agent.matchSkillsAndExperience(resume, jobAnalysis);

  return NextResponse.json({
    success: true,
    data: {
      jobAnalysis,
      matchResults
    }
  });
}

// GET endpoint for quick job analysis
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
    const jobDescription = searchParams.get('jobDescription');
    const action = searchParams.get('action') || 'analyze';

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    const jobOptimizationAgent = getJobOptimizationAgent();

    if (action === 'analyze') {
      const analysis = await jobOptimizationAgent.analyzeJobDescription(jobDescription);
      
      return NextResponse.json({
        success: true,
        data: analysis
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Job optimization GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}