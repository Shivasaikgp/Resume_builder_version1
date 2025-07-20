// Database Query Optimization and Performance Utilities

import { PrismaClient } from '@prisma/client';
import { getCacheManager } from '../cache/redis-client';

export interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  includeRelations?: boolean;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class DatabaseQueryOptimizer {
  private cacheManager = getCacheManager();

  constructor(private prisma: PrismaClient) {}

  // Optimized user queries
  async getUserWithResumes(userId: string, options: QueryOptions = {}): Promise<any> {
    const cacheKey = `user_with_resumes:${userId}`;
    
    if (options.useCache !== false) {
      const cached = await this.cacheManager.getCachedUserContext(userId);
      if (cached) return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        resumes: {
          orderBy: options.orderBy || { updatedAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
          include: options.includeRelations ? {
            analyses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          } : false,
        },
        userContext: true,
        _count: {
          select: {
            resumes: true,
            aiFeedback: true,
          },
        },
      },
    });

    if (user && options.useCache !== false) {
      await this.cacheManager.cacheUserContext(
        userId, 
        user, 
        options.cacheTTL || 1800
      );
    }

    return user;
  }

  // Optimized resume queries with selective loading
  async getResumeWithAnalysis(resumeId: string, options: QueryOptions = {}): Promise<any> {
    const cacheKey = `resume_with_analysis:${resumeId}`;
    
    if (options.useCache !== false) {
      const cached = await this.cacheManager.getCachedResumeData(resumeId);
      if (cached) return cached;
    }

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: options.limit || 5,
        },
        _count: {
          select: {
            analyses: true,
          },
        },
      },
    });

    if (resume && options.useCache !== false) {
      await this.cacheManager.cacheResumeData(
        resumeId, 
        resume, 
        options.cacheTTL || 1800
      );
    }

    return resume;
  }

  // Paginated resume queries
  async getUserResumesPaginated(
    userId: string, 
    pagination: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    const { page, pageSize, orderBy } = pagination;
    const skip = (page - 1) * pageSize;

    // Use transaction for consistent counts
    const [resumes, total] = await this.prisma.$transaction([
      this.prisma.resume.findMany({
        where: { userId },
        orderBy: orderBy || { updatedAt: 'desc' },
        take: pageSize,
        skip,
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              analyses: true,
            },
          },
        },
      }),
      this.prisma.resume.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: resumes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Bulk operations with optimization
  async bulkUpdateResumes(
    updates: Array<{ id: string; data: any; templateConfig?: any }>
  ): Promise<void> {
    // Use transaction for consistency
    await this.prisma.$transaction(
      updates.map(update =>
        this.prisma.resume.update({
          where: { id: update.id },
          data: {
            data: update.data,
            templateConfig: update.templateConfig,
            updatedAt: new Date(),
          },
        })
      )
    );

    // Invalidate cache for updated resumes
    await Promise.all(
      updates.map(update => 
        this.cacheManager.invalidateResumeData(update.id)
      )
    );
  }

  // Optimized search queries
  async searchResumes(
    userId: string,
    searchTerm: string,
    options: QueryOptions = {}
  ): Promise<any[]> {
    const cacheKey = `search_resumes:${userId}:${searchTerm}`;
    
    if (options.useCache !== false) {
      const cached = await this.cacheManager.getCachedSessionData(cacheKey);
      if (cached) return cached;
    }

    // Use full-text search on title and JSON data
    const resumes = await this.prisma.resume.findMany({
      where: {
        userId,
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            data: {
              string_contains: searchTerm,
            },
          },
        ],
      },
      orderBy: options.orderBy || { updatedAt: 'desc' },
      take: options.limit || 20,
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (options.useCache !== false) {
      await this.cacheManager.cacheSessionData(
        cacheKey, 
        resumes, 
        options.cacheTTL || 600
      );
    }

    return resumes;
  }

  // Analytics and aggregation queries
  async getUserAnalytics(userId: string): Promise<any> {
    const cacheKey = `user_analytics:${userId}`;
    
    const cached = await this.cacheManager.getCachedSessionData(cacheKey);
    if (cached) return cached;

    const [resumeStats, analysisStats, feedbackStats] = await this.prisma.$transaction([
      // Resume statistics
      this.prisma.resume.groupBy({
        by: ['userId'],
        where: { userId },
        _count: {
          id: true,
        },
        _min: {
          createdAt: true,
        },
        _max: {
          updatedAt: true,
        },
      }),
      
      // Analysis statistics
      this.prisma.resumeAnalysis.groupBy({
        by: ['resumeId'],
        where: {
          resume: {
            userId,
          },
        },
        _avg: {
          score: true,
        },
        _count: {
          id: true,
        },
        _max: {
          score: true,
        },
      }),
      
      // Feedback statistics
      this.prisma.aIFeedback.groupBy({
        by: ['type'],
        where: { userId },
        _avg: {
          rating: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const analytics = {
      resumeCount: resumeStats[0]?._count.id || 0,
      firstResumeDate: resumeStats[0]?._min.createdAt,
      lastUpdateDate: resumeStats[0]?._max.updatedAt,
      averageScore: analysisStats[0]?._avg.score || 0,
      totalAnalyses: analysisStats.reduce((sum, stat) => sum + stat._count.id, 0),
      highestScore: analysisStats[0]?._max.score || 0,
      feedbackByType: feedbackStats.reduce((acc, stat) => {
        acc[stat.type] = {
          count: stat._count.id,
          averageRating: stat._avg.rating,
        };
        return acc;
      }, {} as Record<string, any>),
    };

    await this.cacheManager.cacheSessionData(cacheKey, analytics, 3600);
    return analytics;
  }

  // Cleanup operations
  async cleanupOldAnalyses(resumeId: string, keepCount = 5): Promise<void> {
    // Get analyses to delete
    const analysesToDelete = await this.prisma.resumeAnalysis.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      skip: keepCount,
      select: { id: true },
    });

    if (analysesToDelete.length > 0) {
      await this.prisma.resumeAnalysis.deleteMany({
        where: {
          id: {
            in: analysesToDelete.map(a => a.id),
          },
        },
      });
    }

    // Invalidate cache
    await this.cacheManager.invalidateResumeData(resumeId);
  }

  async cleanupOldErrorLogs(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.errorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        resolved: true,
      },
    });

    return result.count;
  }

  // Connection and performance monitoring
  async getConnectionInfo(): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      
      return result;
    } catch (error) {
      console.error('Failed to get connection info:', error);
      return null;
    }
  }

  async getSlowQueries(limit = 10): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT ${limit}
      `;
      
      return result;
    } catch (error) {
      console.error('Failed to get slow queries (pg_stat_statements not available):', error);
      return [];
    }
  }

  // Cache invalidation helpers
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.invalidateUserContext(userId),
      this.cacheManager.invalidatePattern(`user_analytics:${userId}`),
      this.cacheManager.invalidatePattern(`search_resumes:${userId}:*`),
    ]);
  }

  async invalidateResumeCache(resumeId: string): Promise<void> {
    await this.cacheManager.invalidateResumeData(resumeId);
  }

  // Batch cache operations
  async warmupUserCache(userId: string): Promise<void> {
    // Pre-load frequently accessed data
    await Promise.all([
      this.getUserWithResumes(userId, { useCache: false }),
      this.getUserAnalytics(userId),
    ]);
  }

  async warmupResumeCache(resumeIds: string[]): Promise<void> {
    await Promise.all(
      resumeIds.map(id => 
        this.getResumeWithAnalysis(id, { useCache: false })
      )
    );
  }
}

// Singleton instance
let optimizerInstance: DatabaseQueryOptimizer | null = null;

export function getDatabaseOptimizer(prisma: PrismaClient): DatabaseQueryOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new DatabaseQueryOptimizer(prisma);
  }
  return optimizerInstance;
}