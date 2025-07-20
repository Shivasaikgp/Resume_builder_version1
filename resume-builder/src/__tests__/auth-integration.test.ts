import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { GET as sessionGET } from '@/app/api/auth/session/route';
import { PUT as contextPUT, POST as contextPOST } from '@/app/api/auth/context/route';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    userContext: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserContext: vi.fn(),
  trackUserInteraction: vi.fn(),
}));

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('should handle complete user registration and context setup', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock user doesn't exist
      (prisma.user.findUnique as any).mockResolvedValue(null);
      
      // Mock user creation
      const mockUser = {
        id: 'new-user-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      };
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('User created successfully');
      expect(data.user.email).toBe('test@example.com');
    });
  });

  describe('Session Management Flow', () => {
    it('should get user session with profile data', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com', name: 'Test User' };
      const mockProfile = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        createdAt: new Date(),
        userContext: {
          contextData: {
            profile: { industry: 'Technology' },
          },
        },
        resumes: [
          {
            id: 'resume-1',
            title: 'Software Engineer Resume',
            updatedAt: new Date(),
            analyses: [{ score: 85 }],
          },
        ],
      };

      const { getCurrentUser, getUserProfile } = await import('@/lib/session');
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (getUserProfile as any).mockResolvedValue(mockProfile);

      const request = new NextRequest('http://localhost:3000/api/auth/session');
      const response = await sessionGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe('user-id');
      expect(data.context).toEqual({ profile: { industry: 'Technology' } });
      expect(data.recentResumes).toHaveLength(1);
    });

    it('should return 401 for unauthenticated session request', async () => {
      const { getCurrentUser } = await import('@/lib/session');
      (getCurrentUser as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/session');
      const response = await sessionGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });
  });

  describe('Context Management Flow', () => {
    it('should update user context', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockUpdatedContext = {
        contextData: {
          profile: { industry: 'Healthcare', experienceLevel: 'mid' },
        },
      };

      const { getCurrentUser, updateUserContext } = await import('@/lib/session');
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (updateUserContext as any).mockResolvedValue(mockUpdatedContext);

      const request = new NextRequest('http://localhost:3000/api/auth/context', {
        method: 'PUT',
        body: JSON.stringify({
          profile: {
            industry: 'Healthcare',
            experienceLevel: 'mid',
          },
        }),
      });

      const response = await contextPUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Context updated successfully');
      expect(updateUserContext).toHaveBeenCalledWith('user-id', {
        profile: {
          industry: 'Healthcare',
          experienceLevel: 'mid',
        },
      });
    });

    it('should track user interactions', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };

      const { getCurrentUser, trackUserInteraction } = await import('@/lib/session');
      (getCurrentUser as any).mockResolvedValue(mockUser);
      (trackUserInteraction as any).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/context', {
        method: 'POST',
        body: JSON.stringify({
          type: 'suggestion_accepted',
          data: { suggestion: 'Use action verbs' },
        }),
      });

      const response = await contextPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Interaction tracked successfully');
      expect(trackUserInteraction).toHaveBeenCalledWith('user-id', {
        type: 'suggestion_accepted',
        data: { suggestion: 'Use action verbs' },
        timestamp: expect.any(String),
      });
    });

    it('should validate context update data', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };

      const { getCurrentUser } = await import('@/lib/session');
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/context', {
        method: 'PUT',
        body: JSON.stringify({
          profile: {
            experienceLevel: 'invalid-level', // Invalid enum value
          },
        }),
      });

      const response = await contextPUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock database error
      (prisma.user.findUnique as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle session service errors', async () => {
      const { getCurrentUser } = await import('@/lib/session');
      (getCurrentUser as any).mockRejectedValue(new Error('Session service error'));

      const request = new NextRequest('http://localhost:3000/api/auth/session');
      const response = await sessionGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});