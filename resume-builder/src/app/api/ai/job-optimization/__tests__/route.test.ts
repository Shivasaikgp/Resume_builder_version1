import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('../../../auth/[...nextauth]/route', () => ({
  authOptions: {}
}));

vi.mock('../../../../../lib/ai/agents/job-optimization', () => ({
  getJobOptimizationAgent: vi.fn()
}));

import { getServerSession } from 'next-auth';
import { getJobOptimizationAgent } from '../../../../../lib/ai/agents/job-optimization';

describe('/api/ai/job-optimization', () => {
  let mockJobOptimizationAgent: any;
  let mockSession: any;

  const sampleResume = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123'
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
            description: ['Developed web applications using React']
          }
        ],
        visible: true
      }
    ]
  };

  const sampleJobDescription = `
    Senior Software Engineer position requiring React, TypeScript, and 5+ years experience.
    Must have experience with state management and testing frameworks.
  `;

  beforeEach(() => {
    // Mock session
    mockSession = {
      user: {
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    // Mock job optimization agent
    mockJobOptimizationAgent = {
      optimizeResumeForJob: vi.fn(),
      analyzeJobDescription: vi.fn(),
      generateJobSpecificContent: vi.fn(),
      matchSkillsAndExperience: vi.fn()
    };

    (getServerSession as any).mockResolvedValue(mockSession);
    (getJobOptimizationAgent as any).mockReturnValue(mockJobOptimizationAgent);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/job-optimization', () => {
    describe('optimize action', () => {
      it('should optimize resume for job successfully', async () => {
        const mockOptimization = {
          keywordOptimization: [
            {
              keyword: 'TypeScript',
              importance: 'critical',
              suggestedPlacement: ['Skills section'],
              currentUsage: 0,
              recommendedUsage: 2
            }
          ],
          contentEnhancements: [
            {
              section: 'experience',
              type: 'modify',
              suggestion: 'Add TypeScript to experience descriptions',
              reasoning: 'Critical skill for the role',
              impact: 'high'
            }
          ],
          structuralChanges: [],
          priorityActions: [
            {
              action: 'Add TypeScript to Skills section',
              reasoning: 'Critical keyword missing',
              impact: 'high',
              effort: 'low',
              order: 1
            }
          ],
          matchScore: 75
        };

        mockJobOptimizationAgent.optimizeResumeForJob.mockResolvedValue(mockOptimization);

        const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
          method: 'POST',
          body: JSON.stringify({
            resume: sampleResume,
            jobDescription: sampleJobDescription
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toEqual(mockOptimization);
        expect(mockJobOptimizationAgent.optimizeResumeForJob).toHaveBeenCalledWith(
          sampleResume,
          sampleJobDescription,
          undefined
        );
      });

      it('should apply options to filter results', async () => {
        const mockOptimization = {
          keywordOptimization: Array(15).fill({}).map((_, i) => ({
            keyword: `keyword${i}`,
            importance: 'important',
            suggestedPlacement: ['Skills'],
            currentUsage: 0,
            recommendedUsage: 1
          })),
          contentEnhancements: [],
          structuralChanges: [],
          priorityActions: [],
          matchScore: 60
        };

        mockJobOptimizationAgent.optimizeResumeForJob.mockResolvedValue(mockOptimization);

        const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
          method: 'POST',
          body: JSON.stringify({
            resume: sampleResume,
            jobDescription: sampleJobDescription,
            options: {
              maxSuggestions: 5,
              includeStructuralChanges: false
            }
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.keywordOptimization).toHaveLength(5);
        expect(data.data.structuralChanges).toBeUndefined();
      });

      it('should handle validation errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
          method: 'POST',
          body: JSON.stringify({
            resume: sampleResume,
            jobDescription: 'short' // Too short
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
        if (data.details) {
          expect(data.details).toBeDefined();
        }
      });
    });

    describe('analyze-job action', () => {
      it('should analyze job description successfully', async () => {
        const mockAnalysis = {
          keywords: {
            technical: ['React', 'TypeScript', 'JavaScript'],
            soft: ['communication', 'leadership'],
            industry: ['software development'],
            tools: ['Jest', 'Redux'],
            certifications: [],
            actionVerbs: ['develop', 'implement'],
            buzzwords: ['scalable', 'modern']
          },
          requirements: {
            mustHave: ['5+ years experience', 'React proficiency'],
            niceToHave: ['Leadership experience'],
            experienceLevel: 'senior',
            yearsRequired: 5,
            educationLevel: "Bachelor's degree"
          },
          skills: {
            technical: [
              { skill: 'React', importance: 'critical', found: false },
              { skill: 'TypeScript', importance: 'critical', found: false }
            ],
            soft: [],
            tools: [],
            missing: [],
            priority: 'high'
          },
          experience: {
            relevantExperience: [],
            missingExperience: [],
            transferableSkills: [],
            recommendedHighlights: []
          },
          culture: {
            values: ['innovation', 'collaboration'],
            workStyle: ['agile'],
            environment: 'startup',
            teamStructure: 'cross-functional'
          }
        };

        mockJobOptimizationAgent.analyzeJobDescription.mockResolvedValue(mockAnalysis);

        const request = new NextRequest('http://localhost:3000/api/ai/job-optimization?action=analyze-job', {
          method: 'POST',
          body: JSON.stringify({
            jobDescription: sampleJobDescription
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toEqual(mockAnalysis);
        expect(mockJobOptimizationAgent.analyzeJobDescription).toHaveBeenCalledWith(sampleJobDescription);
      });
    });

    describe('generate-content action', () => {
      it('should generate job-specific content successfully', async () => {
        const mockContentSuggestions = [
          {
            section: 'experience',
            type: 'modify',
            suggestion: 'Emphasize React development experience',
            reasoning: 'React is a critical skill for this role',
            impact: 'high'
          },
          {
            section: 'skills',
            type: 'add',
            suggestion: 'Add TypeScript to technical skills',
            reasoning: 'TypeScript is required for the position',
            impact: 'medium'
          }
        ];

        mockJobOptimizationAgent.generateJobSpecificContent.mockResolvedValue(mockContentSuggestions);

        const request = new NextRequest('http://localhost:3000/api/ai/job-optimization?action=generate-content', {
          method: 'POST',
          body: JSON.stringify({
            jobTitle: 'Senior Software Engineer',
            company: 'Tech Corp',
            jobDescription: sampleJobDescription,
            userExperience: [
              {
                title: 'Software Engineer',
                company: 'Previous Corp',
                description: ['Developed applications']
              }
            ]
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.suggestions).toEqual(mockContentSuggestions);
        expect(mockJobOptimizationAgent.generateJobSpecificContent).toHaveBeenCalledWith(
          'Senior Software Engineer',
          'Tech Corp',
          sampleJobDescription,
          expect.any(Array)
        );
      });
    });

    describe('match-skills action', () => {
      it('should match skills and experience successfully', async () => {
        const mockJobAnalysis = {
          keywords: { technical: ['React'], soft: [], industry: [], tools: [], certifications: [], actionVerbs: [], buzzwords: [] },
          requirements: { mustHave: [], niceToHave: [], experienceLevel: 'mid', yearsRequired: null, educationLevel: null },
          skills: { technical: [], soft: [], tools: [], missing: [], priority: 'medium' },
          experience: { relevantExperience: [], missingExperience: [], transferableSkills: [], recommendedHighlights: [] },
          culture: { values: [], workStyle: [], environment: 'collaborative', teamStructure: 'cross-functional' }
        };

        const mockMatchResults = {
          skillMatches: [
            { skill: 'React', importance: 'critical', found: true },
            { skill: 'TypeScript', importance: 'critical', found: false }
          ],
          experienceMatches: [
            {
              jobTitle: 'Software Engineer',
              company: 'Tech Corp',
              relevanceScore: 85,
              matchingResponsibilities: [],
              suggestedEnhancements: []
            }
          ],
          overallMatch: 75
        };

        mockJobOptimizationAgent.analyzeJobDescription.mockResolvedValue(mockJobAnalysis);
        mockJobOptimizationAgent.matchSkillsAndExperience.mockReturnValue(mockMatchResults);

        const request = new NextRequest('http://localhost:3000/api/ai/job-optimization?action=match-skills', {
          method: 'POST',
          body: JSON.stringify({
            resume: sampleResume,
            jobDescription: sampleJobDescription
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.jobAnalysis).toEqual(mockJobAnalysis);
        expect(data.data.matchResults).toEqual(mockMatchResults);
      });
    });

    it('should require authentication', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
        method: 'POST',
        body: JSON.stringify({
          resume: sampleResume,
          jobDescription: sampleJobDescription
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle invalid action parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization?action=invalid', {
        method: 'POST',
        body: JSON.stringify({
          resume: sampleResume,
          jobDescription: sampleJobDescription
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action parameter');
    });

    it('should handle agent errors gracefully', async () => {
      mockJobOptimizationAgent.optimizeResumeForJob.mockRejectedValue(new Error('Agent error'));

      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
        method: 'POST',
        body: JSON.stringify({
          resume: sampleResume,
          jobDescription: sampleJobDescription
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process job optimization request');
    });
  });

  describe('GET /api/ai/job-optimization', () => {
    it('should analyze job description via GET request', async () => {
      const mockAnalysis = {
        keywords: { technical: ['React'], soft: [], industry: [], tools: [], certifications: [], actionVerbs: [], buzzwords: [] },
        requirements: { mustHave: [], niceToHave: [], experienceLevel: 'mid', yearsRequired: null, educationLevel: null },
        skills: { technical: [], soft: [], tools: [], missing: [], priority: 'medium' },
        experience: { relevantExperience: [], missingExperience: [], transferableSkills: [], recommendedHighlights: [] },
        culture: { values: [], workStyle: [], environment: 'collaborative', teamStructure: 'cross-functional' }
      };

      mockJobOptimizationAgent.analyzeJobDescription.mockResolvedValue(mockAnalysis);

      const url = new URL('http://localhost:3000/api/ai/job-optimization');
      url.searchParams.set('jobDescription', sampleJobDescription);
      url.searchParams.set('action', 'analyze');

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnalysis);
    });

    it('should require job description parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Job description is required');
    });

    it('should require authentication for GET requests', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const url = new URL('http://localhost:3000/api/ai/job-optimization');
      url.searchParams.set('jobDescription', sampleJobDescription);

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle invalid action in GET request', async () => {
      const url = new URL('http://localhost:3000/api/ai/job-optimization');
      url.searchParams.set('jobDescription', sampleJobDescription);
      url.searchParams.set('action', 'invalid');

      const request = new NextRequest(url);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action parameter');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process job optimization request');
    });

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
        method: 'POST',
        body: JSON.stringify({
          resume: sampleResume
          // Missing jobDescription
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/job-optimization', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle concurrent requests', async () => {
      mockJobOptimizationAgent.analyzeJobDescription.mockResolvedValue({
        keywords: { technical: [], soft: [], industry: [], tools: [], certifications: [], actionVerbs: [], buzzwords: [] },
        requirements: { mustHave: [], niceToHave: [], experienceLevel: 'mid', yearsRequired: null, educationLevel: null },
        skills: { technical: [], soft: [], tools: [], missing: [], priority: 'medium' },
        experience: { relevantExperience: [], missingExperience: [], transferableSkills: [], recommendedHighlights: [] },
        culture: { values: [], workStyle: [], environment: 'collaborative', teamStructure: 'cross-functional' }
      });

      const requests = Array(5).fill(null).map(() => {
        const url = new URL('http://localhost:3000/api/ai/job-optimization');
        url.searchParams.set('jobDescription', sampleJobDescription);
        return GET(new NextRequest(url));
      });

      const responses = await Promise.all(requests);

      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    it('should handle large job descriptions', async () => {
      const largeJobDescription = 'Large job description. '.repeat(1000);
      
      mockJobOptimizationAgent.analyzeJobDescription.mockResolvedValue({
        keywords: { technical: [], soft: [], industry: [], tools: [], certifications: [], actionVerbs: [], buzzwords: [] },
        requirements: { mustHave: [], niceToHave: [], experienceLevel: 'mid', yearsRequired: null, educationLevel: null },
        skills: { technical: [], soft: [], tools: [], missing: [], priority: 'medium' },
        experience: { relevantExperience: [], missingExperience: [], transferableSkills: [], recommendedHighlights: [] },
        culture: { values: [], workStyle: [], environment: 'collaborative', teamStructure: 'cross-functional' }
      });

      const url = new URL('http://localhost:3000/api/ai/job-optimization');
      url.searchParams.set('jobDescription', largeJobDescription);

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});