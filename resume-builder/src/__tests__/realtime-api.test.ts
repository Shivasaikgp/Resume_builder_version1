// Tests for real-time AI API endpoints
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as streamPost } from '../app/api/ai/realtime/stream/route';
import { POST as analyzePost } from '../app/api/ai/realtime/analyze/route';
import { POST as feedbackPost, GET as feedbackGet } from '../app/api/ai/feedback/route';
import { POST as helpPost } from '../app/api/ai/help/route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('../lib/auth', () => ({
  authOptions: {}
}));

vi.mock('../lib/ai', () => ({
  getContentGenerationAgent: vi.fn(() => ({
    generateSuggestions: vi.fn(),
    enhanceContent: vi.fn()
  }))
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    aIFeedback: {
      create: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn()
    },
    userContext: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

const { getServerSession } = await import('next-auth');
const { getContentGenerationAgent } = await import('../lib/ai');
const { prisma } = await import('../lib/prisma');

const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com'
  }
};

const mockUserContext = {
  profile: {
    industry: 'technology',
    experienceLevel: 'mid',
    targetRoles: ['Software Engineer'],
    skills: ['JavaScript', 'React'],
    careerGoals: ['Senior Developer']
  },
  preferences: {
    writingStyle: 'formal',
    contentLength: 'detailed',
    focusAreas: ['technical skills']
  }
};

describe('Streaming API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('should require authentication', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/ai/realtime/stream', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        section: 'experience',
        context: mockUserContext
      })
    });

    const response = await streamPost(request);
    expect(response.status).toBe(401);
  });

  it('should validate request data', async () => {
    const request = new NextRequest('http://localhost/api/ai/realtime/stream', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        content: '',
        section: 'invalid-section'
      })
    });

    const response = await streamPost(request);
    expect(response.status).toBe(400);
  });

  it('should create streaming response for valid request', async () => {
    const mockAgent = {
      generateSuggestions: vi.fn().mockResolvedValue([
        {
          id: '1',
          content: 'Test suggestion',
          confidence: 0.8,
          type: 'bullet_point',
          context: 'Test context'
        }
      ]),
      enhanceContent: vi.fn().mockResolvedValue('Enhanced content')
    };

    (getContentGenerationAgent as any).mockReturnValue(mockAgent);

    const request = new NextRequest('http://localhost/api/ai/realtime/stream', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content for analysis',
        section: 'experience',
        context: mockUserContext,
        options: {
          maxSuggestions: 3,
          includeImprovement: true,
          includeHelp: true
        }
      })
    });

    const response = await streamPost(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(mockAgent.generateSuggestions).toHaveBeenCalledWith(
      mockUserContext,
      'experience',
      'Test content for analysis',
      { maxSuggestions: 3, includeReasoning: true }
    );
  });
});

describe('Analyze API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('should return batch analysis results', async () => {
    const mockAgent = {
      generateSuggestions: vi.fn().mockResolvedValue([
        {
          id: '1',
          content: 'Test suggestion',
          confidence: 0.8,
          type: 'bullet_point',
          context: 'Test context'
        }
      ]),
      enhanceContent: vi.fn().mockResolvedValue('Enhanced content')
    };

    (getContentGenerationAgent as any).mockReturnValue(mockAgent);

    const request = new NextRequest('http://localhost/api/ai/realtime/analyze', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content for analysis',
        section: 'experience',
        context: mockUserContext,
        options: {
          maxSuggestions: 5,
          includeImprovement: true,
          includeHelp: true
        }
      })
    });

    const response = await analyzePost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.suggestions).toHaveLength(1);
    expect(data.improvedContent).toBe('Enhanced content');
    expect(data.contextualHelp).toBeDefined();
    expect(data.metadata.section).toBe('experience');
  });

  it('should handle content enhancement errors gracefully', async () => {
    const mockAgent = {
      generateSuggestions: vi.fn().mockResolvedValue([]),
      enhanceContent: vi.fn().mockRejectedValue(new Error('Enhancement failed'))
    };

    (getContentGenerationAgent as any).mockReturnValue(mockAgent);

    const request = new NextRequest('http://localhost/api/ai/realtime/analyze', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        section: 'experience',
        context: mockUserContext,
        options: { includeImprovement: true }
      })
    });

    const response = await analyzePost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.improvedContent).toBeNull();
  });
});

