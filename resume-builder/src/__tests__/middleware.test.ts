import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-auth/middleware
vi.mock('next-auth/middleware', () => ({
  withAuth: vi.fn((middleware, config) => {
    return (req: NextRequest) => {
      // Simulate middleware behavior
      const token = req.headers.get('authorization') ? { id: 'user-id' } : null;
      
      if (config?.callbacks?.authorized) {
        const isAuthorized = config.callbacks.authorized({ token, req });
        if (!isAuthorized) {
          return new Response('Unauthorized', { status: 401 });
        }
      }
      
      return middleware(req);
    };
  }),
}));

describe('Authentication Middleware', () => {
  it('should protect dashboard routes', async () => {
    const { default: middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost:3000/dashboard');
    const response = await middleware(request);
    
    expect(response.status).toBe(401);
  });

  it('should protect resume routes', async () => {
    const { default: middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost:3000/resume/create');
    const response = await middleware(request);
    
    expect(response.status).toBe(401);
  });

  it('should allow access to public routes', async () => {
    const { default: middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost:3000/');
    const response = await middleware(request);
    
    // Should not return 401 for public routes
    expect(response.status).not.toBe(401);
  });

  it('should allow access to auth routes', async () => {
    const { default: middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost:3000/api/auth/signin');
    const response = await middleware(request);
    
    // Should not return 401 for auth routes
    expect(response.status).not.toBe(401);
  });

  it('should allow authenticated users to access protected routes', async () => {
    const { default: middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        authorization: 'Bearer token',
      },
    });
    
    const response = await middleware(request);
    
    // Should not return 401 for authenticated users
    expect(response.status).not.toBe(401);
  });
});