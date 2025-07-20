// Redis Client Configuration and Management

import Redis from 'ioredis';

export interface CacheConfig {
  defaultTTL: number;
  keyPrefix: string;
  maxRetries: number;
  retryDelayOnFailover: number;
}

export class RedisClient {
  private client: Redis | null = null;
  private config: CacheConfig;
  private isConnected = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 3600, // 1 hour
      keyPrefix: 'resume_builder:',
      maxRetries: 3,
      retryDelayOnFailover: 100,
      ...config,
    };

    this.initialize();
  }

  private initialize(): void {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('Redis URL not provided, caching will be disabled');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: this.config.maxRetries,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.setupEventHandlers();
      this.connect();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('close', () => {
      console.log('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });
  }

  private async connect(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  public isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  // Basic cache operations
  public async get<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client!.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.config.defaultTTL;
      
      await this.client!.setex(this.getKey(key), expiry, serialized);
      return true;
    } catch (error) {
      console.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.del(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  // Hash operations for complex data
  public async hget<T = any>(key: string, field: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client!.hget(this.getKey(key), field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Failed to get hash field ${key}:${field}:`, error);
      return null;
    }
  }

  public async hset(key: string, field: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.client!.hset(this.getKey(key), field, serialized);
      
      if (ttl) {
        await this.client!.expire(this.getKey(key), ttl);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to set hash field ${key}:${field}:`, error);
      return false;
    }
  }

  public async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const hash = await this.client!.hgetall(this.getKey(key));
      if (!hash || Object.keys(hash).length === 0) return null;

      const parsed: Record<string, any> = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return parsed as T;
    } catch (error) {
      console.error(`Failed to get hash ${key}:`, error);
      return null;
    }
  }

  // List operations for queues and logs
  public async lpush(key: string, ...values: any[]): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const serialized = values.map(v => JSON.stringify(v));
      return await this.client!.lpush(this.getKey(key), ...serialized);
    } catch (error) {
      console.error(`Failed to lpush to ${key}:`, error);
      return 0;
    }
  }

  public async lrange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    if (!this.isAvailable()) return [];

    try {
      const values = await this.client!.lrange(this.getKey(key), start, stop);
      return values.map(v => {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      console.error(`Failed to lrange from ${key}:`, error);
      return [];
    }
  }

  // Set operations for unique collections
  public async sadd(key: string, ...members: any[]): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const serialized = members.map(m => JSON.stringify(m));
      return await this.client!.sadd(this.getKey(key), ...serialized);
    } catch (error) {
      console.error(`Failed to sadd to ${key}:`, error);
      return 0;
    }
  }

  public async smembers<T = any>(key: string): Promise<T[]> {
    if (!this.isAvailable()) return [];

    try {
      const members = await this.client!.smembers(this.getKey(key));
      return members.map(m => {
        try {
          return JSON.parse(m);
        } catch {
          return m;
        }
      });
    } catch (error) {
      console.error(`Failed to get smembers from ${key}:`, error);
      return [];
    }
  }

  // Expiration and TTL management
  public async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.expire(this.getKey(key), seconds);
      return result === 1;
    } catch (error) {
      console.error(`Failed to set expiration for ${key}:`, error);
      return false;
    }
  }

  public async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) return -1;

    try {
      return await this.client!.ttl(this.getKey(key));
    } catch (error) {
      console.error(`Failed to get TTL for ${key}:`, error);
      return -1;
    }
  }

  // Batch operations
  public async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isAvailable()) return keys.map(() => null);

    try {
      const prefixedKeys = keys.map(k => this.getKey(k));
      const values = await this.client!.mget(...prefixedKeys);
      
      return values.map(v => {
        if (!v) return null;
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      });
    } catch (error) {
      console.error('Failed to mget keys:', error);
      return keys.map(() => null);
    }
  }

  public async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const pipeline = this.client!.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        pipeline.set(this.getKey(key), serialized);
        
        if (ttl) {
          pipeline.expire(this.getKey(key), ttl);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Failed to mset keys:', error);
      return false;
    }
  }

  // Pattern-based operations
  public async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) return [];

    try {
      const keys = await this.client!.keys(this.getKey(pattern));
      return keys.map(k => k.replace(this.config.keyPrefix, ''));
    } catch (error) {
      console.error(`Failed to get keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  public async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const keys = await this.client!.keys(this.getKey(pattern));
      if (keys.length === 0) return 0;
      
      return await this.client!.del(...keys);
    } catch (error) {
      console.error(`Failed to delete keys with pattern ${pattern}:`, error);
      return 0;
    }
  }

  // Health check and stats
  public async ping(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  public async info(): Promise<Record<string, string> | null> {
    if (!this.isAvailable()) return null;

    try {
      const info = await this.client!.info();
      const parsed: Record<string, string> = {};
      
      info.split('\r\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          parsed[key] = value;
        }
      });
      
      return parsed;
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      return null;
    }
  }

  // Cleanup
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const redis = RedisClient.getInstance();

// Specialized cache managers
export class CacheManager {
  constructor(private redis: RedisClient) {}

  // AI Response caching
  async cacheAIResponse(requestHash: string, response: any, ttl = 3600): Promise<void> {
    await this.redis.set(`ai_response:${requestHash}`, response, ttl);
  }

  async getCachedAIResponse<T = any>(requestHash: string): Promise<T | null> {
    return this.redis.get<T>(`ai_response:${requestHash}`);
  }

  // User context caching
  async cacheUserContext(userId: string, context: any, ttl = 7200): Promise<void> {
    await this.redis.set(`user_context:${userId}`, context, ttl);
  }

  async getCachedUserContext<T = any>(userId: string): Promise<T | null> {
    return this.redis.get<T>(`user_context:${userId}`);
  }

  async invalidateUserContext(userId: string): Promise<void> {
    await this.redis.del(`user_context:${userId}`);
  }

  // Resume data caching
  async cacheResumeData(resumeId: string, data: any, ttl = 1800): Promise<void> {
    await this.redis.set(`resume_data:${resumeId}`, data, ttl);
  }

  async getCachedResumeData<T = any>(resumeId: string): Promise<T | null> {
    return this.redis.get<T>(`resume_data:${resumeId}`);
  }

  async invalidateResumeData(resumeId: string): Promise<void> {
    await this.redis.del(`resume_data:${resumeId}`);
  }

  // Template data caching
  async cacheTemplateData(templateId: string, data: any, ttl = 86400): Promise<void> {
    await this.redis.set(`template_data:${templateId}`, data, ttl);
  }

  async getCachedTemplateData<T = any>(templateId: string): Promise<T | null> {
    return this.redis.get<T>(`template_data:${templateId}`);
  }

  // Session-based caching
  async cacheSessionData(sessionId: string, data: any, ttl = 3600): Promise<void> {
    await this.redis.set(`session:${sessionId}`, data, ttl);
  }

  async getCachedSessionData<T = any>(sessionId: string): Promise<T | null> {
    return this.redis.get<T>(`session:${sessionId}`);
  }

  // Bulk operations
  async cacheBulkData(prefix: string, data: Record<string, any>, ttl?: number): Promise<void> {
    const keyValuePairs: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      keyValuePairs[`${prefix}:${key}`] = value;
    }
    
    await this.redis.mset(keyValuePairs, ttl);
  }

  async getBulkCachedData<T = any>(prefix: string, keys: string[]): Promise<Record<string, T | null>> {
    const prefixedKeys = keys.map(k => `${prefix}:${k}`);
    const values = await this.redis.mget<T>(prefixedKeys);
    
    const result: Record<string, T | null> = {};
    keys.forEach((key, index) => {
      result[key] = values[index];
    });
    
    return result;
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<number> {
    return this.redis.deletePattern(pattern);
  }

  async invalidateUserData(userId: string): Promise<void> {
    await Promise.all([
      this.redis.deletePattern(`user_context:${userId}*`),
      this.redis.deletePattern(`session:*:${userId}`),
      this.redis.deletePattern(`ai_response:*:${userId}*`),
    ]);
  }
}

export function getCacheManager(): CacheManager {
  return new CacheManager(redis);
}