// Streaming AI suggestions API endpoint
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { getContentGenerationAgent } from '../../../../../lib/ai';
import { UserContext } from '../../../../../types';
import { z } from 'zod';

const StreamRequestSchema = z.object({
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
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = StreamRequestSchema.parse(body);
    const { content, section, context, options = {} } = validatedData;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamAISuggestions(
            controller,
            encoder,
            content,
            section,
            context as UserContext,
            options
          );
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Streaming failed'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Stream setup error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to start streaming' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function streamAISuggestions(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  content: string,
  section: string,
  context: UserContext,
  options: any
) {
  const agent = getContentGenerationAgent();
  
  // Send initial status
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: 'status',
    message: 'Starting analysis...'
  })}\n\n`));

  // Generate suggestions with streaming
  const suggestions = await agent.generateSuggestions(
    context,
    section,
    content,
    {
      maxSuggestions: options.maxSuggestions,
      includeReasoning: true
    }
  );

  // Stream suggestions one by one with artificial delay for better UX
  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    
    // Stream partial content first
    const partialContent = suggestion.content.substring(0, Math.floor(suggestion.content.length * 0.6));
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'suggestion',
      id: suggestion.id,
      content: partialContent,
      isComplete: false,
      confidence: suggestion.confidence,
      suggestionType: suggestion.type,
      context: suggestion.context
    })}\n\n`));

    // Small delay for streaming effect
    await new Promise(resolve => setTimeout(resolve, 200));

    // Stream complete content
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'suggestion',
      id: suggestion.id,
      content: suggestion.content,
      isComplete: true,
      confidence: suggestion.confidence,
      suggestionType: suggestion.type,
      context: suggestion.context
    })}\n\n`));

    // Delay between suggestions
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Generate content improvement if requested
  if (options.includeImprovement) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'status',
      message: 'Generating content improvements...'
    })}\n\n`));

    try {
      const improvedContent = await agent.enhanceContent({
        content,
        section: section as any,
        context
      });

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'improvement',
        content: improvedContent
      })}\n\n`));
    } catch (error) {
      console.error('Content improvement failed:', error);
    }
  }

  // Generate contextual help if requested
  if (options.includeHelp) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'status',
      message: 'Generating contextual help...'
    })}\n\n`));

    const help = generateContextualHelp(content, section, context);
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'help',
      content: help
    })}\n\n`));
  }

  // Send completion status
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: 'complete',
    message: 'Analysis complete'
  })}\n\n`));
}

function generateContextualHelp(content: string, section: string, context: UserContext): string {
  const experienceLevel = context.profile?.experienceLevel || 'mid';
  const industry = context.profile?.industry || 'general';
  
  const helpMessages: Record<string, string> = {
    experience: `For ${experienceLevel}-level ${industry} roles, focus on quantifiable achievements and specific technologies. Use strong action verbs and include metrics where possible.`,
    skills: `List both technical and soft skills relevant to ${industry}. Group similar skills together and prioritize based on job requirements.`,
    summary: `Write a compelling 2-3 sentence summary highlighting your ${experienceLevel} experience in ${industry}. Focus on your unique value proposition.`,
    education: `Include relevant degrees, certifications, and coursework. For ${experienceLevel} professionals, focus on recent and relevant education.`
  };

  return helpMessages[section] || `Optimize this ${section} section for ${experienceLevel}-level positions in ${industry}. Focus on relevance and impact.`;
}