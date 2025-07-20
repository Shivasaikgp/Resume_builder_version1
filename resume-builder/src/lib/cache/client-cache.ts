// Client-side caching for template and resume data

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
}

export class ClientCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // If cache is still too large, remove oldest items
    if (this.cache.size > this.config.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const itemsToRemove = sortedEntries.slice(0, this.cache.size - this.config.maxSize);
      itemsToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  public set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key,
    };

    this.cache.set(key, item);

    // Immediate cleanup if over size limit
    if (this.cache.size > this.config.maxSize) {
      this.cleanup();
    }
  }

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  public has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    // Simple memory estimation
    const memoryUsage = Array.from(this.cache.values())
      .reduce((total, item) => {
        return total + JSON.stringify(item.data).length * 2; // Rough estimate
      }, 0);

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need hit/miss tracking for accurate rate
      memoryUsage,
    };
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Specialized cache managers for different data types
export class ResumeDataCache extends ClientCache {
  constructor() {
    super({
      maxSize: 50,
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      cleanupInterval: 2 * 60 * 1000, // 2 minutes
    });
  }

  public cacheResume(resumeId: string, resumeData: any): void {
    this.set(`resume:${resumeId}`, resumeData);
  }

  public getResume(resumeId: string): any | null {
    return this.get(`resume:${resumeId}`);
  }

  public cacheResumeList(userId: string, resumes: any[]): void {
    this.set(`resumes:${userId}`, resumes, 5 * 60 * 1000); // 5 minutes
  }

  public getResumeList(userId: string): any[] | null {
    return this.get(`resumes:${userId}`);
  }

  public invalidateResume(resumeId: string): void {
    this.delete(`resume:${resumeId}`);
  }

  public invalidateUserResumes(userId: string): void {
    this.delete(`resumes:${userId}`);
    
    // Also invalidate individual resumes for this user
    const keys = this.keys().filter(key => 
      key.startsWith('resume:') && 
      this.get(key)?.userId === userId
    );
    
    keys.forEach(key => this.delete(key));
  }
}

export class TemplateDataCache extends ClientCache {
  constructor() {
    super({
      maxSize: 20,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
    });
  }

  public cacheTemplate(templateId: string, templateData: any): void {
    this.set(`template:${templateId}`, templateData);
  }

  public getTemplate(templateId: string): any | null {
    return this.get(`template:${templateId}`);
  }

  public cacheTemplateConfig(configId: string, config: any): void {
    this.set(`template_config:${configId}`, config);
  }

  public getTemplateConfig(configId: string): any | null {
    return this.get(`template_config:${configId}`);
  }

  public cacheAdaptationRules(templateId: string, rules: any[]): void {
    this.set(`adaptation_rules:${templateId}`, rules);
  }

  public getAdaptationRules(templateId: string): any[] | null {
    return this.get(`adaptation_rules:${templateId}`);
  }
}

export class AIResponseCache extends ClientCache {
  constructor() {
    super({
      maxSize: 200,
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      cleanupInterval: 3 * 60 * 1000, // 3 minutes
    });
  }

  public cacheAIResponse(requestHash: string, response: any): void {
    this.set(`ai_response:${requestHash}`, response);
  }

  public getAIResponse(requestHash: string): any | null {
    return this.get(`ai_response:${requestHash}`);
  }

  public cacheSuggestions(contextHash: string, suggestions: any[]): void {
    this.set(`suggestions:${contextHash}`, suggestions, 10 * 60 * 1000); // 10 minutes
  }

  public getSuggestions(contextHash: string): any[] | null {
    return this.get(`suggestions:${contextHash}`);
  }

  public cacheAnalysis(resumeHash: string, analysis: any): void {
    this.set(`analysis:${resumeHash}`, analysis, 20 * 60 * 1000); // 20 minutes
  }

  public getAnalysis(resumeHash: string): any | null {
    return this.get(`analysis:${resumeHash}`);
  }
}

export class UserContextCache extends ClientCache {
  constructor() {
    super({
      maxSize: 30,
      defaultTTL: 20 * 60 * 1000, // 20 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
    });
  }

  public cacheUserContext(userId: string, context: any): void {
    this.set(`user_context:${userId}`, context);
  }

  public getUserContext(userId: string): any | null {
    return this.get(`user_context:${userId}`);
  }

  public cacheUserPreferences(userId: string, preferences: any): void {
    this.set(`user_preferences:${userId}`, preferences, 60 * 60 * 1000); // 1 hour
  }

