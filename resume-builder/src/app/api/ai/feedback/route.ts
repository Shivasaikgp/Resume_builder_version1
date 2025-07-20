import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Feedback schema validation
const FeedbackSchema = z.object({
  type: z.enum(['suggestion', 'analysis', 'general']),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  context: z.object({
    suggestionId: z.string().optional(),
    section: z.string().optional(),
    content: z.string().optional(),
    timestamp: z.string().datetime(),
  }),
});

const BulkFeedbackSchema = z.array(FeedbackSchema);

// POST - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate single feedback or bulk feedback
    let feedbackData;
    let isBulk = false;
    
    try {
      if (Array.isArray(body)) {
        feedbackData = BulkFeedbackSchema.parse(body);
        isBulk = true;
      } else {
        feedbackData = FeedbackSchema.parse(body);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error },
        { status: 400 }
      );
    }

    if (isBulk) {
      // Handle bulk feedback submission
      const feedbackRecords = (feedbackData as z.infer<typeof BulkFeedbackSchema>).map(feedback => ({
        userId: session.user.id,
        type: feedback.type,
        rating: feedback.rating,
        comment: feedback.comment,
        context: feedback.context,
        createdAt: new Date(),
      }));

      await prisma.aiFeedback.createMany({
        data: feedbackRecords,
      });

      return NextResponse.json({
        success: true,
        message: `${feedbackRecords.length} feedback entries recorded`,
      });
    } else {
      // Handle single feedback submission
      const feedback = feedbackData as z.infer<typeof FeedbackSchema>;
      
      const feedbackRecord = await prisma.aiFeedback.create({
        data: {
          userId: session.user.id,
          type: feedback.type,
          rating: feedback.rating,
          comment: feedback.comment,
          context: feedback.context,
          createdAt: new Date(),
        },
      });

      // Update suggestion feedback if applicable
      if (feedback.context.suggestionId) {
        await updateSuggestionFeedback(
          feedback.context.suggestionId,
          feedback.rating,
          session.user.id
        );
      }

      return NextResponse.json({
        success: true,
        feedbackId: feedbackRecord.id,
        message: 'Feedback recorded successfully',
      });
    }
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}

// GET - Retrieve feedback analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'suggestion' | 'analysis' | 'general' | null;
    const timeframe = searchParams.get('timeframe') || '30d';
    const suggestionId = searchParams.get('suggestionId');

    // Calculate date range
    const now = new Date();
    const timeframeMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = timeframeMap[timeframe] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Build query filters
    const where: any = {
      userId: session.user.id,
      createdAt: {
        gte: startDate,
      },
    };

    if (type) {
      where.type = type;
    }

    if (suggestionId) {
      where.context = {
        path: ['suggestionId'],
        equals: suggestionId,
      };
    }

    // Get feedback data
    const feedbackData = await prisma.aiFeedback.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate analytics
    const analytics = calculateFeedbackAnalytics(feedbackData);

    return NextResponse.json({
      success: true,
      data: {
        feedback: feedbackData,
        analytics,
        timeframe,
        totalCount: feedbackData.length,
      },
    });
  } catch (error) {
    console.error('Feedback retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    );
  }
}

// Helper function to update suggestion feedback
async function updateSuggestionFeedback(
  suggestionId: string,
  rating: number,
  userId: string
) {
  try {
    // This would update a suggestions table if we had one
    // For now, we'll just log the feedback
    console.log(`Suggestion ${suggestionId} received rating ${rating} from user ${userId}`);
    
    // In a real implementation, you might:
    // 1. Update suggestion quality scores
    // 2. Adjust AI model parameters
    // 3. Flag low-rated suggestions for review
  } catch (error) {
    console.error('Failed to update suggestion feedback:', error);
  }
}

// Helper function to calculate feedback analytics
function calculateFeedbackAnalytics(feedbackData: any[]) {
  if (feedbackData.length === 0) {
    return {
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      totalFeedback: 0,
      byType: {},
    };
  }

  const totalRating = feedbackData.reduce((sum, feedback) => sum + feedback.rating, 0);
  const averageRating = totalRating / feedbackData.length;

  const ratingDistribution = feedbackData.reduce((dist, feedback) => {
    dist[feedback.rating] = (dist[feedback.rating] || 0) + 1;
    return dist;
  }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  const byType = feedbackData.reduce((types, feedback) => {
    if (!types[feedback.type]) {
      types[feedback.type] = {
        count: 0,
        averageRating: 0,
        totalRating: 0,
      };
    }
    types[feedback.type].count++;
    types[feedback.type].totalRating += feedback.rating;
    types[feedback.type].averageRating = types[feedback.type].totalRating / types[feedback.type].count;
    return types;
  }, {});

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    totalFeedback: feedbackData.length,
    byType,
  };
}