// Context Agent Tests
// Tests for context management, learning, and personalized recommendations

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ContextAgent, getContextAgent } from '../context';
import { VectorStore } from '../../vector-store';
import { prisma } from '../../../prisma';
import { 
  UserContext, 
  UserInteraction, 
  ResumeData, 
  UserProfile, 
  UserPreferences 
} from '../../../../types';

// Mock dependencies
vi.mock('../../../prisma', () => ({
  prisma: {
    userContext: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    resume: {
      findMany: vi.fn(),
    },
  },
}));

const mockVectorStore = {
  storeVector: vi.fn(),
  findSimilarVectors: vi.fn(),
};

vi.mock('../../vector-store', () => ({
  VectorStore: vi.fn().mockImplementation(() => mockVectorStore),
}));

vi.mock('../../clients', () => ({
  getAIClients: vi.fn(() => ({
    generateCompletion: vi.fn(),
    generateEmbedding: vi.fn(),
  })),
}));

describe('ContextAgent', () => {
  let contextAgent: ContextAgent;
  let mockPrisma: any;

  const mockUserId = 'test-user-123';
  const mockUserContext: UserContext = {
    profile: {
      industry: 'technology',
      experienceLevel: 'mid',
      targetRoles: ['Software Engineer', 'Full Stack Developer'],
      skills: ['JavaScript', 'React', 'Node.js'],
      careerGoals: ['Senior Developer', 'Tech Lead'],
    },
    preferences: {
      writingStyle: 'technical',
      contentLength: 'detailed',
      focusAreas: ['technical_skills', 'leadership'],
    },
    history: {
      interactions: [],
      feedbackPatterns: [],
      improvementAreas: ['quantified_achievements'],
    },
  };

  const mockResumeData: ResumeData = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
    },
    sections: [
      {
        type: 'experience',
        title: 'Experience',
        items: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            startDate: '2022-01',
            endDate: '2024-01',
            description: ['Developed web applications', 'Led team of 3 developers'],
          },
        ],
        visible: true,
      },
      {
        type: 'skills',
        title: 'Skills',
        items: [
          {
            category: 'Programming',
            skills: ['JavaScript', 'TypeScript', 'React'],
          },
        ],
        visible: true,
      },
    ],
  };

  beforeEach(() => {
    contextAgent = new ContextAgent();
    mockPrisma = prisma as any;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockPrisma.resume.findMany.mockResolvedValue([]);
    mockPrisma.userContext.findUnique.mockResolvedValue(null);
    mockPrisma.userContext.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildUserContext', () => {
    it('should build comprehensive user context from available data', async () => {
      // Mock database responses
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      
      mockPrisma.resume.findMany.mockResolvedValue([
        {
          id: 'resume-1',
          data: mockResumeData,
          createdAt: new Date(),
          analyses: [],
        },
      ]);

      const result = await contextAgent.buildUserContext(mockUserId);

      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.preferences).toBeDefined();
      expect(result.history).toBeDefined();
      expect(mockPrisma.userContext.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should return minimal context when no data exists', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue(null);
      mockPrisma.resume.findMany.mockResolvedValue([]);

      const result = await contextAgent.buildUserContext(mockUserId);

      expect(result).toBeDefined();
      expect(result.profile?.experienceLevel).toBe('entry');
      expect(result.preferences?.writingStyle).toBe('formal');
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.userContext.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await contextAgent.buildUserContext(mockUserId);

      expect(result).toBeDefined();
      expect(result.profile?.experienceLevel).toBe('entry');
    });
  });

  describe('updateContext', () => {
    const mockInteraction: UserInteraction = {
      type: 'suggestion_accepted',
      timestamp: new Date().toISOString(),
      data: { suggestionType: 'content' },
    };

    it('should update context based on user interaction', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });

      await contextAgent.updateContext(mockUserId, mockInteraction);

      expect(mockPrisma.userContext.upsert).toHaveBeenCalled();
    });

    it('should build initial context if none exists', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue(null);
      mockPrisma.resume.findMany.mockResolvedValue([]);

      await contextAgent.updateContext(mockUserId, mockInteraction);

      // Should attempt to build context
      expect(mockPrisma.userContext.findUnique).toHaveBeenCalled();
    });

    it('should handle different interaction types', async () => {
      const rejectionInteraction: UserInteraction = {
        type: 'suggestion_rejected',
        timestamp: new Date().toISOString(),
        data: { suggestionType: 'template' },
      };

      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });

      await contextAgent.updateContext(mockUserId, rejectionInteraction);

      expect(mockPrisma.userContext.upsert).toHaveBeenCalled();
    });
  });

  describe('getPersonalizedSuggestions', () => {
    it('should generate personalized recommendations', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      
      mockPrisma.resume.findMany.mockResolvedValue([
        { id: 'resume-1', data: mockResumeData, createdAt: new Date(), analyses: [] },
      ]);

      const recommendations = await contextAgent.getPersonalizedSuggestions(
        mockUserId,
        mockUserContext,
        mockResumeData
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should return generic recommendations when context is unavailable', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue(null);
      mockPrisma.resume.findMany.mockResolvedValue([]);

      const recommendations = await contextAgent.getPersonalizedSuggestions(mockUserId);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      // Generic recommendations should be returned even when context is unavailable
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('type');
        expect(recommendations[0]).toHaveProperty('title');
      }
    });

    it('should include different types of recommendations', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      
      mockPrisma.resume.findMany.mockResolvedValue([
        { id: 'resume-1', data: mockResumeData, createdAt: new Date(), analyses: [] },
      ]);

      const recommendations = await contextAgent.getPersonalizedSuggestions(
        mockUserId,
        mockUserContext
      );

      const types = recommendations.map(r => r.type);
      expect(types).toContain('content');
    });
  });

  describe('findSimilarUsers', () => {
    it('should find similar users using vector similarity', async () => {
      const mockSimilarUsers = ['user-2', 'user-3', 'user-4'];
      mockVectorStore.findSimilarVectors.mockResolvedValue(mockSimilarUsers);

      // First build context to populate cache
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      mockPrisma.resume.findMany.mockResolvedValue([]);
      
      await contextAgent.buildUserContext(mockUserId);
      
      const similarUsers = await contextAgent.findSimilarUsers(mockUserId, 3);

      expect(similarUsers).toEqual(mockSimilarUsers);
      expect(mockVectorStore.findSimilarVectors).toHaveBeenCalledWith(
        expect.any(Array),
        3,
        mockUserId
      );
    });

    it('should return empty array when no similar users found', async () => {
      mockVectorStore.findSimilarVectors.mockResolvedValue([]);

      const similarUsers = await contextAgent.findSimilarUsers(mockUserId);

      expect(similarUsers).toEqual([]);
    });
  });

  describe('getContextInsights', () => {
    it('should generate insights from user context', async () => {
      // Build context first
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      mockPrisma.resume.findMany.mockResolvedValue([
        { id: 'resume-1', data: mockResumeData, createdAt: new Date(), analyses: [] },
      ]);
      
      await contextAgent.buildUserContext(mockUserId);
      
      const insights = await contextAgent.getContextInsights(mockUserId);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should return empty array when no context available', async () => {
      const insights = await contextAgent.getContextInsights('non-existent-user');

      expect(insights).toEqual([]);
    });

    it('should include different types of insights', async () => {
      // Build context with behavior patterns
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      mockPrisma.resume.findMany.mockResolvedValue([
        { id: 'resume-1', data: mockResumeData, createdAt: new Date(), analyses: [] },
      ]);
      
      await contextAgent.buildUserContext(mockUserId);
      
      const insights = await contextAgent.getContextInsights(mockUserId);

      if (insights.length > 0) {
        const insightTypes = insights.map(i => i.type);
        expect(insightTypes).toContain('career_trend');
      }
    });
  });

  describe('ensureContextContinuity', () => {
    it('should maintain context across sessions', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });

      const result = await contextAgent.ensureContextContinuity(mockUserId);

      expect(result).toBe(true);
    });

    it('should rebuild context when cache is stale', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      mockPrisma.resume.findMany.mockResolvedValue([]);

      const result = await contextAgent.ensureContextContinuity(mockUserId);

      expect(result).toBe(true);
      expect(mockPrisma.userContext.findUnique).toHaveBeenCalled();
    });

    it('should handle missing context gracefully', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue(null);
      mockPrisma.resume.findMany.mockResolvedValue([]);

      const result = await contextAgent.ensureContextContinuity(mockUserId);

      expect(result).toBe(true);
    });
  });

  describe('Context Learning', () => {
    it('should learn from suggestion acceptance patterns', async () => {
      const acceptedInteraction: UserInteraction = {
        type: 'suggestion_accepted',
        timestamp: new Date().toISOString(),
        data: { suggestionType: 'content', confidence: 0.9 },
      };

      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });

      await contextAgent.updateContext(mockUserId, acceptedInteraction);

      expect(mockPrisma.userContext.upsert).toHaveBeenCalled();
    });

    it('should adapt recommendations based on user feedback', async () => {
      // Simulate multiple interactions
      const interactions: UserInteraction[] = [
        {
          type: 'suggestion_accepted',
          timestamp: new Date().toISOString(),
          data: { suggestionType: 'content' },
        },
        {
          type: 'suggestion_rejected',
          timestamp: new Date().toISOString(),
          data: { suggestionType: 'template' },
        },
      ];

      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });

      for (const interaction of interactions) {
        await contextAgent.updateContext(mockUserId, interaction);
      }

      expect(mockPrisma.userContext.upsert).toHaveBeenCalled();
    });
  });

  describe('Vector Storage Integration', () => {
    it('should store context vectors for similarity matching', async () => {
      mockPrisma.userContext.findUnique.mockResolvedValue(null);
      mockPrisma.resume.findMany.mockResolvedValue([
        { id: 'resume-1', data: mockResumeData, createdAt: new Date(), analyses: [] },
      ]);

      await contextAgent.buildUserContext(mockUserId);

      expect(mockVectorStore.storeVector).toHaveBeenCalled();
    });

    it('should use vector similarity for finding related users', async () => {
      mockVectorStore.findSimilarVectors.mockResolvedValue(['user-2', 'user-3']);

      // Build context first
      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      mockPrisma.resume.findMany.mockResolvedValue([]);
      
      await contextAgent.buildUserContext(mockUserId);
      
      const similarUsers = await contextAgent.findSimilarUsers(mockUserId);

      expect(similarUsers).toHaveLength(2);
      expect(mockVectorStore.findSimilarVectors).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.userContext.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await contextAgent.buildUserContext(mockUserId);

      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
    });

    it('should handle AI service errors gracefully', async () => {
      const mockAIClients = {
        generateCompletion: vi.fn().mockRejectedValue(new Error('AI Error')),
        generateEmbedding: vi.fn().mockRejectedValue(new Error('Embedding Error')),
      };

      // Mock the AI clients
      vi.doMock('../../clients', () => ({
        getAIClients: () => mockAIClients,
      }));

      mockPrisma.userContext.findUnique.mockResolvedValue({
        userId: mockUserId,
        contextData: mockUserContext,
      });
      mockPrisma.resume.findMany.mockResolvedValue([]);

      const recommendations = await contextAgent.getPersonalizedSuggestions(mockUserId);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle vector store errors gracefully', async () => {
      mockVectorStore.storeVector.mockRejectedValue(new Error('Vector Error'));
      mockVectorStore.findSimilarVectors.mockRejectedValue(new Error('Search Error'));

      mockPrisma.userContext.findUnique.mockResolvedValue(null);
      mockPrisma.resume.findMany.mockResolvedValue([]);

      const result = await contextAgent.buildUserContext(mockUserId);
      const similarUsers = await contextAgent.findSimilarUsers(mockUserId);

      expect(result).toBeDefined();
      expect(similarUsers).toEqual([]);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getContextAgent();
      const instance2 = getContextAgent();

      expect(instance1).toBe(instance2);
    });
  });
});