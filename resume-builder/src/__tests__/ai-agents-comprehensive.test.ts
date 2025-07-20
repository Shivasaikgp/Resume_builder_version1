import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock AI service responses
const mockOpenAIResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        suggestions: [
          'Developed and maintained web applications using React and Node.js',
          'Collaborated with cross-functional teams to deliver high-quality software solutions',
          'Implemented responsive design principles to ensure optimal user experience'
        ],
        improvements: [
          'Add quantifiable metrics to demonstrate impact',
          'Include specific technologies and frameworks used',
          'Highlight leadership and collaboration skills'
        ]
      })
    }
  }]
};

const mockAnthropicResponse = {
  content: [{
    text: JSON.stringify({
      analysis: {
        score: 85,
        breakdown: {
          content: 80,
          formatting: 90,
          ats_compatibility: 85,
          keyword_density: 75
        },
        suggestions: [
          'Add more quantifiable achievements',
          'Include industry-specific keywords',
          'Improve action verb variety'
        ]
      }
    })
  }]
};

// Setup MSW server
const server = setupServer(
  // OpenAI API mock
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json(mockOpenAIResponse);
  }),
  
  // Anthropic API mock
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json(mockAnthropicResponse);
  }),
  
  // Local API mocks
  http.post('/api/ai/content/generate', () => {
    return HttpResponse.json({
      suggestions: [
        'Led development of scalable web applications serving 10,000+ users',
        'Optimized application performance resulting in 40% faster load times',
        'Mentored junior developers and conducted code reviews'
      ]
    });
  }),
  
  http.post('/api/ai/analyze', () => {
    return HttpResponse.json({
      score: 88,
      breakdown: {
        content_quality: 85,
        ats_compatibility: 90,
        keyword_optimization: 85,
        formatting: 92
      },
      suggestions: [
        {
          type: 'content',
          priority: 'high',
          message: 'Add quantifiable metrics to your achievements',
          section: 'experience'
        },
        {
          type: 'keywords',
          priority: 'medium',
          message: 'Include more industry-specific keywords',
          section: 'skills'
        }
      ]
    });
  }),
  
  http.post('/api/ai/context/update', () => {
    return HttpResponse.json({
      success: true,
      context: {
        industry: 'technology',
        experience_level: 'senior',
        preferences: {
          writing_style: 'professional',
          content_length: 'detailed'
        }
      }
    });
  })
);

// Import the modules to test
import { ContentGenerationAgent } from '@/lib/ai/content-generation-agent';
import { AnalysisAgent } from '@/lib/ai/analysis-agent';
import { ContextAgent } from '@/lib/ai/context-agent';

