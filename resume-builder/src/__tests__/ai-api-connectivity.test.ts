// AI API Connectivity Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as contentPost } from '@/app/api/ai/content/route';
import { POST as analyzePost } from '@/app/api/ai/analyze/route';
import { GET as statusGet } from '@/app/api/ai/status/route';

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock AI services to avoid actual API calls
vi.mock('@/lib/ai/queue', () => ({
  getAIQueue: vi.fn(() => ({
    addRequest: vi.fn().mockResolvedValue({
      id: 'test-response-id',
      requestId: 'test-request-id',
      content: 'Test AI response content',
      provider: 'openai',
      model: 'gpt-4o-mini',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      timestamp: new Date(),
      processingTime: 150,
    }),
    getQueueStatus: vi.fn(() => ({
      pending: 0,
      processing: 0,
      completed: 5,
      failed: 0,
      totalProcessed: 5,
    })),
    getRateLimitStatus: vi.fn().mockResolvedValue({
      requestsRemaining: 59,
      resetTime: new Date(Date.now() + 60000),
      isLimited: false,
    }),
  }))
}));

vi.mock('@/lib/ai/clients', () => ({
  getAIClients: vi.fn(() => ({
    getHealthStatus: vi.fn(() => new Map([
      ['openai', {
        provider: 'openai',
        status: 'healthy',
        responseTime: 120,
        errorRate: 0,
        lastCheck: new Date(),
      }],
      ['anthropic', {
        provider: 'anthropic',
        status: 'healthy',
        responseTime: 180,
        errorRate: 0,
        lastCheck: new Date(),
      }]
    ])),
    getAvailableProviders: vi.fn(() => ['openai', 'anthropic']),
  }))
}));

describe('AI API Endpoints', () => {
  describe('Content Generation API', () => {
    it('should handle valid content generation request', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/content', {
        method: 'POST',
        body: JSON.stringify({
          type: 'content-generation',
          prompt: 'Generate a professional summary for a software engineer',
          context: { role: 'Software Engineer', experience: '5 years' },
          priority: 'normal'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await contentPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBeDefined();
      expect(data.content).toBe('Test AI response content');
      expect(data.provider).toBe('openai');
      expect(data.processingTime).toBeDefined();
    });

    it('should reject request without prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/content', {
        method: 'POST',
        body: JSON.stringify({
          type: 'content-generation',
          context: { role: 'Software Engineer' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await contentPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
    });

    it('should reject invalid request format', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/content', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '', // Empty prompt
          type: 'invalid-type'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await contentPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
    });
  });

  describe('Analysis API', () => {
    it('should handle valid analysis request', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          type: 'analysis',
          prompt: 'Analyze this resume for ATS compatibility',
          context: { 
            resumeData: { 
              personalInfo: { name: 'John Doe' },
              sections: []
            }
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBeDefined();
      expect(data.content).toBe('Test AI response content');
    });

    it('should reject analysis request without context', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          type: 'analysis',
          prompt: 'Analyze this resume'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await analyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request format');
    });
  });

  describe('Status API', () => {
    it('should return AI service status', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/status');

      const response = await statusGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.providers).toBeDefined();
      expect(data.providers.available).toEqual(['openai', 'anthropic']);
      expect(data.providers.health).toBeDefined();
      expect(data.queue).toBeDefined();
      expect(data.rateLimit).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should include health status for all providers', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/status');

      const response = await statusGet(request);
      const data = await response.json();

      expect(data.providers.health.openai).toBeDefined();
      expect(data.providers.health.openai.status).toBe('healthy');
      expect(data.providers.health.anthropic).toBeDefined();
      expect(data.providers.health.anthropic.status).toBe('healthy');
    });

    it('should include queue and rate limit information', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/status');

      const response = await statusGet(request);
      const data = await response.json();

      expect(data.queue.pending).toBeDefined();
      expect(data.queue.processing).toBeDefined();
      expect(data.queue.completed).toBeDefined();
      expect(data.queue.failed).toBeDefined();

      expect(data.rateLimit.requestsRemaining).toBeDefined();
      expect(data.rateLimit.resetTime).toBeDefined();
      expect(data.rateLimit.isLimited).toBeDefined();
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should require authentication for content generation', async () => {
      // Mock no session
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/ai/content', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test prompt',
          type: 'content-generation'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await contentPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should require authentication for status endpoint', async () => {
      // Mock no session
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/ai/status');

      const response = await statusGet(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });
});