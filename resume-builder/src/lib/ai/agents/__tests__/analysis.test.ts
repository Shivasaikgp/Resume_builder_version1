import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisAgent, getAnalysisAgent } from '../analysis';
import { ResumeData, UserContext, ExperienceItem } from '../../../../types';

// Mock AI clients
vi.mock('../../clients', () => ({
  getAIClients: () => ({
    generateCompletion: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        contentAnalysis: {
          strengths: ['Good structure'],
          weaknesses: ['Needs more metrics'],
          suggestions: ['Add quantified achievements']
        },
        atsAnalysis: {
          score: 85,
          issues: [],
          recommendations: ['Use standard headings']
        },
        keywordAnalysis: {
          relevantKeywords: ['project management', 'leadership'],
          missingKeywords: ['agile', 'scrum']
        },
        overallRecommendations: ['Improve content quality']
      })
    })
  })
}));

describe('AnalysisAgent', () => {
  let analysisAgent: AnalysisAgent;
  let mockResume: ResumeData;
  let mockContext: UserContext;

  beforeEach(() => {
    analysisAgent = new AnalysisAgent();
    
    mockResume = {
      personalInfo: {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        location: 'New York, NY'
      },
      sections: [
        {
          type: 'experience',
          title: 'Work Experience',
          items: [
            {
              title: 'Software Engineer',
              company: 'Tech Corp',
              location: 'New York, NY',
              startDate: '2022-01',
              endDate: '2023-12',
              description: [
                'Developed web applications using React and Node.js',
                'Improved system performance by 25%',
                'Led a team of 3 developers on key projects'
              ]
            } as ExperienceItem
          ],
          order: 1,
          visible: true
        },
        {
          type: 'education',
          title: 'Education',
          items: [
            {
              degree: 'Bachelor of Science in Computer Science',
              school: 'University of Technology',
              location: 'Boston, MA',
              graduationDate: '2021-05'
            }
          ],
          order: 2,
          visible: true
        },
        {
          type: 'skills',
          title: 'Skills',
          items: [
            {
              category: 'Programming Languages',
              skills: ['JavaScript', 'Python', 'Java', 'TypeScript']
            },
            {
              category: 'Frameworks',
              skills: ['React', 'Node.js', 'Express', 'Django']
            }
          ],
          order: 3,
          visible: true
        }
      ]
    };

    mockContext = {
      profile: {
        industry: 'technology',
        experienceLevel: 'mid',
        targetRoles: ['Software Engineer', 'Full Stack Developer'],
        skills: ['JavaScript', 'React', 'Node.js'],
        careerGoals: ['Technical Leadership', 'System Architecture']
      },
      preferences: {
        writingStyle: 'technical',
        contentLength: 'detailed',
        focusAreas: ['technical skills', 'leadership']
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeResume', () => {
    it('should perform comprehensive resume analysis', async () => {
      const result = await analysisAgent.analyzeResume(mockResume, mockContext);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.breakdown).toHaveProperty('content');
      expect(result.breakdown).toHaveProperty('formatting');
      expect(result.breakdown).toHaveProperty('atsCompatibility');
      expect(result.breakdown).toHaveProperty('keywords');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.improvements)).toBe(true);
    });

    it('should handle analysis with different options', async () => {
      const options = {
        includeATSCheck: false,
        includeContentAnalysis: true,
        includeKeywordAnalysis: true,
        priorityThreshold: 'high' as const
      };

      const result = await analysisAgent.analyzeResume(mockResume, mockContext, options);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should return fallback analysis on error', async () => {
      // Mock an error in AI analysis
      vi.mocked(analysisAgent['aiClients'].generateCompletion).mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      const result = await analysisAgent.analyzeResume(mockResume, mockContext);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(70); // Fallback score should be at least 70
      expect(result.strengths).toContain('Complete resume structure');
    });
  });

  describe('scoreResume', () => {
    it('should generate resume score with breakdown', async () => {
      const result = await analysisAgent.scoreResume(mockResume, mockContext);

      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.breakdown).toHaveProperty('content');
      expect(result.breakdown).toHaveProperty('formatting');
      expect(result.breakdown).toHaveProperty('atsCompatibility');
      expect(result.breakdown).toHaveProperty('keywords');
      expect(result.details).toHaveProperty('strengths');
      expect(result.details).toHaveProperty('improvements');
      expect(result.details).toHaveProperty('criticalIssues');
    });

    it('should score resume without context', async () => {
      const result = await analysisAgent.scoreResume(mockResume);

      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThan(0);
    });
  });

  describe('checkATSCompatibility', () => {
    it('should check ATS compatibility and return score', async () => {
      const result = await analysisAgent.checkATSCompatibility(mockResume);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.keywords).toHaveProperty('found');
      expect(result.keywords).toHaveProperty('missing');
      expect(result.keywords).toHaveProperty('density');
      expect(result.formatting).toHaveProperty('issues');
      expect(result.formatting).toHaveProperty('recommendations');
      expect(Array.isArray(result.keywords.found)).toBe(true);
      expect(Array.isArray(result.keywords.missing)).toBe(true);
    });

    it('should penalize missing essential sections', async () => {
      const incompleteResume = {
        ...mockResume,
        sections: mockResume.sections.filter(s => s.type !== 'education')
      };

      const result = await analysisAgent.checkATSCompatibility(incompleteResume);

      expect(result.score).toBeLessThan(100);
    });

    it('should identify formatting issues', async () => {
      const resumeWithIssues = {
        ...mockResume,
        personalInfo: {
          ...mockResume.personalInfo,
          email: '', // Missing email
          phone: undefined // Missing phone
        }
      };

      const result = await analysisAgent.checkATSCompatibility(resumeWithIssues);

      expect(result.formatting.issues.length).toBeGreaterThan(0);
      expect(result.formatting.issues).toContain('Missing email address');
    });
  });

  describe('analyzeKeywords', () => {
    it('should analyze keywords for technology industry', async () => {
      const result = await analysisAgent.analyzeKeywords(mockResume, mockContext);

      expect(result).toBeDefined();
      expect(result.totalKeywords).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.industryKeywords)).toBe(true);
      expect(Array.isArray(result.skillKeywords)).toBe(true);
      expect(Array.isArray(result.actionVerbs)).toBe(true);
      expect(Array.isArray(result.missingKeywords)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.keywordDensity).toBe('object');
    });

    it('should handle different industries', async () => {
      const marketingContext = {
        ...mockContext,
        profile: {
          ...mockContext.profile!,
          industry: 'marketing'
        }
      };

      const result = await analysisAgent.analyzeKeywords(mockResume, marketingContext);

      expect(result).toBeDefined();
      expect(result.totalKeywords).toBeGreaterThanOrEqual(0);
    });

    it('should analyze keywords with job description', async () => {
      const jobDescription = 'Looking for a software engineer with React, Node.js, and agile experience';
      
      const result = await analysisAgent.analyzeKeywords(mockResume, mockContext, jobDescription);

      expect(result).toBeDefined();
      expect(result.recommendations).toContain('Tailor your keywords to match the specific job description');
    });
  });

  describe('Content Quality Analysis', () => {
    it('should analyze content quality metrics', async () => {
      const result = await analysisAgent['analyzeContentQuality'](mockResume);

      expect(result).toBeDefined();
      expect(result.bulletPointCount).toBe(3); // Based on mock data
      expect(result.averageBulletLength).toBeGreaterThan(0);
      expect(result.quantifiedAchievements).toBe(1); // "25%" in mock data
      expect(result.actionVerbUsage).toBeGreaterThanOrEqual(0);
      expect(result.passiveLanguage).toBeGreaterThanOrEqual(0);
      expect(result.repetitiveContent).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.grammarIssues)).toBe(true);
      expect(result.clarityScore).toBeGreaterThan(0);
    });

    it('should handle resume without experience section', async () => {
      const resumeWithoutExperience = {
        ...mockResume,
        sections: mockResume.sections.filter(s => s.type !== 'experience')
      };

      const result = await analysisAgent['analyzeContentQuality'](resumeWithoutExperience);

      expect(result.bulletPointCount).toBe(0);
      expect(result.averageBulletLength).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    it('should extract resume text correctly', () => {
      const text = analysisAgent['extractResumeText'](mockResume);

      expect(text).toContain('John Doe');
      expect(text).toContain('john.doe@example.com');
      expect(text).toContain('Software Engineer');
      expect(text).toContain('Tech Corp');
      expect(text).toContain('JavaScript');
    });

    it('should count quantified achievements', () => {
      const bulletPoints = [
        'Improved performance by 25%',
        'Led team of 5 developers',
        'Reduced costs by $10,000',
        'Managed project timeline'
      ];

      const count = analysisAgent['countQuantifiedAchievements'](bulletPoints);
      expect(count).toBe(2); // 25%, $10,000 (the "5" in "team of 5" might not be detected by the current regex)
    });

    it('should analyze action verb usage', () => {
      const bulletPoints = [
        'Led team of developers',
        'Implemented new features',
        'Was responsible for testing',
        'Developed applications'
      ];

      const usage = analysisAgent['analyzeActionVerbUsage'](bulletPoints);
      expect(usage).toBe(0.75); // 3 out of 4 start with strong verbs
    });

    it('should detect passive language', () => {
      const bulletPoints = [
        'Led team of developers',
        'Was responsible for testing',
        'Were involved in planning',
        'Implemented new features'
      ];

      const passiveRatio = analysisAgent['detectPassiveLanguage'](bulletPoints);
      expect(passiveRatio).toBe(0.5); // 2 out of 4 contain passive language
    });

    it('should extract skill keywords', () => {
      const skills = analysisAgent['extractSkillKeywords'](mockResume);
      
      expect(skills).toContain('JavaScript');
      expect(skills).toContain('Python');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
    });

    it('should extract action verbs', () => {
      const verbs = analysisAgent['extractActionVerbs'](mockResume);
      
      expect(verbs).toContain('Developed');
      expect(verbs).toContain('Improved');
      expect(verbs).toContain('Led');
    });
  });

  describe('Improvement Suggestions', () => {
    it('should generate content-based suggestions', () => {
      const contentQuality = {
        bulletPointCount: 2,
        averageBulletLength: 50,
        quantifiedAchievements: 0,
        actionVerbUsage: 0.3,
        passiveLanguage: 0.4,
        repetitiveContent: 0.1,
        grammarIssues: [],
        clarityScore: 60
      };

      const suggestions = analysisAgent['generateImprovementSuggestions'](
        mockResume, contentQuality, null, null, null, 'medium'
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'content')).toBe(true);
      expect(suggestions.some(s => s.priority === 'high')).toBe(true);
    });

    it('should filter suggestions by priority threshold', () => {
      const contentQuality = {
        bulletPointCount: 2,
        averageBulletLength: 50,
        quantifiedAchievements: 0,
        actionVerbUsage: 0.3,
        passiveLanguage: 0.4,
        repetitiveContent: 0.1,
        grammarIssues: [],
        clarityScore: 60
      };

      const highPrioritySuggestions = analysisAgent['generateImprovementSuggestions'](
        mockResume, contentQuality, null, null, null, 'high'
      );

      const allSuggestions = analysisAgent['generateImprovementSuggestions'](
        mockResume, contentQuality, null, null, null, 'low'
      );

      expect(highPrioritySuggestions.length).toBeLessThanOrEqual(allSuggestions.length);
      expect(highPrioritySuggestions.every(s => s.priority === 'high')).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getAnalysisAgent();
      const instance2 = getAnalysisAgent();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      // Mock AI service failure
      vi.mocked(analysisAgent['aiClients'].generateCompletion).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const result = await analysisAgent.analyzeResume(mockResume, mockContext);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(70); // Fallback score should be at least 70
    });

    it('should handle malformed AI responses', async () => {
      // Mock malformed response
      vi.mocked(analysisAgent['aiClients'].generateCompletion).mockResolvedValueOnce({
        content: 'invalid json response'
      });

      const result = await analysisAgent.analyzeResume(mockResume, mockContext);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(70); // Fallback score should be at least 70
    });
  });

  describe('Score Calculation', () => {
    it('should calculate overall score correctly', () => {
      const contentQuality = {
        bulletPointCount: 5,
        averageBulletLength: 120,
        quantifiedAchievements: 3,
        actionVerbUsage: 0.8,
        passiveLanguage: 0.1,
        repetitiveContent: 0.05,
        grammarIssues: [],
        clarityScore: 85
      };

      const atsResult = {
        score: 90,
        keywords: { found: [], missing: [], density: {} },
        formatting: { issues: [], recommendations: [] }
      };

      const keywordAnalysis = {
        totalKeywords: 12,
        industryKeywords: [],
        skillKeywords: [],
        actionVerbs: [],
        missingKeywords: [],
        keywordDensity: {},
        recommendations: []
      };

      const score = analysisAgent['calculateOverallScore'](
        contentQuality, atsResult, keywordAnalysis
      );

      expect(score.overall).toBeGreaterThan(80);
      expect(score.breakdown.content).toBeGreaterThan(80);
      expect(score.breakdown.atsCompatibility).toBe(90);
      expect(score.breakdown.keywords).toBe(80); // 12/15 * 100
    });

    it('should handle null inputs gracefully', () => {
      const score = analysisAgent['calculateOverallScore'](null, null, null);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.breakdown.content).toBe(70);
      expect(score.breakdown.formatting).toBe(85);
      expect(score.breakdown.atsCompatibility).toBe(75);
      expect(score.breakdown.keywords).toBe(70);
    });
  });
});