describe('AI Agents Comprehensive Testing', () => {
  beforeEach(() => {
    server.listen();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('ContentGenerationAgent', () => {
    let contentAgent: ContentGenerationAgent;

    beforeEach(() => {
      contentAgent = new ContentGenerationAgent();
    });

    it('should generate content suggestions based on job title and company', async () => {
      const suggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Corp',
        industry: 'technology',
        experienceLevel: 'senior'
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('Led development');
    });

    it('should enhance existing content with AI improvements', async () => {
      const originalContent = 'I worked on web applications';
      const enhancedContent = await contentAgent.enhanceContent(originalContent, {
        industry: 'technology',
        experienceLevel: 'mid',
        targetRole: 'Frontend Developer'
      });

      expect(enhancedContent).toBeDefined();
      expect(enhancedContent).not.toBe(originalContent);
      expect(enhancedContent.length).toBeGreaterThan(originalContent.length);
    });

    it('should generate role-specific bullet points', async () => {
      const bulletPoints = await contentAgent.generateBulletPoints(
        'Product Manager',
        'StartupCo'
      );

      expect(bulletPoints).toBeDefined();
      expect(Array.isArray(bulletPoints)).toBe(true);
      expect(bulletPoints.length).toBeGreaterThan(0);
      expect(bulletPoints.some(point => point.includes('product') || point.includes('management'))).toBe(true);
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      server.use(
        http.post('/api/ai/content/generate', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const suggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Developer',
        company: 'Test Corp'
      });

      // Should return fallback suggestions or empty array
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should provide context-aware suggestions', async () => {
      const juniorSuggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Junior Developer',
        experienceLevel: 'entry'
      });

      const seniorSuggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Senior Developer',
        experienceLevel: 'senior'
      });

      expect(juniorSuggestions).toBeDefined();
      expect(seniorSuggestions).toBeDefined();
      
      // Senior suggestions should be more leadership-focused
      const seniorContent = seniorSuggestions.join(' ').toLowerCase();
      expect(seniorContent).toMatch(/led|managed|mentored|architected/);
    });
  });

  describe('AnalysisAgent', () => {
    let analysisAgent: AnalysisAgent;

    beforeEach(() => {
      analysisAgent = new AnalysisAgent();
    });

    it('should analyze resume and return comprehensive score', async () => {
      const mockResume = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0123'
        },
        experience: [{
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'Developed web applications using React and Node.js'
        }],
        education: [{
          degree: 'BS Computer Science',
          school: 'University'
        }],
        skills: ['JavaScript', 'React', 'Node.js']
      };

      const analysis = await analysisAgent.analyzeResume(mockResume);

      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThan(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(analysis.breakdown).toBeDefined();
      expect(analysis.suggestions).toBeDefined();
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    it('should check ATS compatibility', async () => {
      const mockResume = {
        personalInfo: { name: 'Test User' },
        experience: [{ title: 'Developer', description: 'Built apps' }]
      };

      const atsResult = await analysisAgent.checkATSCompatibility(mockResume);

      expect(atsResult).toBeDefined();
      expect(atsResult.compatible).toBeDefined();
      expect(typeof atsResult.compatible).toBe('boolean');
      expect(atsResult.issues).toBeDefined();
      expect(Array.isArray(atsResult.issues)).toBe(true);
    });

    it('should provide prioritized improvement suggestions', async () => {
      const mockResume = {
        personalInfo: { name: 'Test' },
        experience: [{ title: 'Dev', description: 'Coded' }]
      };

      const analysis = await analysisAgent.analyzeResume(mockResume);

      expect(analysis.suggestions).toBeDefined();
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      
      // Check that suggestions have priority levels
      const hasPriorities = analysis.suggestions.some(s => 
        s.priority === 'high' || s.priority === 'medium' || s.priority === 'low'
      );
      expect(hasPriorities).toBe(true);
    });

    it('should handle different experience levels appropriately', async () => {
      const entryLevelResume = {
        personalInfo: { name: 'Junior Dev' },
        experience: [{ title: 'Intern', description: 'Learned programming' }]
      };

      const seniorLevelResume = {
        personalInfo: { name: 'Senior Dev' },
        experience: [
          { title: 'Senior Engineer', description: 'Led team of 5 developers' },
          { title: 'Tech Lead', description: 'Architected scalable systems' }
        ]
      };

      const entryAnalysis = await analysisAgent.analyzeResume(entryLevelResume);
      const seniorAnalysis = await analysisAgent.analyzeResume(seniorLevelResume);

      expect(entryAnalysis.suggestions).toBeDefined();
      expect(seniorAnalysis.suggestions).toBeDefined();
      
      // Different types of suggestions for different levels
      const entrySuggestions = entryAnalysis.suggestions.map(s => s.message.toLowerCase());
      const seniorSuggestions = seniorAnalysis.suggestions.map(s => s.message.toLowerCase());
      
      expect(entrySuggestions.some(s => s.includes('project') || s.includes('skill'))).toBe(true);
      expect(seniorSuggestions.some(s => s.includes('leadership') || s.includes('impact'))).toBe(true);
    });
  });

  describe('ContextAgent', () => {
    let contextAgent: ContextAgent;

    beforeEach(() => {
      contextAgent = new ContextAgent();
    });

    it('should build user context from interactions', async () => {
      const userId = 'test-user-123';
      const interactions = [
        {
          type: 'content_generation',
          data: { jobTitle: 'Software Engineer', industry: 'technology' }
        },
        {
          type: 'suggestion_accepted',
          data: { suggestion: 'Led development team', section: 'experience' }
        }
      ];

      const context = await contextAgent.buildUserContext(userId, interactions);

      expect(context).toBeDefined();
      expect(context.userId).toBe(userId);
      expect(context.profile).toBeDefined();
      expect(context.preferences).toBeDefined();
      expect(context.history).toBeDefined();
    });

    it('should update context based on user feedback', async () => {
      const userId = 'test-user-123';
      const feedback = {
        type: 'suggestion_rejected',
        suggestionId: 'suggestion-123',
        reason: 'too_formal',
        section: 'experience'
      };

      await contextAgent.updateContext(userId, feedback);

      // Verify context was updated (this would typically check database)
      const updatedContext = await contextAgent.getUserContext(userId);
      expect(updatedContext).toBeDefined();
      expect(updatedContext.preferences.writingStyle).toBeDefined();
    });

    it('should provide personalized recommendations', async () => {
      const context = {
        userId: 'test-user',
        profile: {
          industry: 'technology',
          experienceLevel: 'senior',
          targetRoles: ['Engineering Manager', 'Tech Lead']
        },
        preferences: {
          writingStyle: 'professional',
          contentLength: 'detailed'
        }
      };

      const recommendations = await contextAgent.getPersonalizedSuggestions(context);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Recommendations should be relevant to senior tech roles
      const recommendationText = recommendations.map(r => r.content).join(' ').toLowerCase();
      expect(recommendationText).toMatch(/lead|manage|architect|senior/);
    });

    it('should maintain context continuity across sessions', async () => {
      const userId = 'test-user-123';
      
      // Simulate first session
      await contextAgent.updateContext(userId, {
        type: 'session_start',
        data: { industry: 'healthcare', role: 'Data Scientist' }
      });

      // Simulate second session
      const context = await contextAgent.getUserContext(userId);
      
      expect(context).toBeDefined();
      expect(context.profile.industry).toBe('healthcare');
      expect(context.profile.targetRoles).toContain('Data Scientist');
    });

    it('should learn from user patterns', async () => {
      const userId = 'test-user-123';
      const patterns = [
        { type: 'suggestion_accepted', category: 'quantified_achievements' },
        { type: 'suggestion_accepted', category: 'quantified_achievements' },
        { type: 'suggestion_rejected', category: 'soft_skills' },
        { type: 'suggestion_rejected', category: 'soft_skills' }
      ];

      for (const pattern of patterns) {
        await contextAgent.updateContext(userId, pattern);
      }

      const context = await contextAgent.getUserContext(userId);
      
      expect(context.preferences).toBeDefined();
      // Should prefer quantified achievements over soft skills
      expect(context.preferences.preferredSuggestionTypes).toContain('quantified_achievements');
      expect(context.preferences.avoidedSuggestionTypes).toContain('soft_skills');
    });
  });

  describe('AI Agent Integration', () => {
    it('should coordinate between multiple agents', async () => {
      const contentAgent = new ContentGenerationAgent();
      const analysisAgent = new AnalysisAgent();
      const contextAgent = new ContextAgent();

      const userId = 'integration-test-user';
      const jobTitle = 'Full Stack Developer';

      // Step 1: Generate content
      const suggestions = await contentAgent.generateSuggestions({
        jobTitle,
        industry: 'technology'
      });

      // Step 2: Analyze generated content
      const mockResume = {
        personalInfo: { name: 'Test User' },
        experience: [{
          title: jobTitle,
          description: suggestions[0]
        }]
      };

      const analysis = await analysisAgent.analyzeResume(mockResume);

      // Step 3: Update context based on analysis
      await contextAgent.updateContext(userId, {
        type: 'analysis_completed',
        data: { score: analysis.score, suggestions: analysis.suggestions }
      });

      // Verify integration worked
      expect(suggestions).toBeDefined();
      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThan(0);

      const context = await contextAgent.getUserContext(userId);
      expect(context).toBeDefined();
    });

    it('should handle concurrent AI requests', async () => {
      const contentAgent = new ContentGenerationAgent();
      const analysisAgent = new AnalysisAgent();

      const mockResume = {
        personalInfo: { name: 'Concurrent Test' },
        experience: [{ title: 'Developer', description: 'Built apps' }]
      };

      // Make concurrent requests
      const [suggestions, analysis] = await Promise.all([
        contentAgent.generateSuggestions({ jobTitle: 'Developer' }),
        analysisAgent.analyzeResume(mockResume)
      ]);

      expect(suggestions).toBeDefined();
      expect(analysis).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(typeof analysis.score).toBe('number');
    });

    it('should handle rate limiting gracefully', async () => {
      // Mock rate limiting
      server.use(
        http.post('/api/ai/content/generate', () => {
          return new HttpResponse(null, { status: 429 });
        })
      );

      const contentAgent = new ContentGenerationAgent();
      
      // Should handle rate limiting without throwing
      const suggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Developer'
      });

      expect(suggestions).toBeDefined();
      // Should return cached or fallback suggestions
    });
  });
});