describe('Feedback API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('should store single feedback correctly', async () => {
    (prisma.aIFeedback.create as any).mockResolvedValue({
      id: 'feedback-1',
      userId: 'user-123',
      suggestionId: 'suggestion-1',
      action: 'accepted'
    });

    (prisma.userContext.findUnique as any).mockResolvedValue({
      userId: 'user-123',
      contextData: { history: { interactions: [], feedbackPatterns: [] } }
    });

    (prisma.userContext.update as any).mockResolvedValue({});
    (prisma.aIFeedback.findMany as any).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({
        suggestionId: 'suggestion-1',
        action: 'accepted',
        originalContent: 'Original suggestion',
        timestamp: new Date().toISOString(),
        context: 'Test context'
      })
    });

    const response = await feedbackPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recordsCreated).toBe(1);
    expect(prisma.aIFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        suggestionId: 'suggestion-1',
        action: 'accepted',
        originalContent: 'Original suggestion'
      })
    });
  });

  it('should handle batch feedback correctly', async () => {
    (prisma.aIFeedback.create as any).mockResolvedValue({
      id: 'feedback-1',
      sessionId: 'session-123'
    });

    (prisma.userContext.findUnique as any).mockResolvedValue(null);
    (prisma.aIFeedback.findMany as any).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({
        feedback: [
          {
            suggestionId: 'suggestion-1',
            action: 'accepted',
            originalContent: 'First suggestion',
            timestamp: new Date().toISOString(),
            context: 'Test context 1'
          },
          {
            suggestionId: 'suggestion-2',
            action: 'rejected',
            originalContent: 'Second suggestion',
            timestamp: new Date().toISOString(),
            context: 'Test context 2'
          }
        ],
        sessionId: 'session-123'
      })
    });

    const response = await feedbackPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recordsCreated).toBe(2);
    expect(prisma.aIFeedback.create).toHaveBeenCalledTimes(2);
  });

  it('should retrieve feedback history correctly', async () => {
    const mockFeedback = [
      {
        id: 'feedback-1',
        suggestionId: 'suggestion-1',
        action: 'accepted',
        originalContent: 'Test suggestion',
        timestamp: new Date()
      }
    ];

    const mockStats = [
      { action: 'accepted', _count: { action: 5 } },
      { action: 'rejected', _count: { action: 2 } }
    ];

    (prisma.aIFeedback.findMany as any).mockResolvedValue(mockFeedback);
    (prisma.aIFeedback.groupBy as any).mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost/api/ai/feedback?limit=10&section=experience');

    const response = await feedbackGet(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.feedback).toEqual(mockFeedback);
    expect(data.statistics).toEqual({
      accepted: 5,
      rejected: 2
    });
  });

  it('should validate feedback data', async () => {
    const request = new NextRequest('http://localhost/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        suggestionId: '',
        action: 'invalid-action'
      })
    });

    const response = await feedbackPost(request);
    expect(response.status).toBe(400);
  });
});

describe('Help API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('should generate contextual help', async () => {
    const request = new NextRequest('http://localhost/api/ai/help', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content for help',
        section: 'experience',
        context: mockUserContext,
        helpType: 'general'
      })
    });

    const response = await helpPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.help).toBeDefined();
    expect(data.helpType).toBe('general');
    expect(data.metadata.section).toBe('experience');
  });

  it('should generate improvement-specific help', async () => {
    const request = new NextRequest('http://localhost/api/ai/help', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Short content',
        section: 'experience',
        context: mockUserContext,
        helpType: 'improvement'
      })
    });

    const response = await helpPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.help).toContain('Content is quite brief');
    expect(data.help).toContain('Add more specific details');
  });

  it('should generate examples help', async () => {
    const request = new NextRequest('http://localhost/api/ai/help', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        section: 'experience',
        context: mockUserContext,
        helpType: 'examples'
      })
    });

    const response = await helpPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.help).toContain('Example Experience Content');
    expect(data.help).toContain('Mid-Level technology Examples');
  });

  it('should generate best practices help', async () => {
    const request = new NextRequest('http://localhost/api/ai/help', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        section: 'experience',
        context: mockUserContext,
        helpType: 'best_practices'
      })
    });

    const response = await helpPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.help).toContain('Best Practices for Experience Section');
    expect(data.help).toContain('Structure & Format');
  });

  it('should include AI insights for substantial content', async () => {
    const request = new NextRequest('http://localhost/api/ai/help', {
      method: 'POST',
      body: JSON.stringify({
        content: 'This is a longer piece of content that should trigger AI insights generation because it has more than fifty characters',
        section: 'experience',
        context: mockUserContext
      })
    });

    const response = await helpPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.aiInsights).toBeDefined();
    expect(data.aiInsights).toContain('AI-Powered Content Analysis');
  });

  it('should validate help request data', async () => {
    const request = new NextRequest('http://localhost/api/ai/help', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required content field
        section: 'experience'
      })
    });

    const response = await helpPost(request);
    expect(response.status).toBe(400);
  });
});