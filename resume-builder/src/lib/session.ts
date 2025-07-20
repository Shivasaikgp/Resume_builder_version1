import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { redirect } from 'next/navigation';

/**
 * Get the current user session on the server side
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

/**
 * Get the current user session and throw if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin');
  }
  return user;
}

/**
 * Get user with full profile data including context
 */
export async function getUserProfile(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userContext: true,
      resumes: {
        orderBy: { updatedAt: 'desc' },
        take: 5, // Get recent resumes
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });
}

/**
 * Update user context and maintain session continuity
 */
export async function updateUserContext(userId: string, contextData: any) {
  return await prisma.userContext.upsert({
    where: { userId },
    update: {
      contextData: {
        ...contextData,
        lastUpdated: new Date().toISOString(),
      },
    },
    create: {
      userId,
      contextData: {
        ...contextData,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    },
  });
}

/**
 * Get user context for AI agents
 */
export async function getUserContext(userId: string) {
  const userContext = await prisma.userContext.findUnique({
    where: { userId },
  });

  if (!userContext) {
    // Create default context if none exists
    return await updateUserContext(userId, {
      profile: {
        industry: '',
        experienceLevel: 'entry',
        targetRoles: [],
        skills: [],
        careerGoals: [],
      },
      preferences: {
        writingStyle: 'professional',
        contentLength: 'concise',
        focusAreas: [],
      },
      history: {
        interactions: [],
        feedbackPatterns: [],
        improvementAreas: [],
      },
    });
  }

  return userContext;
}

/**
 * Track user interaction for context learning
 */
export async function trackUserInteraction(
  userId: string,
  interaction: {
    type: 'suggestion_accepted' | 'suggestion_rejected' | 'content_generated' | 'analysis_requested';
    data: any;
    timestamp: string;
  }
) {
  const userContext = await getUserContext(userId);
  const currentData = userContext.contextData as any;

  const updatedHistory = {
    ...currentData.history,
    interactions: [
      ...currentData.history.interactions.slice(-49), // Keep last 50 interactions
      interaction,
    ],
  };

  return await updateUserContext(userId, {
    ...currentData,
    history: updatedHistory,
  });
}

/**
 * Session validation utility
 */
export async function validateSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    return null;
  }

  return session;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expires: {
        lt: new Date(),
      },
    },
  });
}

/**
 * Get user's active sessions
 */
export async function getUserSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      expires: {
        gt: new Date(),
      },
    },
    orderBy: { expires: 'desc' },
  });
}

/**
 * Revoke user session
 */
export async function revokeSession(sessionToken: string) {
  return await prisma.session.delete({
    where: { sessionToken },
  });
}

/**
 * Revoke all user sessions (useful for logout from all devices)
 */
export async function revokeAllUserSessions(userId: string) {
  return await prisma.session.deleteMany({
    where: { userId },
  });
}