// Paginated resumes API endpoint with caching and optimization

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbOptimizer } from '@/lib/database';
import { getCacheManager } from '@/lib/cache/redis-client';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100); // Max 100 items
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const searchTerm = searchParams.get('search') || '';

    // Validate user access
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Validate parameters
    if (page < 1 || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    if (!['updatedAt', 'createdAt', 'title'].includes(sortBy)) {
      return NextResponse.json(
        { error: 'Invalid sort field' },
        { status: 400 }
      );
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      return NextResponse.json(
        { error: 'Invalid sort order' },
        { status: 400 }
      );
    }

    const cacheManager = getCacheManager();
    const cacheKey = `paginated_resumes:${userId}:${page}:${pageSize}:${sortBy}:${sortOrder}:${searchTerm}`;

    // Check cache first
    const cached = await cacheManager.getCachedSessionData(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Build pagination options
    const paginationOptions = {
      page,
      pageSize,
      orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
    };

    let result;

    if (searchTerm) {
      // Use search functionality
      const searchResults = await dbOptimizer.searchResumes(
        userId,
        searchTerm,
        {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          orderBy: paginationOptions.orderBy,
          useCache: false, // Don't double-cache
        }
      );

      // For search, we need to manually calculate pagination
      const totalSearchResults = searchResults.length;
      const hasMore = totalSearchResults === pageSize; // Approximate

      result = {
        data: searchResults,
        pagination: {
          page,
          pageSize,
          total: totalSearchResults, // This is approximate for search
          totalPages: Math.ceil(totalSearchResults / pageSize),
          hasNext: hasMore,
          hasPrev: page > 1,
        },
      };
    } else {
      // Use optimized pagination
      result = await dbOptimizer.getUserResumesPaginated(userId, paginationOptions);
    }

    // Cache the result
    await cacheManager.cacheSessionData(cacheKey, result, 300); // 5 minutes cache

    return NextResponse.json({
      ...result,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching paginated resumes:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Optional: Add support for POST to prefetch/warm cache
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, userId, pages } = body;

    if (action === 'warmup' && userId === session.user.id) {
      // Warm up cache for multiple pages
      const cacheManager = getCacheManager();
      const warmupPromises = [];

      for (const pageConfig of pages || [{ page: 1, pageSize: 20 }]) {
        const { page, pageSize, sortBy = 'updatedAt', sortOrder = 'desc' } = pageConfig;
        
        const paginationOptions = {
          page,
          pageSize,
          orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        };

        warmupPromises.push(
          dbOptimizer.getUserResumesPaginated(userId, paginationOptions)
            .then(result => {
              const cacheKey = `paginated_resumes:${userId}:${page}:${pageSize}:${sortBy}:${sortOrder}:`;
              return cacheManager.cacheSessionData(cacheKey, result, 300);
            })
        );
      }

      await Promise.all(warmupPromises);

      return NextResponse.json({
        success: true,
        message: 'Cache warmed up successfully',
        pages: pages?.length || 1,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in cache warmup:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}