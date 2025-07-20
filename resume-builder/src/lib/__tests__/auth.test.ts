import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/prisma';

// Mock NextAuth
vi.mock('next-auth', () => ({
  default: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Authentication System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      };

      // Mock Prisma calls
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('User created successfully');
      expect(data.user.email).toBe('test@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      const existingUser = {
        id: 'existing-id',
        email: 'test@example.com',
        name: 'Existing User',
      };

      (prisma.user.findUnique as any).mockResolvedValue(existingUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User with this email already exists');
    });

    it('should validate input data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'A', // Too short
          email: 'invalid-email', // Invalid email
          password: '123', // Too short
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should hash password before storing', async () => {
      const mockUser = {
        id: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      await POST(request);

      const createCall = (prisma.user.create as any).mock.calls[0][0];
      expect(createCall.data.password).toBeDefined();
      expect(createCall.data.password).not.toBe('password123');
      
      // Verify password was hashed
      const isValidHash = await bcrypt.compare('password123', createCall.data.password);
      expect(isValidHash).toBe(true);
    });
  });

  describe('Authentication Configuration', () => {
    it('should have proper NextAuth configuration', async () => {
      const { authOptions } = await import('@/lib/auth');
      
      expect(authOptions).toBeDefined();
      expect(authOptions.providers).toBeDefined();
      expect(authOptions.session?.strategy).toBe('jwt');
      expect(authOptions.pages?.signIn).toBe('/auth/signin');
      expect(authOptions.callbacks).toBeDefined();
    });

    it('should have proper JWT and session configuration', async () => {
      const { authOptions } = await import('@/lib/auth');
      
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
      expect(authOptions.jwt?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
    });
  });

  describe('Session Management', () => {
    it('should properly configure session callbacks', async () => {
      const { authOptions } = await import('@/lib/auth');
      
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(authOptions.callbacks?.session).toBeDefined();
    });

    it('should include user ID in session', async () => {
      const { authOptions } = await import('@/lib/auth');
      
      const mockToken = { id: 'user-id', email: 'test@example.com', name: 'Test User' };
      const mockSession = { user: { email: 'test@example.com', name: 'Test User' } };
      
      const result = await authOptions.callbacks?.session?.({
        session: mockSession as any,
        token: mockToken as any,
      });
      
      expect(result?.user.id).toBe('user-id');
    });
  });
});