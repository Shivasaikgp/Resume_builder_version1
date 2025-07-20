import React from 'react';
import { cn } from '@/lib/utils';

// Spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Loading overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  message = 'Loading...', 
  children, 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-2">
            <Spinner size="lg" />
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Progress bar
interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  className?: string;
}

export function ProgressBar({ progress, message, className }: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      {message && (
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{message}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

// Skeleton loader
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-gray-200 rounded',
            i === 0 ? 'h-4' : 'h-3 mt-2',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// AI Processing indicator
interface AIProcessingProps {
  stage: 'analyzing' | 'generating' | 'optimizing' | 'finalizing';
  progress?: number;
  className?: string;
}

export function AIProcessing({ stage, progress, className }: AIProcessingProps) {
  const stageMessages = {
    analyzing: 'Analyzing your resume...',
    generating: 'Generating suggestions...',
    optimizing: 'Optimizing content...',
    finalizing: 'Finalizing results...',
  };

  const stageIcons = {
    analyzing: '🔍',
    generating: '✨',
    optimizing: '⚡',
    finalizing: '✅',
  };

  return (
    <div className={cn('flex items-center space-x-3 p-4 bg-blue-50 rounded-lg', className)}>
      <div className="flex-shrink-0">
        <div className="relative">
          <Spinner size="md" />
          <div className="absolute inset-0 flex items-center justify-center text-xs">
            {stageIcons[stage]}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">
          {stageMessages[stage]}
        </p>
        {progress !== undefined && (
          <div className="mt-2">
            <ProgressBar progress={progress} className="max-w-xs" />
          </div>
        )}
      </div>
    </div>
  );
}

// Typing indicator for real-time suggestions
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-gray-500 ml-2">AI is thinking...</span>
    </div>
  );
}