import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAIClients } from '@/lib/ai/clients';
import { AIRequest } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeIds } = await request.json();

    if (!resumeIds || !Array.isArray(resumeIds) || resumeIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 resume IDs are required for comparison' },
        { status: 400 }
      );
    }

    // Fetch resumes
    const resumes = await prisma.resume.findMany({
      where: {
        id: { in: resumeIds },
        userId: session.user.id,
      },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (resumes.length < 2) {
      return NextResponse.json(
        { error: 'Not enough resumes found for comparison' },
        { status: 404 }
      );
    }

    // Generate AI-powered comparison analysis
    const aiClients = getAIClients();
    const comparisonAnalysis = await generateComparisonAnalysis(resumes, aiClients);

    return NextResponse.json({
      analysis: comparisonAnalysis,
    });
  } catch (error) {
    console.error('Error comparing resumes:', error);
    return NextResponse.json(
      { error: 'Failed to compare resumes' },
      { status: 500 }
    );
  }
}

async function generateComparisonAnalysis(resumes: any[], aiClients: any) {
  const analysis = {
    scores: {} as { [resumeId: string]: number },
    strengths: {} as { [resumeId: string]: string[] },
    weaknesses: {} as { [resumeId: string]: string[] },
    recommendations: {} as { [resumeId: string]: string[] },
  };

  try {
    // Build comparison prompt
    const resumeData = resumes.map(resume => ({
      id: resume.id,
      title: resume.title,
      data: resume.data,
      lastScore: resume.analyses[0]?.score || 0,
    }));

    const prompt = `Compare the following ${resumes.length} resumes and provide detailed analysis:

${resumeData.map((resume, index) => `
Resume ${index + 1} (ID: ${resume.id}):
Title: ${resume.title}
Last Score: ${resume.lastScore}%
Content Summary: ${JSON.stringify(resume.data).substring(0, 1000)}...
`).join('\n')}

Please provide a comprehensive comparison analysis in the following JSON format:
{
  "scores": {
    "resume_id_1": 85,
    "resume_id_2": 78
  },
  "strengths": {
    "resume_id_1": ["Strong technical skills section", "Quantified achievements"],
    "resume_id_2": ["Clear career progression", "Industry-specific keywords"]
  },
  "weaknesses": {
    "resume_id_1": ["Missing soft skills", "Could improve summary"],
    "resume_id_2": ["Lacks quantified results", "Too lengthy"]
  },
  "recommendations": {
    "resume_id_1": ["Add soft skills section", "Strengthen professional summary"],
    "resume_id_2": ["Add metrics to achievements", "Condense experience descriptions"]
  }
}

Focus on:
1. Content quality and relevance
2. ATS compatibility
3. Professional presentation
4. Achievement quantification
5. Skills alignment
6. Career progression clarity
7. Industry-specific optimization

Provide specific, actionable insights for each resume.`;

    const request: AIRequest = {
      id: crypto.randomUUID(),
      type: 'analysis',
      prompt,
      context: { resumes: resumeData },
      userId: 'comparison-analysis',
      priority: 'normal',
      timestamp: new Date(),
    };

    const response = await aiClients.generateCompletion(request);
    
    try {
      const parsedAnalysis = JSON.parse(response.content);
      
      // Validate and merge the analysis
      if (parsedAnalysis.scores) {
        Object.assign(analysis.scores, parsedAnalysis.scores);
      }
      if (parsedAnalysis.strengths) {
        Object.assign(analysis.strengths, parsedAnalysis.strengths);
      }
      if (parsedAnalysis.weaknesses) {
        Object.assign(analysis.weaknesses, parsedAnalysis.weaknesses);
      }
      if (parsedAnalysis.recommendations) {
        Object.assign(analysis.recommendations, parsedAnalysis.recommendations);
      }
    } catch (parseError) {
      console.error('Failed to parse AI comparison response:', parseError);
      // Fall back to basic analysis
      return generateBasicComparison(resumes);
    }

    // Fill in missing data with fallbacks
    resumes.forEach(resume => {
      if (!analysis.scores[resume.id]) {
        analysis.scores[resume.id] = resume.analyses[0]?.score || 70;
      }
      if (!analysis.strengths[resume.id]) {
        analysis.strengths[resume.id] = ['Professional formatting', 'Clear structure'];
      }
      if (!analysis.weaknesses[resume.id]) {
        analysis.weaknesses[resume.id] = ['Could benefit from more specific achievements'];
      }
      if (!analysis.recommendations[resume.id]) {
        analysis.recommendations[resume.id] = ['Consider adding quantified results', 'Review for ATS optimization'];
      }
    });

  } catch (error) {
    console.error('Failed to generate AI comparison:', error);
    return generateBasicComparison(resumes);
  }

  return analysis;
}

function generateBasicComparison(resumes: any[]) {
  const analysis = {
    scores: {} as { [resumeId: string]: number },
    strengths: {} as { [resumeId: string]: string[] },
    weaknesses: {} as { [resumeId: string]: string[] },
    recommendations: {} as { [resumeId: string]: string[] },
  };

  resumes.forEach(resume => {
    const resumeData = resume.data;
    const lastScore = resume.analyses[0]?.score || 0;
    
    // Basic scoring based on content completeness
    let score = lastScore || 60;
    
    // Analyze content for basic scoring
    if (resumeData.personalInfo?.summary) score += 5;
    if (resumeData.sections?.find((s: any) => s.type === 'experience')?.items?.length > 0) score += 10;
    if (resumeData.sections?.find((s: any) => s.type === 'education')?.items?.length > 0) score += 5;
    if (resumeData.sections?.find((s: any) => s.type === 'skills')?.items?.length > 0) score += 5;
    
    analysis.scores[resume.id] = Math.min(100, score);

    // Basic strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    if (resumeData.personalInfo?.summary) {
      strengths.push('Includes professional summary');
    } else {
      weaknesses.push('Missing professional summary');
      recommendations.push('Add a compelling professional summary');
    }

    const experienceSection = resumeData.sections?.find((s: any) => s.type === 'experience');
    if (experienceSection?.items?.length > 0) {
      strengths.push('Has professional experience listed');
      
      // Check for quantified achievements
      const hasQuantifiedAchievements = experienceSection.items.some((item: any) => 
        item.achievements?.some((achievement: string) => /\d+/.test(achievement))
      );
      
      if (hasQuantifiedAchievements) {
        strengths.push('Includes quantified achievements');
      } else {
        weaknesses.push('Lacks quantified achievements');
        recommendations.push('Add specific numbers and metrics to achievements');
      }
    } else {
      weaknesses.push('Missing professional experience');
      recommendations.push('Add professional experience section');
    }

    const skillsSection = resumeData.sections?.find((s: any) => s.type === 'skills');
    if (skillsSection?.items?.length > 0) {
      strengths.push('Lists relevant skills');
    } else {
      weaknesses.push('Missing skills section');
      recommendations.push('Add a comprehensive skills section');
    }

    analysis.strengths[resume.id] = strengths;
    analysis.weaknesses[resume.id] = weaknesses;
    analysis.recommendations[resume.id] = recommendations;
  });

  return analysis;
}