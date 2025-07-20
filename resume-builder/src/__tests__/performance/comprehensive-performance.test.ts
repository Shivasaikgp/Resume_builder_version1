// Comprehensive performance tests for all optimization features

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getPerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import { getClientCacheManager } from '@/lib/cache/client-cache';
import { getRedisClient, getCacheManager } from '@/lib/cache/redis-client';
import { AIRequestQueue } from '@/lib/ai/queue';
import { DatabaseQueryOptimizer } from '@/lib/database/query-optimizer';

// Mock external dependencies
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    mget: vi.fn().mockResolvedValue([]),
    mset: vi.fn().mockResolvedValue('OK'),
    ping: vi.fn().mockResolvedValue('PONG'),
    info: vi.fn().mockResolvedValue('redis_version:6.0.0'),
    quit: vi.fn().mockResolvedValue('OK'),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    isAvailable: vi.fn().mockReturnValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Comprehensive Performance Tests', () => {
  let performanceMonitor: ReturnType<typeof getPerformanceMonitor>;
  let clientCacheManager: ReturnType<typeof getClientCacheManager>;
  let redisClient: ReturnType<typeof getRedisClient>;
  let cacheManager: ReturnType<typeof getCacheManager>;

  beforeAll(() => {
    performanceMonitor = getPerformanceMonitor();
    clientCacheManager = getClientCacheManager();
    redisClient = getRedisClient();
    cacheManager = getCacheManager();
  });

  afterAll(() => {
    clientCacheManager.destroy();
  });

  describe('End-to-End Performance Scenarios', () => {
    it('should handle complete resume workflow efficiently', async () => {
      const userId = 'performance_test_user';
      const resumeCount = 50;
      const workflowStartTime = performance.now();

      // Simulate complete resume workflow
      performanceMonitor.startTimer('complete_workflow');

      // 1. User authentication and context loading
      performanceMonitor.startTimer('user_context_load');
      const userContext = {
        userId,
        profile: {
          industry: 'technology',
          experienceLevel: 'mid' as const,
          targetRoles: ['Software Engineer', 'Full Stack Developer'],
          skills: ['JavaScript', 'React', 'Node.js'],
          careerGoals: ['Senior Developer Role'],
        },
        preferences: {
          writingStyle: 'professional' as const,
          contentLength: 'detailed' as const,
          focusAreas: ['technical skills', 'achievements'],
        },
      };
      
      clientCacheManager.userContext.cacheUserContext(userId, userContext);
      performanceMonitor.endTimer('user_context_load');

      // 2. Resume list loading with pagination
      performanceMonitor.startTimer('resume_list_load');
      const resumes = Array.from({ length: resumeCount }, (_, i) => ({
        id: `resume_${i}`,
        title: `Resume ${i}`,
        userId,
        data: {
          personalInfo: {
            name: `Test User ${i}`,
            email: `test${i}@example.com`,
            phone: '555-0123',
          },
          experience: [
            {
              company: `Company ${i}`,
              position: `Position ${i}`,
              duration: '2020-2023',
              achievements: [`Achievement ${i}`],
            },
          ],
        },
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Cache resume list
      clientCacheManager.resume.cacheResumeList(userId, resumes);
      
      // Cache individual resumes
      for (const resume of resumes) {
        clientCacheManager.resume.cacheResume(resume.id, resume);
      }
      performanceMonitor.endTimer('resume_list_load');

      // 3. AI content generation simulation
      performanceMonitor.startTimer('ai_content_generation');
      const aiPromises = [];
      
      for (let i = 0; i < 10; i++) {
        const requestHash = `ai_request_${i}`;
        const aiResponse = {
          id: requestHash,
          content: `Generated content for request ${i}`,
          provider: 'test',
          timestamp: new Date(),
          processingTime: Math.random() * 1000,
        };
        
        aiPromises.push(
          cacheManager.cacheAIResponse(requestHash, aiResponse)
        );
      }
      
      await Promise.all(aiPromises);
      performanceMonitor.endTimer('ai_content_generation');

      // 4. Resume analysis simulation
      performanceMonitor.startTimer('resume_analysis');
      const analysisPromises = resumes.slice(0, 10).map(async (resume) => {
        const analysisHash = `analysis_${resume.id}`;
        const analysis = {
          score: Math.floor(Math.random() * 100),
          breakdown: {
            content: Math.floor(Math.random() * 100),
            formatting: Math.floor(Math.random() * 100),
            keywords: Math.floor(Math.random() * 100),
          },
          suggestions: [`Suggestion for ${resume.title}`],
        };
        
        clientCacheManager.ai.cacheAnalysis(analysisHash, analysis);
        return analysis;
      });
      
      await Promise.all(analysisPromises);
      performanceMonitor.endTimer('resume_analysis');

      // 5. Template adaptation simulation
      performanceMonitor.startTimer('template_adaptation');
      const templateData = {
        id: 'adaptive_template',
        layout: 'professional',
        sections: ['header', 'experience', 'education', 'skills'],
        adaptationRules: [
          { condition: 'experienceLevel === "entry"', modifications: ['simplify_layout'] },
          { condition: 'experienceLevel === "senior"', modifications: ['expand_achievements'] },
        ],
      };
      
      clientCacheManager.template.cacheTemplate('adaptive_template', templateData);
      performanceMonitor.endTimer('template_adaptation');

      const totalWorkflowTime = performanceMonitor.endTimer('complete_workflow');

      // Performance assertions
      expect(totalWorkflowTime).toBeLessThan(5000); // Complete workflow under 5 seconds
      
      // Check cache effectiveness
      const cacheStats = clientCacheManager.getOverallStats();
      expect(cacheStats.totalSize).toBeGreaterThan(resumeCount);
      expect(cacheStats.totalMemoryUsage).toBeGreaterThan(0);

      console.log(`Complete Workflow Performance:`);
      console.log(`Total Time: ${totalWorkflowTime.toFixed(2)}ms`);
      console.log(`Resumes Processed: ${resumeCount}`);
      console.log(`Cache Size: ${cacheStats.totalSize} items`);
      console.log(`Memory Usage: ${(cacheStats.totalMemoryUsage / 1024).toFixed(2)}KB`);
    });

    it('should handle concurrent user sessions efficiently', async () => {
      const userCount = 20;
      const operationsPerUser = 10;
      
      performanceMonitor.startTimer('concurrent_sessions');

      const userPromises = Array.from({ length: userCount }, async (_, userIndex) => {
        const userId = `concurrent_user_${userIndex}`;
        const userOperations = [];

        for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
          // Simulate various operations
          userOperations.push(
            // Cache user context
            clientCacheManager.userContext.cacheUserContext(userId, {
              userId,
              lastActivity: new Date(),
              preferences: { theme: 'light' },
            }),
            
            // Cache resume data
            clientCacheManager.resume.cacheResume(`${userId}_resume_${opIndex}`, {
              id: `${userId}_resume_${opIndex}`,
              title: `Resume ${opIndex}`,
              data: { content: `Content ${opIndex}` },
            }),
            
            // Cache AI response
            cacheManager.cacheAIResponse(`${userId}_ai_${opIndex}`, {
              id: `${userId}_ai_${opIndex}`,
              content: `AI response ${opIndex}`,
              provider: 'test',
              timestamp: new Date(),
              processingTime: Math.random() * 500,
            })
          );
        }

        return Promise.all(userOperations);
      });

      await Promise.all(userPromises);
      const concurrentTime = performanceMonitor.endTimer('concurrent_sessions');

      // Performance assertions
      expect(concurrentTime).toBeLessThan(10000); // Under 10 seconds for all concurrent operations
      
      const finalCacheStats = clientCacheManager.getOverallStats();
      expect(finalCacheStats.totalSize).toBeGreaterThan(userCount * operationsPerUser);

      console.log(`Concurrent Sessions Performance:`);
      console.log(`Users: ${userCount}, Operations per user: ${operationsPerUser}`);
      console.log(`Total Time: ${concurrentTime.toFixed(2)}ms`);
      console.log(`Final Cache Size: ${finalCacheStats.totalSize} items`);
    });

    it('should maintain performance under memory pressure', async () => {
      const initialMemory = process.memoryUsage();
      const largeDataCount = 1000;
      
      performanceMonitor.startTimer('memory_pressure_test');

      // Create large data objects to simulate memory pressure
      const largeDataPromises = Array.from({ length: largeDataCount }, (_, i) => {
        const largeData = {
          id: `large_data_${i}`,
          content: 'x'.repeat(10000), // 10KB per item
          metadata: {
            created: new Date(),
            index: i,
            tags: Array.from({ length: 100 }, (_, j) => `tag_${j}`),
          },
        };

        return Promise.all([
          clientCacheManager.resume.cacheResume(`large_resume_${i}`, largeData),
          cacheManager.cacheAIResponse(`large_ai_${i}`, {
            id: `large_ai_${i}`,
            content: largeData.content,
            provider: 'test',
            timestamp: new Date(),
            processingTime: Math.random() * 1000,
          }),
        ]);
      });

      await Promise.all(largeDataPromises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryPressureTime = performanceMonitor.endTimer('memory_pressure_test');
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Performance assertions
      expect(memoryPressureTime).toBeLessThan(15000); // Under 15 seconds
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB increase

      // Check that cache cleanup is working
      const cacheStats = clientCacheManager.getOverallStats();
      expect(cacheStats.totalSize).toBeLessThanOrEqual(largeDataCount * 1.2); // Allow some buffer

      console.log(`Memory Pressure Test:`);
      console.log(`Processing Time: ${memoryPressureTime.toFixed(2)}ms`);
      console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Cache Items: ${cacheStats.totalSize}`);
    });

    it('should handle database query optimization effectively', async () => {
      // Mock Prisma client with realistic delays
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            return {
              id: 'test_user',
              email: 'test@example.com',
              resumes: [],
              userContext: null,
              _count: { resumes: 0, aiFeedback: 0 },
            };
          }),
        },
        resume: {
          findMany: vi.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
            return [];
          }),
          count: vi.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            return 0;
          }),
        },
        $transaction: vi.fn().mockImplementation(async (queries) => {
          const results = await Promise.all(queries.map(async (q: any) => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            return q;
          }));
          return results;
        }),
      } as any;

      const optimizer = new DatabaseQueryOptimizer(mockPrisma);
      const queryCount = 100;

      performanceMonitor.startTimer('database_optimization_test');

      // Test various optimized queries
      const queryPromises = [];

      for (let i = 0; i < queryCount; i++) {
        queryPromises.push(
          optimizer.getUserWithResumes('test_user', {
            useCache: true,
            limit: 20,
            includeRelations: i % 2 === 0,
          })
        );
      }

      await Promise.all(queryPromises);
      const dbOptimizationTime = performanceMonitor.endTimer('database_optimization_test');

      // Performance assertions
      expect(dbOptimizationTime).toBeLessThan(10000); // Under 10 seconds for 100 queries
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(queryCount);

      console.log(`Database Optimization Test:`);
      console.log(`Queries: ${queryCount}`);
      console.log(`Total Time: ${dbOptimizationTime.toFixed(2)}ms`);
      console.log(`Average Query Time: ${(dbOptimizationTime / queryCount).toFixed(2)}ms`);
    });

    it('should demonstrate effective lazy loading performance', async () => {
      const totalItems = 1000;
      const pageSize = 20;
      const totalPages = Math.ceil(totalItems / pageSize);

      performanceMonitor.startTimer('lazy_loading_test');

      // Simulate lazy loading scenario
      const loadedPages = [];
      
      for (let page = 1; page <= Math.min(totalPages, 10); page++) {
        const pageStartTime = performance.now();
        
        // Simulate page data generation
        const pageData = Array.from({ length: pageSize }, (_, i) => {
          const itemIndex = (page - 1) * pageSize + i;
          return {
            id: `item_${itemIndex}`,
            title: `Item ${itemIndex}`,
            data: { content: `Content for item ${itemIndex}` },
            timestamp: new Date(),
          };
        });

        // Cache the page
        const cacheKey = `lazy_page_${page}`;
        clientCacheManager.resume.set(cacheKey, pageData);
        
        const pageTime = performance.now() - pageStartTime;
        loadedPages.push({ page, time: pageTime, items: pageData.length });

        // Simulate user scrolling delay
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const lazyLoadingTime = performanceMonitor.endTimer('lazy_loading_test');

      // Performance assertions
      expect(lazyLoadingTime).toBeLessThan(5000); // Under 5 seconds for 10 pages
      expect(loadedPages.length).toBe(10);

      const averagePageTime = loadedPages.reduce((sum, page) => sum + page.time, 0) / loadedPages.length;
      expect(averagePageTime).toBeLessThan(100); // Each page should load in under 100ms

      console.log(`Lazy Loading Performance:`);
      console.log(`Pages Loaded: ${loadedPages.length}`);
      console.log(`Total Time: ${lazyLoadingTime.toFixed(2)}ms`);
      console.log(`Average Page Time: ${averagePageTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should accurately track performance metrics', async () => {
      // Clear previous metrics
      performanceMonitor.clearMetrics();

      // Generate various performance events
      const operations = [
        'cache_read',
        'cache_write',
        'database_query',
        'ai_request',
        'template_render',
      ];

      for (let i = 0; i < 50; i++) {
        const operation = operations[i % operations.length];
        const duration = Math.random() * 1000; // 0-1000ms
        
        performanceMonitor.recordValue(operation, duration, {
          iteration: i.toString(),
          operation_type: operation,
        });
        
        performanceMonitor.incrementCounter(`${operation}_count`);
      }

      // Generate performance report
      const report = performanceMonitor.generatePerformanceReport();

      expect(report.summary.totalMetrics).toBeGreaterThan(0);
      expect(report.topSlowOperations.length).toBeGreaterThan(0);
      expect(report.system.memoryUsage).toBeDefined();

      // Test histogram statistics
      for (const operation of operations) {
        const stats = performanceMonitor.getHistogramStats(operation);
        expect(stats).toBeDefined();
        expect(stats!.count).toBeGreaterThan(0);
        expect(stats!.mean).toBeGreaterThan(0);
      }

      console.log(`Performance Monitoring Integration:`);
      console.log(`Total Metrics: ${report.summary.totalMetrics}`);
      console.log(`Top Slow Operations: ${report.topSlowOperations.length}`);
      console.log(`Memory Usage: ${(report.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});