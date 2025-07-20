import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getUserProfile, 
  updateUserContext, 
  getUserContext, 
  trackUserInteraction,
  validateSession,
  cleanupExpiredSessions,
  getUserSessions,
  revokeSession,
  revokeAllUserSessions
} from '@/lib/session';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userContext: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should get user profile with context and resumes', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        userContext: {
          contextData: { profile: { industry: 'Technology' } },
        },
        resumes: [
          {
            id: 'resume-1',
            title: 'Software Engineer Resume',
            analyses: [{ score: 85 }],
          },
        ],
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await getUserProfile('user-id');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        include: {
          userContext: true,
          resumes: {
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
              analyses: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
    });
  });

  describe('updateUserContext', () => {
    it('should update user context with timestamp', async () => {
      const contextData = {
        profile: { industry: 'Technology' },
      };

      const mockUpdatedContext = {
        id: 'context-id',
        userId: 'user-id',
        contextData: {
          ...contextData,
          lastUpdated: expect.any(String),
        },
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.userContext.upsert as any).mockResolvedValue(mockUpdatedContext);

      const result = await updateUserContext('user-id', contextData);

      expect(result).toEqual(mockUpdatedContext);
      expect(prisma.userContext.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        update: {
          contextData: {
            ...contextData,
            lastUpdated: expect.any(String),
          },
        },
        create: {
          userId: 'user-id',
          contextData: {
            ...contextData,
            createdAt: expect.any(String),
            lastUpdated: expect.any(String),
          },
        },
      });
    });
  });

  describe('getUserContext', () => {
    it('should return existing user context', async () => {
      const mockContext = {
        id: 'context-id',
        userId: 'user-id',
        contextData: {
          profile: { industry: 'Technology' },
        },
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.userContext.findUnique as any).mockResolvedValue(mockContext);

      const result = await getUserContext('user-id');

      expect(result).toEqual(mockContext);
    });

    it('should create default context if none exists', async () => {
      const mockDefaultContext = {
        id: 'new-context-id',
        userId: 'user-id',
        contextData: {
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
        },
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.userContext.findUnique as any).mockResolvedValue(null);
      (prisma.userContext.upsert as any).mockResolvedValue(mockDefaultContext);

      const result = await getUserContext('user-id');

      expect(result).toEqual(mockDefaultContext);
    });
  });

  describe('trackUserInteraction', () => {
    it('should track user interaction and update context', async () => {
      const existingContext = {
        contextData: {
          history: {
            interactions: [],
            feedbackPatterns: [],
            improvementAreas: [],
          },
        },
      };

      const interaction = {
        type: 'suggestion_accepted' as const,
        data: { suggestion: 'Use action verbs' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.userContext.findUnique as any).mockResolvedValue(existingContext);
      (prisma.userContext.upsert as any).mockResolvedValue({
        ...existingContext,
        contextData: {
          ...existingContext.contextData,
          history: {
            ...existingContext.contextData.history,
            interactions: [interaction],
          },
        },
      });

      await trackUserInteraction('user-id', interaction);

      expect(prisma.userContext.upsert).toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const mockSession = {
        id: 'session-id',
        sessionToken: 'valid-token',
        expires: new Date(Date.now() + 86400000), // 1 day from now
        user: { id: 'user-id', email: 'test@example.com' },
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.session.findUnique as any).mockResolvedValue(mockSession);

      const result = await validateSession('valid-token');

      expect(result).toEqual(mockSession);
    });

    it('should return null for expired session', async () => {
      const mockSession = {
        id: 'session-id',
        sessionToken: 'expired-token',
        expires: new Date(Date.now() - 86400000), // 1 day ago
        user: { id: 'user-id', email: 'test@example.com' },
      };

      const { prisma } = await import('@/lib/prisma');
      (prisma.session.findUnique as any).mockResolvedValue(mockSession);

      const result = await validateSession('expired-token');

      expect(result).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.session.findUnique as any).mockResolvedValue(null);

      const result = await validateSession('non-existent-token');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.session.deleteMany as any).mockResolvedValue({ count: 5 });

      await cleanupExpiredSessions();

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expires: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('getUserSessions', () => {
    it('should get active user sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          sessionToken: 'token-1',
          expires: new Date(Date.now() + 86400000),
        },
        {
          id: 'session-2',
          sessionToken: 'token-2',
          expires: new Date(Date.now() + 172800000),
        },
      ];

      const { prisma } = await import('@/lib/prisma');
      (prisma.session.findMany as any).mockResolvedValue(mockSessions);

      const result = await getUserSessions('user-id');

      expect(result).toEqual(mockSessions);
      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
          expires: {
            gt: expect.any(Date),
          },
        },
        orderBy: { expires: 'desc' },
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke specific session', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.session.delete as any).mockResolvedValue({ id: 'session-id' });

      await revokeSession('session-token');

      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { sessionToken: 'session-token' },
      });
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.session.deleteMany as any).mockResolvedValue({ count: 3 });

      await revokeAllUserSessions('user-id');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
    });
  });
});