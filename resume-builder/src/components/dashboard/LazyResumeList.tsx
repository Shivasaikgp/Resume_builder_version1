// Lazy loading resume list component with virtualization

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOptimizedInfiniteData } from '@/hooks/useOptimizedData';
import { useClientCache } from '@/lib/cache/client-cache';
import { ResumeCard } from './ResumeCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface LazyResumeListProps {
  userId: string;
  searchTerm?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enableVirtualization?: boolean;
  onResumeSelect?: (resumeId: string) => void;
  onResumeDelete?: (resumeId: string) => void;
  onResumeDuplicate?: (resumeId: string) => void;
}

export interface ResumeListItem {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  data: any;
  analyses?: Array<{
    id: string;
    score: number;
    createdAt: string;
  }>;
  _count?: {
    analyses: number;
  };
}

// Virtual list item component
const VirtualResumeItem: React.FC<{
  resume: ResumeListItem;
  index: number;
  style: React.CSSProperties;
  onSelect?: (resumeId: string) => void;
  onDelete?: (resumeId: string) => void;
  onDuplicate?: (resumeId: string) => void;
}> = ({ resume, index, style, onSelect, onDelete, onDuplicate }) => {
  return (
    <div style={style} className="px-4 py-2">
      <ResumeCard
        resume={resume}
        onSelect={() => onSelect?.(resume.id)}
        onDelete={() => onDelete?.(resume.id)}
        onDuplicate={() => onDuplicate?.(resume.id)}
      />
    </div>
  );
};

// Loading skeleton component
const ResumeListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Error component
const ResumeListError: React.FC<{
  error: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Failed to load resumes</h3>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </Card>
  );
};

// Intersection Observer hook for infinite scroll
const useIntersectionObserver = (
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [callback, options]);

  return targetRef;
};

export const LazyResumeList: React.FC<LazyResumeListProps> = ({
  userId,
  searchTerm = '',
  sortBy = 'updatedAt',
  sortOrder = 'desc',
  pageSize = 20,
  enableVirtualization = false,
  onResumeSelect,
  onResumeDelete,
  onResumeDuplicate,
}) => {
  const { invalidateUser } = useClientCache();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoized fetcher function
  const fetcher = useCallback(
    async (page: number, size: number) => {
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        pageSize: size.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/resumes/paginated?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch resumes: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        data: result.data || [],
        hasMore: result.pagination?.hasNext || false,
      };
    },
    [userId, searchTerm, sortBy, sortOrder]
  );

  // Use infinite data hook
  const {
    data: resumes,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useOptimizedInfiniteData(fetcher, pageSize, {
    enableCache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  });

  // Intersection observer for infinite scroll
  const loadMoreRef = useIntersectionObserver(
    useCallback(() => {
      if (!loading && hasMore) {
        loadMore();
      }
    }, [loading, hasMore, loadMore]),
    { threshold: 0.1 }
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    invalidateUser(userId);
    await refresh();
    setIsRefreshing(false);
  }, [refresh, invalidateUser, userId]);

  // Handle resume actions
  const handleResumeDelete = useCallback(
    async (resumeId: string) => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete resume');
        }

        // Refresh the list
        await handleRefresh();
        onResumeDelete?.(resumeId);
      } catch (error) {
        console.error('Error deleting resume:', error);
        // You might want to show a toast notification here
      }
    },
    [handleRefresh, onResumeDelete]
  );

  const handleResumeDuplicate = useCallback(
    async (resumeId: string) => {
      try {
        const response = await fetch(`/api/resumes/${resumeId}/duplicate`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to duplicate resume');
        }

        // Refresh the list
        await handleRefresh();
        onResumeDuplicate?.(resumeId);
      } catch (error) {
        console.error('Error duplicating resume:', error);
        // You might want to show a toast notification here
      }
    },
    [handleRefresh, onResumeDuplicate]
  );

  // Memoized resume list
  const resumeList = useMemo(() => {
    if (enableVirtualization && resumes.length > 50) {
      // For large lists, you might want to implement react-window or react-virtualized
      // For now, we'll use a simple approach
      return resumes.map((resume, index) => (
        <VirtualResumeItem
          key={resume.id}
          resume={resume}
          index={index}
          style={{ height: 'auto' }}
          onSelect={onResumeSelect}
          onDelete={handleResumeDelete}
          onDuplicate={handleResumeDuplicate}
        />
      ));
    }

    return resumes.map((resume) => (
      <ResumeCard
        key={resume.id}
        resume={resume}
        onSelect={() => onResumeSelect?.(resume.id)}
        onDelete={() => handleResumeDelete(resume.id)}
        onDuplicate={() => handleResumeDuplicate(resume.id)}
      />
    ));
  }, [
    resumes,
    enableVirtualization,
    onResumeSelect,
    handleResumeDelete,
    handleResumeDuplicate,
  ]);

  // Show error state
  if (error && resumes.length === 0) {
    return <ResumeListError error={error} onRetry={handleRefresh} />;
  }

  // Show loading state for initial load
  if (loading && resumes.length === 0) {
    return <ResumeListSkeleton count={pageSize} />;
  }

  // Show empty state
  if (!loading && resumes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          📄
        </div>
        <h3 className="text-lg font-semibold mb-2">No resumes found</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm
            ? `No resumes match "${searchTerm}"`
            : 'Create your first resume to get started'}
        </p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {resumes.length} resume{resumes.length !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Resume list */}
      <div className="space-y-4">
        {resumeList}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4">
          {loading ? (
            <div className="space-y-4">
              <ResumeListSkeleton count={3} />
            </div>
          ) : (
            <div className="text-center">
              <Button onClick={loadMore} variant="outline">
                Load More Resumes
              </Button>
            </div>
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && resumes.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          <p>You've reached the end of your resumes</p>
        </div>
      )}

      {/* Error indicator for failed load more */}
      {error && resumes.length > 0 && (
        <Card className="p-4 text-center border-red-200">
          <p className="text-red-600 mb-2">Failed to load more resumes</p>
          <Button onClick={loadMore} variant="outline" size="sm">
            Try Again
          </Button>
        </Card>
      )}
    </div>
  );
};

export default LazyResumeList;