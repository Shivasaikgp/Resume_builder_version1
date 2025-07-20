// Integration tests for Content Generation API endpoints

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST as generatePost } from '../app/api/ai/content/generate/route';
import { POST as enhancePost } from '../app/api/ai/content/enhance/route';
import { POST as bulletPointsPost } from '../app/api/ai/content/bullet-points/route';
import { POST as actionVerbsPost } from '../app/api/ai/content/action-verbs/route';
import { POST as achievementsPost } from '../app/api/ai/content/achievements/route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

const mockAgent = {
  generateSuggestions: vi.fn(),
  enhanceContent: vi.fn(),
  generateBulletPoints: vi.fn(),
  getActionVerbSuggestions: vi.fn(),
  generateAchievementSuggestions: vi.fn()
};

vi.mock('../lib/ai', () => ({
  getContentGenerationAgent: vi.fn(() => mockAgent)
}));

describe('Content Generation API Endpoints', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockUserContext = {
    profile: {
      industry: 'Technology',
      experienceLevel: 'mid' as const,
      targetRoles: ['Software Engineer'],
      skills: ['JavaScript', 'React'],
      careerGoals: ['Technical Leadership']
    },
    preferences: {
      writingStyle: 'formal' as const,
      contentLength: 'detailed' as const,
      focusAreas: ['technical skills']
    },
    history: {
      interactions: [],
      feedbackPatterns: [],
      improvementAreas: []
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/ai/content/generate', () => {
    it('should generate content suggestions successfully', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);
      
      const mockSuggestions = [
        {
          id: '1',
          type: 'bullet_point',
          content: 'Led development of scalable web applications',
          context: 'Technical leadership',
          confidence: 0.9
        }
      ];

      mockAgent.generateSuggestions.mockResolvedValue(mockSuggestions);

      const request = new NextRequest('http://localhost:3000/api/ai/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          context: mockUserContext,
          section: 'experience',
          currentContent: 'Current experience description',
          options: {
            maxSuggestions: 5,
            includeReasoning: true
          }
        })
      });

      const response = await generatePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestions).toEqual(mockSuggestions);
      expect(data.metadata.section).toBe('experience');
    });

    it('should return 401 for unauthenticated requests', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          context: mockUserContext,
          section: 'experience'
        })
      });

      const response = await generatePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 400 for invalid request data', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          section: 'experience'
        })
      });

      const response = await generatePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('/api/ai/content/enhance', () => {
    it('should enhance content successfully', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      const mockEnhancedContent = 'Enhanced content with better action verbs and metrics';

      mockAgent.enhanceContent.mockResolvedValue(mockEnhancedContent);

      const request = new NextRequest('http://localhost:3000/api/ai/content/enhance', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Original content',
          section: 'experience',
          context: mockUserContext
        })
      });

      const response = await enhancePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.enhancedContent).toBe(mockEnhancedContent);
      expect(data.originalContent).toBe('Original content');
    });

    it('should handle enhancement with target job context', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      const mockEnhancedContent = 'Job-specific enhanced content';

      mockAgent.enhanceContent.mockResolvedValue(mockEnhancedContent);

      const targetJob = {
        jobTitle: 'Senior Software Engineer',
        company: 'Google',
        industry: 'Technology'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/content/enhance', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Original content',
          section: 'experience',
          context: mockUserContext,
          targetJob
        })
      });

      const response = await enhancePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.hasTargetJob).toBe(true);
    });
  });

  describe('/api/ai/content/bullet-points', () => {
    it('should generate job-specific bullet points successfully', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      const mockBulletPoints = [
        'Led development of scalable microservices',
        'Implemented CI/CD pipelines',
        'Mentored junior developers'
      ];

      mockAgent.generateBulletPoints.mockResolvedValue(mockBulletPoints);

      const request = new NextRequest('http://localhost:3000/api/ai/content/bullet-points', {
        method: 'POST',
        body: JSON.stringify({
          jobTitle: 'Senior Software Engineer',
          company: 'Google',
          experienceLevel: 'senior',
          industry: 'Technology'
        })
      });

      const response = await bulletPointsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bulletPoints).toEqual(mockBulletPoints);
      expect(data.metadata.jobTitle).toBe('Senior Software Engineer');
      expect(data.metadata.company).toBe('Google');
    });
  });

  describe('/api/ai/content/action-verbs', () => {
    it('should return action verb suggestions successfully', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      const mockSuggestions = [
        {
          id: '1',
          type: 'bullet_point',
          content: 'Led',
          context: 'Leadership action verb',
          confidence: 0.9
        },
        {
          id: '2',
          type: 'bullet_point',
          content: 'Implemented',
          context: 'Technical action verb',
          confidence: 0.8
        }
      ];

      mockAgent.getActionVerbSuggestions.mockReturnValue(mockSuggestions);

      const request = new NextRequest('http://localhost:3000/api/ai/content/action-verbs', {
        method: 'POST',
        body: JSON.stringify({
          currentText: 'worked on project',
          context: mockUserContext,
          maxSuggestions: 8
        })
      });

      const response = await actionVerbsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestions).toEqual(mockSuggestions);
      expect(data.metadata.suggestionsCount).toBe(2);
    });
  });

  describe('/api/ai/content/achievements', () => {
    it('should generate achievement suggestions successfully', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      const mockSuggestions = [
        {
          id: '1',
          type: 'achievement',
          content: 'Increased performance by 40% through optimization',
          context: 'Quantifiable technical achievement',
          confidence: 0.9
        }
      ];

      mockAgent.generateAchievementSuggestions.mockResolvedValue(mockSuggestions);

      const experienceItem = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2022-01',
        endDate: '2023-12',
        description: ['Developed applications']
      };

      const request = new NextRequest('http://localhost:3000/api/ai/content/achievements', {
        method: 'POST',
        body: JSON.stringify({
          experienceItem,
          context: mockUserContext
        })
      });

      const response = await achievementsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestions).toEqual(mockSuggestions);
      expect(data.metadata.jobTitle).toBe('Software Engineer');
    });
  });

  describe('Error handling', () => {
    it('should handle agent errors gracefully', async () => {
      (getServerSession as any).mockResolvedValue(mockSession);

      mockAgent.generateSuggestions.mockRejectedValue(new Error('AI service error'));

      const request = new NextRequest('http://localhost:3000/api/ai/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          context: mockUserContext,
          section: 'experience'
        })
      });

      const response = await generatePost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate content suggestions');
    });
  });
});