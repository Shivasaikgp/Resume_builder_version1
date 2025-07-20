// Vector Store Tests
// Tests for vector storage, similarity search, and metadata management

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorStore, VectorMetadata } from '../vector-store';
import Redis from 'ioredis';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      get: vi.fn(),
      sadd: vi.fn(),
      smembers: vi.fn(),
      del: vi.fn(),
      srem: vi.fn(),
      quit: vi.fn(),
    })),
  };
});

describe('VectorStore', () => {
  let vectorStore: VectorStore;
  let mockRedis: any;

  const testVector = [0.1, 0.2, 0.3, 0.4, 0.5];
  const testMetadata: VectorMetadata = {
    userId: 'test-user-123',
    profile: { industry: 'technology', experienceLevel: 'mid' },
    preferences: { writingStyle: 'technical' },
  };

  beforeEach(() => {
    vectorStore = new VectorStore();
    mockRedis = new Redis() as any;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeVector', () => {
    it('should store vector and metadata successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      await vectorStore.storeVector('test-id', testVector, testMetadata);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'vector:test-id',
        JSON.stringify(testVector)
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'metadata:test-id',
        expect.stringContaining('"userId":"test-user-123"')
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith('vector_index', 'test-id');
    });

    it('should handle storage errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      await expect(
        vectorStore.storeVector('test-id', testVector, testMetadata)
      ).rejects.toThrow('Redis error');
    });

    it('should store metadata with timestamp', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      await vectorStore.storeVector('test-id', testVector, testMetadata);

      const metadataCall = mockRedis.set.mock.calls.find(
        call => call[0] === 'metadata:test-id'
      );
      expect(metadataCall).toBeDefined();
      
      const storedMetadata = JSON.parse(metadataCall[1]);
      expect(storedMetadata).toHaveProperty('timestamp');
      expect(storedMetadata.userId).toBe('test-user-123');
    });
  });

  describe('findSimilarVectors', () => {
    const queryVector = [0.1, 0.2, 0.3, 0.4, 0.5];
    const similarVector = [0.11, 0.21, 0.31, 0.41, 0.51]; // Very similar
    const dissimilarVector = [0.9, 0.8, 0.7, 0.6, 0.5]; // Less similar

    beforeEach(() => {
      mockRedis.smembers.mockResolvedValue(['id1', 'id2', 'id3']);
    });

    it('should find similar vectors above threshold', async () => {
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(similarVector)) // id1
        .mockResolvedValueOnce(JSON.stringify(dissimilarVector)) // id2
        .mockResolvedValueOnce(JSON.stringify(queryVector)); // id3

      const results = await vectorStore.findSimilarVectors(queryVector, 5, undefined, {
        threshold: 0.8,
      });

      expect(results).toContain('id1'); // Similar vector
      expect(results).toContain('id3'); // Identical vector
      expect(results).not.toContain('id2'); // Dissimilar vector
    });

    it('should exclude specified ID from results', async () => {
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(similarVector)) // id1
        .mockResolvedValueOnce(JSON.stringify(queryVector)); // id2

      const results = await vectorStore.findSimilarVectors(
        queryVector,
        5,
        'id2' // Exclude this ID
      );

      expect(results).toContain('id1');
      expect(results).not.toContain('id2');
    });

    it('should limit results to specified count', async () => {
      mockRedis.smembers.mockResolvedValue(['id1', 'id2', 'id3', 'id4', 'id5']);
      mockRedis.get.mockResolvedValue(JSON.stringify(similarVector));

      const results = await vectorStore.findSimilarVectors(queryVector, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle malformed vector data gracefully', async () => {
      mockRedis.get
        .mockResolvedValueOnce('invalid-json') // id1
        .mockResolvedValueOnce(JSON.stringify(similarVector)); // id2

      const results = await vectorStore.findSimilarVectors(queryVector);

      expect(results).toContain('id2');
      expect(results).not.toContain('id1');
    });

    it('should return empty array when no vectors match threshold', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(dissimilarVector));

      const results = await vectorStore.findSimilarVectors(queryVector, 5, undefined, {
        threshold: 0.99, // Very high threshold
      });

      expect(results).toEqual([]);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.smembers.mockRejectedValue(new Error('Redis error'));

      const results = await vectorStore.findSimilarVectors(queryVector);

      expect(results).toEqual([]);
    });
  });

  describe('getVector', () => {
    it('should retrieve stored vector', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(testVector));

      const result = await vectorStore.getVector('test-id');

      expect(result).toEqual(testVector);
      expect(mockRedis.get).toHaveBeenCalledWith('vector:test-id');
    });

    it('should return null for non-existent vector', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await vectorStore.getVector('non-existent');

      expect(result).toBeNull();
    });

    it('should handle malformed vector data', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await vectorStore.getVector('test-id');

      expect(result).toBeNull();
    });
  });

  describe('getMetadata', () => {
    it('should retrieve stored metadata', async () => {
      const storedMetadata = { ...testMetadata, timestamp: new Date().toISOString() };
      mockRedis.get.mockResolvedValue(JSON.stringify(storedMetadata));

      const result = await vectorStore.getMetadata('test-id');

      expect(result).toEqual(storedMetadata);
      expect(mockRedis.get).toHaveBeenCalledWith('metadata:test-id');
    });

    it('should return null for non-existent metadata', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await vectorStore.getMetadata('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteVector', () => {
    it('should delete vector and metadata', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.srem.mockResolvedValue(1);

      await vectorStore.deleteVector('test-id');

      expect(mockRedis.del).toHaveBeenCalledWith('vector:test-id');
      expect(mockRedis.del).toHaveBeenCalledWith('metadata:test-id');
      expect(mockRedis.srem).toHaveBeenCalledWith('vector_index', 'test-id');
    });

    it('should handle deletion errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Delete error'));

      await expect(vectorStore.deleteVector('test-id')).rejects.toThrow('Delete error');
    });
  });

  describe('searchByMetadata', () => {
    it('should find vectors matching metadata filters', async () => {
      mockRedis.smembers.mockResolvedValue(['id1', 'id2', 'id3']);
      
      const metadata1 = { userId: 'user1', profile: { industry: 'tech' } };
      const metadata2 = { userId: 'user2', profile: { industry: 'finance' } };
      const metadata3 = { userId: 'user3', profile: { industry: 'tech' } };

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(metadata1)) // id1
        .mockResolvedValueOnce(JSON.stringify(metadata2)) // id2
        .mockResolvedValueOnce(JSON.stringify(metadata3)); // id3

      const results = await vectorStore.searchByMetadata({
        'profile.industry': 'tech',
      });

      expect(results).toContain('id1');
      expect(results).toContain('id3');
      expect(results).not.toContain('id2');
    });

    it('should handle nested property filters', async () => {
      mockRedis.smembers.mockResolvedValue(['id1']);
      mockRedis.get.mockResolvedValue(JSON.stringify({
        userId: 'user1',
        profile: { industry: 'tech', level: 'senior' },
      }));

      const results = await vectorStore.searchByMetadata({
        'profile.level': 'senior',
      });

      expect(results).toContain('id1');
    });

    it('should limit results', async () => {
      mockRedis.smembers.mockResolvedValue(['id1', 'id2', 'id3', 'id4']);
      mockRedis.get.mockResolvedValue(JSON.stringify({ userId: 'match' }));

      const results = await vectorStore.searchByMetadata({ userId: 'match' }, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getStats', () => {
    it('should return vector store statistics', async () => {
      mockRedis.smembers.mockResolvedValue(['id1', 'id2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify([1, 2, 3])) // vector id1
        .mockResolvedValueOnce(JSON.stringify({ timestamp: '2024-01-01' })) // metadata id1
        .mockResolvedValueOnce(JSON.stringify([4, 5, 6, 7])) // vector id2
        .mockResolvedValueOnce(JSON.stringify({ timestamp: '2024-01-02' })); // metadata id2

      const stats = await vectorStore.getStats();

      expect(stats.totalVectors).toBe(2);
      expect(stats.averageDimension).toBe(3.5); // (3 + 4) / 2
      expect(stats.oldestVector).toEqual(new Date('2024-01-01'));
      expect(stats.newestVector).toEqual(new Date('2024-01-02'));
    });

    it('should handle empty vector store', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const stats = await vectorStore.getStats();

      expect(stats.totalVectors).toBe(0);
      expect(stats.averageDimension).toBe(0);
      expect(stats.oldestVector).toBeNull();
      expect(stats.newestVector).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should clear all vectors and metadata', async () => {
      mockRedis.smembers.mockResolvedValue(['id1', 'id2']);
      mockRedis.pipeline.mockReturnValue({
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });

      await vectorStore.clearAll();

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('Cosine Similarity Calculation', () => {
    it('should calculate correct cosine similarity', async () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const vector3 = [1, 0, 0]; // Same as vector1

      mockRedis.smembers.mockResolvedValue(['id1', 'id2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(vector2)) // id1 - orthogonal
        .mockResolvedValueOnce(JSON.stringify(vector3)); // id2 - identical

      const results = await vectorStore.findSimilarVectors(vector1, 5, undefined, {
        threshold: 0.5,
      });

      // Should find identical vector but not orthogonal one
      expect(results).toContain('id2');
      expect(results).not.toContain('id1');
    });

    it('should handle zero vectors', async () => {
      const zeroVector = [0, 0, 0];
      const normalVector = [1, 2, 3];

      mockRedis.smembers.mockResolvedValue(['id1']);
      mockRedis.get.mockResolvedValue(JSON.stringify(normalVector));

      const results = await vectorStore.findSimilarVectors(zeroVector);

      expect(results).toEqual([]);
    });

    it('should handle mismatched vector dimensions', async () => {
      const vector2D = [1, 2];
      const vector3D = [1, 2, 3];

      mockRedis.smembers.mockResolvedValue(['id1']);
      mockRedis.get.mockResolvedValue(JSON.stringify(vector3D));

      const results = await vectorStore.findSimilarVectors(vector2D);

      expect(results).toEqual([]);
    });
  });

  describe('Connection Management', () => {
    it('should close Redis connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await vectorStore.close();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle connection close errors', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Close error'));

      // Should not throw
      await expect(vectorStore.close()).resolves.toBeUndefined();
    });
  });
});