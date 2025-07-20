// Vector Store for Context Management
// Handles vector storage and similarity search for user context matching

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

export interface VectorMetadata {
  userId: string;
  profile?: any;
  preferences?: any;
  timestamp?: Date;
}

export interface SimilarityResult {
  userId: string;
  similarity: number;
  metadata: VectorMetadata;
}

export interface VectorSearchOptions {
  threshold?: number;
  includeMetadata?: boolean;
  filterBy?: Record<string, any>;
}

export class VectorStore {
  private redis: Redis;
  private vectorDimension = 128; // Default dimension for our simple vectors
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Store a vector with associated metadata
   */
  async storeVector(
    id: string, 
    vector: number[], 
    metadata: VectorMetadata
  ): Promise<void> {
    try {
      const vectorKey = `vector:${id}`;
      const metadataKey = `metadata:${id}`;
      
      // Store vector as JSON string
      await this.redis.set(vectorKey, JSON.stringify(vector));
      
      // Store metadata
      await this.redis.set(metadataKey, JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString()
      }));
      
      // Add to index for efficient searching
      await this.redis.sadd('vector_index', id);
      
      console.log(`Stored vector for ${id} with dimension ${vector.length}`);
    } catch (error) {
      console.error('Failed to store vector:', error);
      throw error;
    }
  }

  /**
   * Find similar vectors using cosine similarity
   */
  async findSimilarVectors(
    queryVector: number[],
    limit: number = 5,
    excludeId?: string,
    options: VectorSearchOptions = {}
  ): Promise<string[]> {
    try {
      const { threshold = 0.7, includeMetadata = false } = options;
      
      // Get all vector IDs from index
      const vectorIds = await this.redis.smembers('vector_index');
      
      const similarities: Array<{ id: string; similarity: number; metadata?: VectorMetadata }> = [];
      
      // Calculate similarity for each vector
      for (const id of vectorIds) {
        if (excludeId && id === excludeId) continue;
        
        const vectorKey = `vector:${id}`;
        const storedVectorStr = await this.redis.get(vectorKey);
        
        if (!storedVectorStr) continue;
        
        try {
          const storedVector = JSON.parse(storedVectorStr) as number[];
          const similarity = this.calculateCosineSimilarity(queryVector, storedVector);
          
          if (similarity >= threshold) {
            const result: any = { id, similarity };
            
            if (includeMetadata) {
              const metadataKey = `metadata:${id}`;
              const metadataStr = await this.redis.get(metadataKey);
              if (metadataStr) {
                result.metadata = JSON.parse(metadataStr);
              }
            }
            
            similarities.push(result);
          }
        } catch (parseError) {
          console.error(`Failed to parse vector for ${id}:`, parseError);
          continue;
        }
      }
      
      // Sort by similarity and return top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      return similarities
        .slice(0, limit)
        .map(result => result.id);
        
    } catch (error) {
      console.error('Failed to find similar vectors:', error);
      return [];
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(id: string): Promise<number[] | null> {
    try {
      const vectorKey = `vector:${id}`;
      const vectorStr = await this.redis.get(vectorKey);
      
      if (!vectorStr) return null;
      
      return JSON.parse(vectorStr) as number[];
    } catch (error) {
      console.error('Failed to get vector:', error);
      return null;
    }
  }

  /**
   * Get metadata by ID
   */
  async getMetadata(id: string): Promise<VectorMetadata | null> {
    try {
      const metadataKey = `metadata:${id}`;
      const metadataStr = await this.redis.get(metadataKey);
      
      if (!metadataStr) return null;
      
      return JSON.parse(metadataStr) as VectorMetadata;
    } catch (error) {
      console.error('Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Delete vector and metadata
   */
  async deleteVector(id: string): Promise<void> {
    try {
      const vectorKey = `vector:${id}`;
      const metadataKey = `metadata:${id}`;
      
      await Promise.all([
        this.redis.del(vectorKey),
        this.redis.del(metadataKey),
        this.redis.srem('vector_index', id)
      ]);
      
      console.log(`Deleted vector for ${id}`);
    } catch (error) {
      console.error('Failed to delete vector:', error);
      throw error;
    }
  }

  /**
   * Get all vector IDs
   */
  async getAllVectorIds(): Promise<string[]> {
    try {
      return await this.redis.smembers('vector_index');
    } catch (error) {
      console.error('Failed to get vector IDs:', error);
      return [];
    }
  }

  /**
   * Search vectors by metadata filters
   */
  async searchByMetadata(
    filters: Record<string, any>,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const vectorIds = await this.redis.smembers('vector_index');
      const matchingIds: string[] = [];
      
      for (const id of vectorIds) {
        const metadata = await this.getMetadata(id);
        if (!metadata) continue;
        
        // Check if metadata matches all filters
        const matches = Object.entries(filters).every(([key, value]) => {
          const metadataValue = this.getNestedValue(metadata, key);
          return metadataValue === value;
        });
        
        if (matches) {
          matchingIds.push(id);
        }
        
        if (matchingIds.length >= limit) break;
      }
      
      return matchingIds;
    } catch (error) {
      console.error('Failed to search by metadata:', error);
      return [];
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<{
    totalVectors: number;
    averageDimension: number;
    oldestVector: Date | null;
    newestVector: Date | null;
  }> {
    try {
      const vectorIds = await this.redis.smembers('vector_index');
      let totalDimension = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;
      
      for (const id of vectorIds) {
        const vector = await this.getVector(id);
        const metadata = await this.getMetadata(id);
        
        if (vector) {
          totalDimension += vector.length;
        }
        
        if (metadata?.timestamp) {
          const date = new Date(metadata.timestamp);
          if (!oldestDate || date < oldestDate) {
            oldestDate = date;
          }
          if (!newestDate || date > newestDate) {
            newestDate = date;
          }
        }
      }
      
      return {
        totalVectors: vectorIds.length,
        averageDimension: vectorIds.length > 0 ? totalDimension / vectorIds.length : 0,
        oldestVector: oldestDate,
        newestVector: newestDate
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalVectors: 0,
        averageDimension: 0,
        oldestVector: null,
        newestVector: null
      };
    }
  }

  /**
   * Clear all vectors (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      const vectorIds = await this.redis.smembers('vector_index');
      
      const pipeline = this.redis.pipeline();
      
      vectorIds.forEach(id => {
        pipeline.del(`vector:${id}`);
        pipeline.del(`metadata:${id}`);
      });
      
      pipeline.del('vector_index');
      
      await pipeline.exec();
      
      console.log(`Cleared ${vectorIds.length} vectors`);
    } catch (error) {
      console.error('Failed to clear vectors:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      console.warn('Vector dimensions do not match');
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Failed to close Redis connection:', error);
    }
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}