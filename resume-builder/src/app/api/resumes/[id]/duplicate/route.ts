import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContextAgent } from '@/lib/ai/agents/context';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, targetJob, targetCompany, modifications } = body;

    // Find the original resume
    const originalResume = await prisma.resume.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!originalResume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Get user context for intelligent copying
    const contextAgent = new ContextAgent();
    const userContext = await contextAgent.buildUserContext(session.user.id);

    // Create context-aware copy with AI suggestions
    let duplicatedData = { ...originalResume.data };
    let duplicatedMetadata = { ...originalResume.metadata };

    // Apply context-aware modifications if target job/company provided
    if (targetJob || targetCompany) {
      const optimizationSuggestions = await contextAgent.getJobSpecificSuggestions(
        userContext,
        { targetJob, targetCompany }
      );

      // Apply suggested modifications to the duplicated data
      if (optimizationSuggestions.length > 0) {
        duplicatedData = await contextAgent.applyOptimizations(
          duplicatedData,
          optimizationSuggestions
        );
      }

      // Update metadata with target information
      duplicatedMetadata = {
        ...duplicatedMetadata,
        targetJob,
        targetCompany,
        version: 1,
        tags: [
          ...(duplicatedMetadata.tags || []),
          ...(targetJob ? [`job:${targetJob}`] : []),
          ...(targetCompany ? [`company:${targetCompany}`] : []),
        ].filter((tag, index, arr) => arr.indexOf(tag) === index), // Remove duplicates
      };
    }

    // Apply any custom modifications
    if (modifications) {
      duplicatedData = { ...duplicatedData, ...modifications };
    }

    // Generate intelligent title if not provided
    const duplicatedTitle = title || await contextAgent.generateResumeTitle(
      originalResume.title,
      { targetJob, targetCompany }
    );

    // Create the duplicated resume
    const duplicatedResume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        title: duplicatedTitle,
        data: duplicatedData,
        templateConfig: originalResume.templateConfig,
        metadata: duplicatedMetadata,
      },
    });

    // Update user context with duplication activity
    await contextAgent.updateContext(session.user.id, {
      type: 'resume_duplicated',
      data: {
        originalResumeId: params.id,
        duplicatedResumeId: duplicatedResume.id,
        targetJob,
        targetCompany,
      },
    });

    return NextResponse.json({ 
      resume: duplicatedResume,
      suggestions: optimizationSuggestions || [],
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating resume:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate resume' },
      { status: 500 }
    );
  }
}