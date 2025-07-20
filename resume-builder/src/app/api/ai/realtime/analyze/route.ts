// Real-time batch analysis API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { UserContext } from '../../../../../types';
import { z } from 'zod';

const AnalyzeRequestSchema = z.object({
  content: z.string().min(1),
  section: z.string(),
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
  options: z.object({
    maxSuggestions: z.number().min(1).max(10).default(5),
    includeImprovement: z.boolean().default(true),
    includeHelp: z.boolean().default(true)
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

    // Parse and validate request
    const body = await request.json();
    const validatedData = AnalyzeRequestSchema.parse(body);
    const { content, section, context, options = {} } = validatedData;

    const agent = getContentGenerationAgent();
    
    // Generate suggestions
    const suggestions = await agent.generateSuggestions(
      context as UserContext,
      section,
      content,
      {
        maxSuggestions: options.maxSuggestions,
        includeReasoning: true
      }
    );

    let improvedContent = null;
    if (options.includeImprovement) {
      try {
        improvedContent = await agent.enhanceContent({
          content,
          section: section as any,
          context: context as UserContext
        });
      } catch (error) {
        console.error('Content improvement failed:', error);
      }
    }

    let contextualHelp = null;
    if (options.includeHelp) {
      contextualHelp = generateContextualHelp(content, section, context as UserContext);
    }

    return NextResponse.json({
      success: true,
      suggestions,
      improvedContent,
      contextualHelp,
      metadata: {
        section,
        contentLength: content.length,
        suggestionsCount: suggestions.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Real-time analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}

function generateContextualHelp(content: string, section: string, context: UserContext): string {
  const experienceLevel = context.profile?.experienceLevel || 'mid';
  const industry = context.profile?.industry || 'general';
  const contentLength = content.length;
  
  // Analyze content characteristics
  const hasNumbers = /\d/.test(content);
  const hasActionVerbs = /^(Led|Managed|Developed|Implemented|Created|Built|Designed|Achieved)/i.test(content);
  const hasMetrics = /(\d+%|\$\d+|increased|decreased|improved|reduced)/i.test(content);
  
  let help = '';
  
  switch (section) {
    case 'experience':
      help = `For ${experienceLevel}-level ${industry} roles: `;
      if (!hasActionVerbs) {
        help += 'Start with strong action verbs like "Led," "Developed," or "Achieved." ';
      }
      if (!hasMetrics) {
        help += 'Include quantifiable results (percentages, dollar amounts, time saved). ';
      }
      if (contentLength < 50) {
        help += 'Expand with specific technologies, team sizes, or project scope. ';
      }
      break;
      
    case 'skills':
      help = `For ${industry} positions: `;
      help += 'Group technical and soft skills separately. Prioritize skills mentioned in job descriptions. ';
      if (contentLength < 30) {
        help += 'Add more relevant skills and technologies. ';
      }
      break;
      
    case 'summary':
      help = `Professional summary for ${experienceLevel} ${industry} roles: `;
      if (contentLength < 100) {
        help += 'Expand to 2-3 sentences highlighting your unique value. ';
      }
      if (contentLength > 300) {
        help += 'Keep it concise - focus on your top 2-3 achievements. ';
      }
      break;
      
    default:
      help = `Optimize this ${section} section for ${experienceLevel}-level positions. `;
      help += 'Focus on relevance, impact, and specific achievements.';
  }
  
  return help.trim();
}