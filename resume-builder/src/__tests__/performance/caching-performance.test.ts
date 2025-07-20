// Performance tests for caching systems

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisClient, CacheManager } from '@/lib/cache/redis-client';
import { ClientCacheManager } from '@/lib/cache/client-cache';
import { AIRequestQueue } from '@/lib/ai/queue';
import { DatabaseQueryOptimizer } from '@/lib/database/query-optimizer';

// Mock Redis for testing
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      hget: vi.fn(),
      hset: vi.fn(),
      hgetall: vi.fn(),
      mget: vi.fn(),
      mset: vi.fn(),
      pipeline: vi.fn().mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 1], [null, 'OK'], [null, 2], [null, 'OK']]),
      }),
      ping: vi.fn().mockResolvedValue('PONG'),
      info: vi.fn().mockResolvedValue('redis_version:6.0.0'),
      quit: vi.fn(),
      connect: vi.fn(),
      on: vi.fn(),
    })),
  };
});

describe('Caching Performance Tests', () => {
  let redisClient: RedisClient;
  let cacheManager: CacheManager;
  let clientCacheManager: ClientCacheManager;

  beforeEach(() => {
    redisClient = new RedisClient();
    cacheManager = new CacheManager(redisClient);
    clientCacheManager = new ClientCacheManager();
  });

  afterEach(() => {
    clientCacheManager.destroy();
  });

  describe('Redis Client Performance', () => {
    it('should handle high-volume cache operations efficiently', async () => {
      const startTime = performance.now();
      const operations = 1000;
      const promises = [];

      // Test concurrent cache operations
      for (let i = 0; i < operations; i++) {
        promises.push(
          redisClient.set(`test_key_${i}`, { data: `test_data_${i}`, timestamp: Date.now() })
        );
      }

      await Promise.all(promises);
      const setTime = performance.now() - startTime;

      // Test concurrent reads
      const readStartTime = performance.now();
      const readPromises = [];

      for (let i = 0; i < operations; i++) {
        readPromises.push(redisClient.get(`test_key_${i}`));
      }

      await Promise.all(readPromises);
      const readTime = performance.now() - readStartTime;

      // Performance assertions
      expect(setTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(readTime).toBeLessThan(3000); // Reads should be faster
      
      console.log(`Redis Performance: ${operations} sets in ${setTime.toFixed(2)}ms, ${operations} gets in ${readTime.toFixed(2)}ms`);
    });

    it('should efficiently handle batch operations', async () => {
      const batchSize = 100;
      const testData: Record<string, any> = {};

      for (let i = 0; i < batchSize; i++) {
        testData[`batch_key_${i}`] = { 
          id: i, 
          data: `batch_data_${i}`,
          timestamp: Date.now(),
        };
      }

      const startTime = performance.now();
      await redisClient.mset(testData, 300);
      const batchSetTime = performance.now() - startTime;

      const readStartTime = performance.now();
      const keys = Object.keys(testData);
      await redisClient.mget(keys);
      const batchGetTime = performance.now() - readStartTime;

      expect(batchSetTime).toBeLessThan(1000); // Batch operations should be fast
      expect(batchGetTime).toBeLessThan(500);

      console.log(`Batch Performance: ${batchSize} items set in ${batchSetTime.toFixed(2)}ms, retrieved in ${batchGetTime.toFixed(2)}ms`);
    });
  });

  describe('Client Cache Performance', () => {
    it('should handle rapid cache operations without memory leaks', async () => {
      const operations = 10000;
      const startMemory = process.memoryUsage().heapUsed;

      // Rapid cache operations
      const startTime = performance.now();
      
      for (let i = 0; i < operations; i++) {
        clientCacheManager.resume.cacheResume(`resume_${i}`, {
          id: `resume_${i}`,
          title: `Resume ${i}`,
          data: { content: `Content for resume ${i}` },
          timestamp: Date.now(),
        });
      }

      const cacheTime = performance.now() - startTime;

      // Test retrieval performance
      const retrievalStartTime = performance.now();
      
      for (let i = 0; i < operations; i++) {
        clientCacheManager.resume.getResume(`resume_${i}`);
      }

      const retrievalTime = performance.now() - retrievalStartTime;

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      // Performance assertions
      expect(cacheTime).toBeLessThan(2000); // Should cache quickly
      expect(retrievalTime).toBeLessThan(1000); // Retrieval should be very fast
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`Client Cache Performance: ${operations} operations in ${cacheTime.toFixed(2)}ms, retrieval in ${retrievalTime.toFixed(2)}ms`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should efficiently manage cache size and cleanup', async () => {
      const maxSize = 50;
      const testOperations = maxSize * 2; // Exceed max size

      // Fill cache beyond max size
      for (let i = 0; i < testOperations; i++) {
        clientCacheManager.resume.cacheResume(`test_resume_${i}`, {
          id: `test_resume_${i}`,
          data: { large_content: 'x'.repeat(1000) }, // 1KB per item
        });
      }

      // Allow cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = clientCacheManager.getOverallStats();
      
      // Should not exceed max size significantly
      expect(stats.totalSize).toBeLessThanOrEqual(maxSize * 1.2); // Allow 20% buffer
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);

      console.log(`Cache cleanup test: ${stats.totalSize} items, ${(stats.totalMemoryUsage / 1024).toFixed(2)}KB memory`);
    });
  });

  describe('AI Queue Performance', () => {
    it('should handle concurrent AI requests efficiently', async () => {
      const queue = new AIRequestQueue();
      const concurrentRequests = 50;
      const requests = [];

      const startTime = performance.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push({
          id: `test_request_${i}`,
          type: 'content-generation' as const,
          prompt: `Test prompt ${i}`,
          context: { test: true },
          userId: 'test_user',
          priority: 'normal' as const,
          timestamp: new Date(),
        });
      }

      // Process requests (mocked)
      const promises = requests.map(request => 
        queue.addRequest(request).catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(promises);
      const processingTime = performance.now() - startTime;

      const successfulRequests = results.filter(result => !('error' in result));
      const failedRequests = results.filter(result => 'error' in result);

      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(successfulRequests.length).toBeGreaterThan(0);

      console.log(`AI Queue Performance: ${concurrentRequests} requests processed in ${processingTime.toFixed(2)}ms`);
      console.log(`Success rate: ${(successfulRequests.length / concurrentRequests * 100).toFixed(1)}%`);

      await queue.shutdown();
    });

    it('should maintain performance under rate limiting', async () => {
      const queue = new AIRequestQueue();
      const userId = 'rate_limit_test_user';
      const requestCount = 20; // Should trigger rate limiting

      const startTime = performance.now();
      const promises = [];

      for (let i = 0; i < requestCount; i++) {
        promises.push(
          queue.addRequest({
            id: `rate_limit_test_${i}`,
            type: 'content-generation',
            prompt: `Rate limit test ${i}`,
            context: {},
            userId,
            priority: 'normal',
            timestamp: new Date(),
          }).catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const rateLimitErrors = results.filter(result => 
        'error' in result && result.error.includes('rate limit')
      );

      expect(totalTime).toBeLessThan(15000); // Should handle gracefully
      expect(rateLimitErrors.length).toBeGreaterThan(0); // Should have some rate limit errors

      console.log(`Rate Limiting Performance: ${requestCount} requests in ${totalTime.toFixed(2)}ms`);
      console.log(`Rate limited: ${rateLimitErrors.length} requests`);

      await queue.shutdown();
    });
  });

  describe('Database Query Performance', () => {
    it('should benchmark query optimization', async () => {
      // Mock Prisma client
      const mockPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'test_user',
            resumes: [],
            userContext: null,
            _count: { resumes: 0, aiFeedback: 0 },
          }),
        },
        resume: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        $transaction: vi.fn().mockImplementation((queries) => 
          Promise.all(queries.map((q: any) => q))
        ),
      } as any;

      const optimizer = new DatabaseQueryOptimizer(mockPrisma);
      const iterations = 100;

      // Test optimized queries
      const startTime = performance.now();
      
      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(
          optimizer.getUserWithResumes('test_user', { useCache: false })
        );
      }

      await Promise.all(promises);
      const queryTime = performance.now() - startTime;

      expect(queryTime).toBeLessThan(5000); // Should complete efficiently
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(iterations);

      console.log(`Database Query Performance: ${iterations} queries in ${queryTime.toFixed(2)}ms`);
      console.log(`Average query time: ${(queryTime / iterations).toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should monitor memory usage during intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      const operations = 1000;

      // Intensive cache operations
      for (let i = 0; i < operations; i++) {
        await cacheManager.cacheAIResponse(`test_hash_${i}`, {
          id: `response_${i}`,
          content: `AI response content ${i}`,
          provider: 'test',
          timestamp: new Date(),
          processingTime: Math.random() * 1000,
        });

        clientCacheManager.resume.cacheResume(`memory_test_${i}`, {
          id: `memory_test_${i}`,
          title: `Memory Test Resume ${i}`,
          data: { content: 'x'.repeat(500) }, // 500 bytes per resume
        });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external,
      };

      // Memory usage should be reasonable
      expect(memoryIncrease.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      
      console.log('Memory Usage Analysis:');
      console.log(`Heap Used: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Heap Total: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`External: ${(memoryIncrease.external / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Cache Hit Rate Analysis', () => {
    it('should measure cache effectiveness', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        key: `hit_rate_test_${i}`,
        data: { id: i, content: `Test data ${i}` },
      }));

      // Populate cache
      for (const item of testData) {
        clientCacheManager.resume.set(item.key, item.data);
      }

      // Test cache hits
      let hits = 0;
      let misses = 0;

      const startTime = performance.now();

      for (let round = 0; round < 5; round++) {
        for (const item of testData) {
          const cached = clientCacheManager.resume.get(item.key);
          if (cached) {
            hits++;
          } else {
            misses++;
          }
        }
      }

      const testTime = performance.now() - startTime;
      const hitRate = (hits / (hits + misses)) * 100;

      expect(hitRate).toBeGreaterThan(90); // Should have high hit rate
      expect(testTime).toBeLessThan(1000); // Should be fast

      console.log(`Cache Hit Rate Analysis:`);
      console.log(`Hit Rate: ${hitRate.toFixed(1)}%`);
      console.log(`Total Operations: ${hits + misses}`);
      console.log(`Test Time: ${testTime.toFixed(2)}ms`);
    });
  });
});