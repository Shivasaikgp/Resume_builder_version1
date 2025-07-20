import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as analyzePost, GET as analyzeGet } from '../app/api/ai/analyze/route';
import { POST as atsPost } from '../app/api/ai/ats-check/route';
import { ResumeData, UserContext } from '../types';

// Mock next-auth
const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}));

// Mock auth options
vi.mock('../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {}
}));

// Mock analysis agent
const mockAnalysisAgent = {
  analyzeResume: vi.fn(),
  scoreResume: vi.fn(),
  checkATSCompatibility: vi.fn(),
  analyzeKeywords: vi.fn()
};

vi.mock('../lib/ai/agents/analysis', () => ({
  getAnalysisAgent: () => mockAnalysisAgent
}));

describe('Analysis API Endpoints', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  const mockResume: ResumeData = {
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
              'Improved system performance by 25%'
            ]
          }
        ],
        order: 1,
        visible: true
      }
    ]
  };

  const mockContext: UserContext = {
    profile: {
      industry: 'technology',
      experienceLevel: 'mid',
      targetRoles: ['Software Engineer'],
      skills: ['JavaScript', 'React'],
      careerGoals: ['Technical Leadership']
    },
    preferences: {
      writingStyle: 'technical',
      contentLength: 'detailed',
      focusAreas: ['technical skills']
    }
  };

  const mockAnalysisResult = {
    overallScore: 85,
    breakdown: {
      content: 80,
      formatting: 85,
      atsCompatibility: 90,
      keywords: 85
    },
    suggestions: [
      {
        type: 'content',
        priority: 'medium',
        message: 'Add more quantified achievements',
        section: 'experience'
      }
    ],
    strengths: ['Good structure', 'Strong action verbs'],
    improvements: ['Add metrics', 'Include keywords']
  };

  const mockScoreResult = {
    overall: 85,
    breakdown: {
      content: 80,
      formatting: 85,
      atsCompatibility: 90,
      keywords: 85
    },
    details: {
      strengths: ['Good structure'],
      improvements: ['Add metrics'],
      criticalIssues: []
    }
  };

  const mockATSResult = {
    score: 90,
    keywords: {
      found: ['software development', 'project management'],
      missing: ['agile', 'scrum'],
      density: { 'software development': 2, 'project management': 1 }
    },
    formatting: {
      issues: [],
      recommendations: ['Use standard section headings']
    }
  };

  beforeEach(() => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockAnalysisAgent.analyzeResume.mockResolvedValue(mockAnalysisResult);
    mockAnalysisAgent.scoreResume.mockResolvedValue(mockScoreResult);
    mockAnalysisAgent.checkATSCompatibility.mockResolvedValue(mockATSResult);
    mockAnalysisAgent.analyzeKeywords.mockResolvedValue({
      totalKeywords: 10,
      industryKeywords: ['software development'],
      skillKeywords: ['JavaScript', 'React'],
      actionVerbs: ['developed', 'implemented'],
      missingKeywords: ['agile', 'scrum'],
      keywordDensity: {},
      recommendations: ['Add industry keywords']
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/ai/analyze POST', () => {
    it('should analyze resume successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          resume: mockResume,
          context: mockContext,
          options: {
            includeATSCheck: true,
            includeContentAnalysis: true,
            includeKeywordAnalysis: true,
            priorityThreshold: 'medium'
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnalysisResult);
      expect(mockAnalysisAgent.analyzeResume).toHaveBeenCalledWith(
        mockResume,
        mockContext,
        expect.objectContaining({
          includeATSCheck: true,
          includeContentAnalysis: true,
          includeKeywordAnalysis: true,
          priorityThreshold: 'medium'
        })
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          resume: mockResume
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 400 for invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          invalidData: 'test'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should handle analysis agent errors', async () => {
      mockAnalysisAgent.analyzeResume.mockRejectedValueOnce(
        new Error('Analysis failed')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          resume: mockResume
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to analyze resume');
    });
  });

  describe('/api/ai/analyze GET', () => {
    it('should score resume successfully', async () => {
      const url = new URL('http://localhost:3000/api/ai/analyze');
      url.searchParams.set('resume', JSON.stringify(mockResume));
      url.searchParams.set('context', JSON.stringify(mockContext));

      const request = new NextRequest(url);

      const response = await analyzeGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockScoreResult);
      expect(mockAnalysisAgent.scoreResume).toHaveBeenCalledWith(
        mockResume,
        mockContext
      );
    });

    it('should return 400 when resume data is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/analyze');

      const response = await analyzeGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Resume data is required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const url = new URL('http://localhost:3000/api/ai/analyze');
      url.searchParams.set('resume', JSON.stringify(mockResume));

      const request = new NextRequest(url);

      const response = await analyzeGet(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('/api/ai/ats-check POST', () => {
    it('should perform ATS check successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/ats-check', {
        method: 'POST',
        body: JSON.stringify({
          resume: mockResume
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await atsPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.atsResult).toEqual(mockATSResult);
      expect(mockAnalysisAgent.checkATSCompatibility).toHaveBeenCalledWith(mockResume);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/ats-check', {
        method: 'POST',
        body: JSON.stringify({
          resume: mockResume
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await atsPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });
});