  public getUserPreferences(userId: string): any | null {
    return this.get(`user_preferences:${userId}`);
  }

  public invalidateUserData(userId: string): void {
    this.delete(`user_context:${userId}`);
    this.delete(`user_preferences:${userId}`);
  }
}

// Cache manager that coordinates all cache types
export class ClientCacheManager {
  public readonly resume: ResumeDataCache;
  public readonly template: TemplateDataCache;
  public readonly ai: AIResponseCache;
  public readonly userContext: UserContextCache;

  constructor() {
    this.resume = new ResumeDataCache();
    this.template = new TemplateDataCache();
    this.ai = new AIResponseCache();
    this.userContext = new UserContextCache();
  }

  public getOverallStats(): {
    totalSize: number;
    totalMemoryUsage: number;
    cacheStats: Record<string, any>;
  } {
    const resumeStats = this.resume.getStats();
    const templateStats = this.template.getStats();
    const aiStats = this.ai.getStats();
    const userContextStats = this.userContext.getStats();

    return {
      totalSize: resumeStats.size + templateStats.size + aiStats.size + userContextStats.size,
      totalMemoryUsage: resumeStats.memoryUsage + templateStats.memoryUsage + 
                       aiStats.memoryUsage + userContextStats.memoryUsage,
      cacheStats: {
        resume: resumeStats,
        template: templateStats,
        ai: aiStats,
        userContext: userContextStats,
      },
    };
  }

  public clearAll(): void {
    this.resume.clear();
    this.template.clear();
    this.ai.clear();
    this.userContext.clear();
  }

  public destroy(): void {
    this.resume.destroy();
    this.template.destroy();
    this.ai.destroy();
    this.userContext.destroy();
  }

  // Utility methods for common operations
  public invalidateUserData(userId: string): void {
    this.resume.invalidateUserResumes(userId);
    this.userContext.invalidateUserData(userId);
  }

  public invalidateResumeData(resumeId: string): void {
    this.resume.invalidateResume(resumeId);
    // Also clear related AI responses that might be cached
    const aiKeys = this.ai.keys().filter(key => key.includes(resumeId));
    aiKeys.forEach(key => this.ai.delete(key));
  }

  public warmupCache(data: {
    userId?: string;
    resumes?: any[];
    templates?: any[];
    userContext?: any;
  }): void {
    if (data.userId && data.resumes) {
      this.resume.cacheResumeList(data.userId, data.resumes);
      data.resumes.forEach(resume => {
        this.resume.cacheResume(resume.id, resume);
      });
    }

    if (data.templates) {
      data.templates.forEach(template => {
        this.template.cacheTemplate(template.id, template);
      });
    }

    if (data.userId && data.userContext) {
      this.userContext.cacheUserContext(data.userId, data.userContext);
    }
  }
}

// Singleton instance
let cacheManagerInstance: ClientCacheManager | null = null;

export function getClientCacheManager(): ClientCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new ClientCacheManager();
  }
  return cacheManagerInstance;
}

// Utility functions for cache key generation
export function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export function hashObject(obj: any): string {
  // Simple hash function for objects
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// React hook for using client cache
export function useClientCache() {
  const cacheManager = getClientCacheManager();

  return {
    cacheManager,
    
    // Resume operations
    cacheResume: (resumeId: string, data: any) => 
      cacheManager.resume.cacheResume(resumeId, data),
    
    getResume: (resumeId: string) => 
      cacheManager.resume.getResume(resumeId),
    
    // Template operations
    cacheTemplate: (templateId: string, data: any) => 
      cacheManager.template.cacheTemplate(templateId, data),
    
    getTemplate: (templateId: string) => 
      cacheManager.template.getTemplate(templateId),
    
    // AI operations
    cacheAIResponse: (hash: string, response: any) => 
      cacheManager.ai.cacheAIResponse(hash, response),
    
    getAIResponse: (hash: string) => 
      cacheManager.ai.getAIResponse(hash),
    
    // User context operations
    cacheUserContext: (userId: string, context: any) => 
      cacheManager.userContext.cacheUserContext(userId, context),
    
    getUserContext: (userId: string) => 
      cacheManager.userContext.getUserContext(userId),
    
    // Utility operations
    invalidateUser: (userId: string) => 
      cacheManager.invalidateUserData(userId),
    
    invalidateResume: (resumeId: string) => 
      cacheManager.invalidateResumeData(resumeId),
    
    getStats: () => cacheManager.getOverallStats(),
    
    clearAll: () => cacheManager.clearAll(),
  };
}