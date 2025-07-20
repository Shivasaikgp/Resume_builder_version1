// Unit tests for ContentGenerationAgent

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentGenerationAgent, getContentGenerationAgent } from '../content-generation';
import { UserContext, ExperienceItem } from '../../../../types';
import { getAIClients } from '../../clients';

// Mock the AI clients
vi.mock('../../clients', () => ({
  getAIClients: vi.fn()
}));

describe('ContentGenerationAgent', () => {
  let agent: ContentGenerationAgent;
  let mockAIClients: any;

  const mockUserContext: UserContext = {
    profile: {
      industry: 'Technology',
      experienceLevel: 'mid',
      targetRoles: ['Software Engineer', 'Full Stack Developer'],
      skills: ['JavaScript', 'React', 'Node.js'],
      careerGoals: ['Technical Leadership']
    },
    preferences: {
      writingStyle: 'formal',
      contentLength: 'detailed',
      focusAreas: ['technical skills', 'leadership']
    },
    history: {
      interactions: [],
      feedbackPatterns: [],
      improvementAreas: []
    }
  };

  const mockExperienceItem: ExperienceItem = {
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    startDate: '2022-01',
    endDate: '2023-12',
    current: false,
    description: ['Developed web applications', 'Worked with team']
  };

  beforeEach(() => {
    mockAIClients = {
      generateCompletion: vi.fn()
    };
    (getAIClients as any).mockReturnValue(mockAIClients);
    agent = new ContentGenerationAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSuggestions', () => {
    it('should generate content suggestions using AI', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            type: 'bullet_point',
            content: 'Led development of scalable web applications using React and Node.js',
            context: 'Technical leadership with specific technologies',
            confidence: 0.9,
            reasoning: 'Combines leadership with technical skills relevant to user profile'
          },
          {
            type: 'achievement',
            content: 'Improved application performance by 40% through code optimization',
            context: 'Quantifiable technical achievement',
            confidence: 0.85,
            reasoning: 'Shows measurable impact with specific metrics'
          }
        ])
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const suggestions = await agent.generateSuggestions(
        mockUserContext,
        'experience',
        'Current experience description'
      );

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toMatchObject({
        type: 'bullet_point',
        content: 'Led development of scalable web applications using React and Node.js',
        context: 'Technical leadership with specific technologies',
        confidence: 0.9
      });
      expect(suggestions[0].id).toBeDefined();
      expect(suggestions[0].reasoning).toBeDefined();
    });

    it('should handle AI service failures with fallback suggestions', async () => {
      mockAIClients.generateCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const suggestions = await agent.generateSuggestions(
        mockUserContext,
        'experience',
        'Current experience description'
      );

      expect(suggestions).toBeInstanceOf(Array);
      expect(mockAIClients.generateCompletion).toHaveBeenCalled();
    });

    it('should respect maxSuggestions option', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'bullet_point', content: 'Suggestion 1', context: 'Context 1', confidence: 0.9 },
          { type: 'bullet_point', content: 'Suggestion 2', context: 'Context 2', confidence: 0.8 },
          { type: 'bullet_point', content: 'Suggestion 3', context: 'Context 3', confidence: 0.7 }
        ])
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const suggestions = await agent.generateSuggestions(
        mockUserContext,
        'experience',
        undefined,
        { maxSuggestions: 2 }
      );

      expect(suggestions).toHaveLength(3); // AI returns 3, but we requested 2 max
      expect(mockAIClients.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ maxSuggestions: 2 })
        })
      );
    });
  });

  describe('enhanceContent', () => {
    it('should enhance content using AI', async () => {
      const mockResponse = {
        content: 'Led development of high-performance web applications using React and Node.js, resulting in 25% improved user engagement'
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const enhanced = await agent.enhanceContent({
        content: 'Worked on web applications with React and Node.js',
        section: 'experience',
        context: mockUserContext
      });

      expect(enhanced).toBe('Led development of high-performance web applications using React and Node.js, resulting in 25% improved user engagement');
      expect(mockAIClients.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'content-generation',
          context: expect.objectContaining({
            section: 'experience',
            originalContent: 'Worked on web applications with React and Node.js',
            userContext: mockUserContext
          })
        })
      );
    });

    it('should handle enhancement failures with basic improvements', async () => {
      mockAIClients.generateCompletion.mockRejectedValue(new Error('Enhancement failed'));

      const enhanced = await agent.enhanceContent({
        content: 'helped with project development',
        section: 'experience',
        context: mockUserContext
      });

      expect(enhanced).toBe('assisted with project development');
    });

    it('should include target job context when provided', async () => {
      const mockResponse = { content: 'Enhanced content with job-specific keywords' };
      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const targetJob = {
        jobTitle: 'Senior Software Engineer',
        company: 'Google',
        industry: 'Technology'
      };

      await agent.enhanceContent({
        content: 'Original content',
        section: 'experience',
        context: mockUserContext,
        targetJob
      });

      expect(mockAIClients.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            targetJob
          })
        })
      );
    });
  });

  describe('generateBulletPoints', () => {
    it('should generate job-specific bullet points', async () => {
      const mockResponse = {
        content: `• Led development of scalable microservices architecture
• Implemented CI/CD pipelines reducing deployment time by 60%
• Mentored junior developers and conducted code reviews
• Collaborated with product team to define technical requirements
• Optimized database queries improving application performance by 35%`
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const bulletPoints = await agent.generateBulletPoints(
        'Senior Software Engineer',
        'Google',
        'senior',
        'Technology'
      );

      expect(bulletPoints).toHaveLength(5);
      expect(bulletPoints[0]).toBe('Led development of scalable microservices architecture');
      expect(bulletPoints[1]).toBe('Implemented CI/CD pipelines reducing deployment time by 60%');
      expect(mockAIClients.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            jobTitle: 'Senior Software Engineer',
            company: 'Google',
            experienceLevel: 'senior',
            industry: 'Technology'
          })
        })
      );
    });

    it('should handle generation failures with template bullet points', async () => {
      mockAIClients.generateCompletion.mockRejectedValue(new Error('Generation failed'));

      const bulletPoints = await agent.generateBulletPoints(
        'Software Engineer',
        'Tech Corp'
      );

      expect(bulletPoints).toBeInstanceOf(Array);
      expect(bulletPoints.length).toBeGreaterThan(0);
      expect(bulletPoints[0]).toContain('Tech Corp');
    });
  });

  describe('getActionVerbSuggestions', () => {
    it('should return action verb suggestions based on context', () => {
      const suggestions = agent.getActionVerbSuggestions(
        'worked on project',
        mockUserContext,
        5
      );

      expect(suggestions).toHaveLength(5);
      expect(suggestions[0]).toMatchObject({
        type: 'bullet_point',
        confidence: expect.any(Number)
      });
      expect(suggestions[0].content).toMatch(/^[A-Z][a-z]+$/); // Should be a single capitalized word
      expect(suggestions[0].id).toBeDefined();
    });

    it('should prioritize leadership verbs for senior experience levels', () => {
      const seniorContext: UserContext = {
        ...mockUserContext,
        profile: {
          ...mockUserContext.profile!,
          experienceLevel: 'senior'
        }
      };

      const suggestions = agent.getActionVerbSuggestions(
        'managed team',
        seniorContext,
        8
      );

      const leadershipVerbs = ['Led', 'Directed', 'Managed', 'Supervised', 'Coordinated'];
      const hasLeadershipVerb = suggestions.some(s => 
        leadershipVerbs.includes(s.content)
      );

      expect(hasLeadershipVerb).toBe(true);
    });

    it('should reduce confidence for already used verbs', () => {
      const suggestions = agent.getActionVerbSuggestions(
        'Led team and managed project',
        mockUserContext,
        5
      );

      const ledSuggestion = suggestions.find(s => s.content === 'Led');
      const managedSuggestion = suggestions.find(s => s.content === 'Managed');

      if (ledSuggestion) {
        expect(ledSuggestion.confidence).toBeLessThan(0.7);
      }
      if (managedSuggestion) {
        expect(managedSuggestion.confidence).toBeLessThan(0.7);
      }
    });
  });

  describe('generateAchievementSuggestions', () => {
    it('should generate achievement-focused suggestions', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            content: 'Increased application performance by 40% through code optimization and caching strategies',
            type: 'achievement',
            confidence: 0.9,
            context: 'Quantifiable performance improvement with technical details'
          },
          {
            content: 'Led team of 5 developers to deliver project 2 weeks ahead of schedule',
            type: 'achievement',
            confidence: 0.85,
            context: 'Leadership achievement with specific metrics'
          }
        ])
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const suggestions = await agent.generateAchievementSuggestions(
        mockExperienceItem,
        mockUserContext
      );

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toMatchObject({
        type: 'achievement',
        content: expect.stringContaining('40%'),
        confidence: 0.9
      });
      expect(suggestions[1].content).toContain('Led team of 5');
    });

    it('should handle achievement generation failures', async () => {
      mockAIClients.generateCompletion.mockRejectedValue(new Error('Achievement generation failed'));

      const suggestions = await agent.generateAchievementSuggestions(
        mockExperienceItem,
        mockUserContext
      );

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getContentGenerationAgent();
      const instance2 = getContentGenerationAgent();

      expect(instance1).toBe(instance2);
    });
  });

  describe('error handling', () => {
    it('should handle malformed AI responses gracefully', async () => {
      const mockResponse = {
        content: 'Invalid JSON response'
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const suggestions = await agent.generateSuggestions(
        mockUserContext,
        'experience'
      );

      expect(suggestions).toEqual([]);
    });

    it('should handle empty AI responses', async () => {
      const mockResponse = {
        content: '[]'
      };

      mockAIClients.generateCompletion.mockResolvedValue(mockResponse);

      const suggestions = await agent.generateSuggestions(
        mockUserContext,
        'experience'
      );

      expect(suggestions).toEqual([]);
    });
  });
});