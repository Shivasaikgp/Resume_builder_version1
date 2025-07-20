// Optimized data fetching hooks with caching

import { useState, useEffect, useCallback, useRef } from 'react';
import { useClientCache, hashObject } from '@/lib/cache/client-cache';

export interface UseOptimizedDataOptions {
  cacheKey?: string;
  cacheTTL?: number;
  enableCache?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface UseOptimizedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
  isStale: boolean;
  lastFetched: Date | null;
}

export function useOptimizedData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: UseOptimizedDataOptions = {}
): UseOptimizedDataResult<T> {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    enableCache = true,
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    staleTime = 30 * 1000, // 30 seconds
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const { cacheManager } = useClientCache();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cache key if not provided
  const effectiveCacheKey = cacheKey || `optimized_data:${hashObject({ fetcher: fetcher.toString(), dependencies })}`;

  // Check if data is stale
  const checkStale = useCallback(() => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched.getTime() > staleTime;
  }, [lastFetched, staleTime]);

  // Fetch data with retry logic
  const fetchData = useCallback(async (attempt = 1): Promise<void> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      if (enableCache) {
        const cachedData = cacheManager.resume.get(effectiveCacheKey) as T;
        if (cachedData) {
          setData(cachedData);
          setLastFetched(new Date());
          setIsStale(false);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const result = await fetcher();
      
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setData(result);
      setLastFetched(new Date());
      setIsStale(false);
      setError(null);

      // Cache the result
      if (enableCache) {
        cacheManager.resume.set(effectiveCacheKey, result, cacheTTL);
      }

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      
      if (attempt < retryCount) {
        console.warn(`Fetch attempt ${attempt} failed, retrying...`, error);
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(attempt + 1);
        }, retryDelay * attempt);
      } else {
        setError(error);
        console.error('All fetch attempts failed:', error);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetcher, effectiveCacheKey, enableCache, cacheManager, cacheTTL, retryCount, retryDelay]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (enableCache) {
      cacheManager.resume.delete(effectiveCacheKey);
    }
    await fetchData();
  }, [fetchData, enableCache, cacheManager, effectiveCacheKey]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    if (enableCache) {
      cacheManager.resume.delete(effectiveCacheKey);
    }
    setIsStale(true);
  }, [enableCache, cacheManager, effectiveCacheKey]);

  // Effect for initial fetch and dependency changes
  useEffect(() => {
    if (refetchOnMount || dependencies.length > 0) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, dependencies);

  // Effect for window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (checkStale()) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, fetchData, checkStale]);

  // Effect for stale checking
  useEffect(() => {
    const interval = setInterval(() => {
      setIsStale(checkStale());
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [checkStale]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale,
    lastFetched,
  };
}

// Specialized hooks for different data types
export function useOptimizedResume(resumeId: string, options: UseOptimizedDataOptions = {}) {
  return useOptimizedData(
    async () => {
      const response = await fetch(`/api/resumes/${resumeId}`);
      if (!response.ok) throw new Error('Failed to fetch resume');
      return response.json();
    },
    [resumeId],
    {
      cacheKey: `resume:${resumeId}`,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      ...options,
    }
  );
}

export function useOptimizedResumeList(userId: string, options: UseOptimizedDataOptions = {}) {
  return useOptimizedData(
    async () => {
      const response = await fetch(`/api/resumes?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch resumes');
      return response.json();
    },
    [userId],
    {
      cacheKey: `resumes:${userId}`,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      ...options,
    }
  );
}

export function useOptimizedTemplate(templateId: string, options: UseOptimizedDataOptions = {}) {
  return useOptimizedData(
    async () => {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    [templateId],
    {
      cacheKey: `template:${templateId}`,
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      ...options,
    }
  );
}

export function useOptimizedUserContext(userId: string, options: UseOptimizedDataOptions = {}) {
  return useOptimizedData(
    async () => {
      const response = await fetch(`/api/ai/context?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user context');
      return response.json();
    },
    [userId],
    {
      cacheKey: `user_context:${userId}`,
      cacheTTL: 20 * 60 * 1000, // 20 minutes
      ...options,
    }
  );
}

// Hook for optimized AI responses with request deduplication
export function useOptimizedAIResponse(
  prompt: string,
  context: any,
  options: UseOptimizedDataOptions = {}
) {
  const requestHash = hashObject({ prompt, context });
  
  return useOptimizedData(
    async () => {
      const response = await fetch('/api/ai/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });
      if (!response.ok) throw new Error('Failed to generate AI response');
      return response.json();
    },
    [requestHash],
    {
      cacheKey: `ai_response:${requestHash}`,
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      ...options,
    }
  );
}

// Hook for batch data loading with cache warming
export function useBatchOptimizedData<T>(
  items: Array<{ key: string; fetcher: () => Promise<T> }>,
  options: UseOptimizedDataOptions = {}
) {
  const [results, setResults] = useState<Record<string, T>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, Error>>({});
  
  const { cacheManager } = useClientCache();

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    const newResults: Record<string, T> = {};
    const newErrors: Record<string, Error> = {};

    await Promise.allSettled(
      items.map(async ({ key, fetcher }) => {
        try {
          // Check cache first
          if (options.enableCache !== false) {
            const cached = cacheManager.resume.get(key) as T;
            if (cached) {
              newResults[key] = cached;
              return;
            }
          }

          // Fetch fresh data
          const result = await fetcher();
          newResults[key] = result;

          // Cache result
          if (options.enableCache !== false) {
            cacheManager.resume.set(key, result, options.cacheTTL);
          }
        } catch (error) {
          newErrors[key] = error instanceof Error ? error : new Error('Unknown error');
        }
      })
    );

    setResults(newResults);
    setErrors(newErrors);
    setLoading(false);
  }, [items, options, cacheManager]);

  useEffect(() => {
    if (items.length > 0) {
      fetchBatch();
    }
  }, [fetchBatch]);

  return {
    results,
    loading,
    errors,
    refetch: fetchBatch,
  };
}

// Hook for infinite scroll with caching
export function useOptimizedInfiniteData<T>(
  baseFetcher: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
  pageSize = 20,
  options: UseOptimizedDataOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<Error | null>(null);

  const { cacheManager } = useClientCache();

  const fetchPage = useCallback(async (pageNum: number, append = true) => {
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `infinite_data:${hashObject({ baseFetcher: baseFetcher.toString(), pageNum, pageSize })}`;
      
      // Check cache first
      let result;
      if (options.enableCache !== false) {
        result = cacheManager.resume.get(cacheKey);
      }

      if (!result) {
        result = await baseFetcher(pageNum, pageSize);
        
        // Cache result
        if (options.enableCache !== false) {
          cacheManager.resume.set(cacheKey, result, options.cacheTTL || 5 * 60 * 1000);
        }
      }

      if (append) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [baseFetcher, pageSize, options, cacheManager]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, true);
    }
  }, [loading, hasMore, page, fetchPage]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(1, false);
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}