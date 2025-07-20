// React hook for content generation functionality
import { useState, useCallback } from 'react';
import { 
  ContentSuggestion, 
  UserContext, 
  ExperienceItem 
} from '../types';

interface UseContentGenerationOptions {
  maxSuggestions?: number;
  includeReasoning?: boolean;
  contextWeight?: number;
}

interface JobSpecificContext {
  jobTitle: string;
  company: string;
  industry?: string;
  jobDescription?: string;
}

interface ContentEnhancementRequest {
  content: string;
  section: 'experience' | 'skills' | 'summary' | 'achievements';
  context: UserContext;
  targetJob?: JobSpecificContext;
}

interface UseContentGenerationReturn {
  // State
  isLoading: boolean;
  error: string | null;
  suggestions: ContentSuggestion[];
  
  // Actions
  generateSuggestions: (
    context: UserContext,
    section: string,
    currentContent?: string,
    options?: UseContentGenerationOptions
  ) => Promise<ContentSuggestion[]>;
  
  enhanceContent: (request: ContentEnhancementRequest) => Promise<string>;
  
  generateBulletPoints: (
    jobTitle: string,
    company: string,
    experienceLevel?: string,
    industry?: string
  ) => Promise<string[]>;
  
  getActionVerbs: (
    currentText: string,
    context: UserContext,
    maxSuggestions?: number
  ) => Promise<ContentSuggestion[]>;
  
  generateAchievements: (
    experienceItem: ExperienceItem,
    context: UserContext
  ) => Promise<ContentSuggestion[]>;
  
  clearError: () => void;
  clearSuggestions: () => void;
}

export function useContentGeneration(): UseContentGenerationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    errorMessage: string
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage;
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateSuggestions = useCallback(async (
    context: UserContext,
    section: string,
    currentContent?: string,
    options: UseContentGenerationOptions = {}
  ): Promise<ContentSuggestion[]> => {
    return handleApiCall(async () => {
      const response = await fetch('/api/ai/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          section,
          currentContent,
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      return data.suggestions;
    }, 'Failed to generate content suggestions');
  }, [handleApiCall]);

  const enhanceContent = useCallback(async (
    request: ContentEnhancementRequest
  ): Promise<string> => {
    return handleApiCall(async () => {
      const response = await fetch('/api/ai/content/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enhance content');
      }

      const data = await response.json();
      return data.enhancedContent;
    }, 'Failed to enhance content');
  }, [handleApiCall]);

  const generateBulletPoints = useCallback(async (
    jobTitle: string,
    company: string,
    experienceLevel?: string,
    industry?: string
  ): Promise<string[]> => {
    return handleApiCall(async () => {
      const response = await fetch('/api/ai/content/bullet-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle,
          company,
          experienceLevel,
          industry
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate bullet points');
      }

      const data = await response.json();
      return data.bulletPoints;
    }, 'Failed to generate bullet points');
  }, [handleApiCall]);

  const getActionVerbs = useCallback(async (
    currentText: string,
    context: UserContext,
    maxSuggestions: number = 8
  ): Promise<ContentSuggestion[]> => {
    return handleApiCall(async () => {
      const response = await fetch('/api/ai/content/action-verbs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentText,
          context,
          maxSuggestions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get action verb suggestions');
      }

      const data = await response.json();
      return data.suggestions;
    }, 'Failed to get action verb suggestions');
  }, [handleApiCall]);

  const generateAchievements = useCallback(async (
    experienceItem: ExperienceItem,
    context: UserContext
  ): Promise<ContentSuggestion[]> => {
    return handleApiCall(async () => {
      const response = await fetch('/api/ai/content/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experienceItem,
          context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate achievement suggestions');
      }

      const data = await response.json();
      return data.suggestions;
    }, 'Failed to generate achievement suggestions');
  }, [handleApiCall]);

  return {
    // State
    isLoading,
    error,
    suggestions,
    
    // Actions
    generateSuggestions,
    enhanceContent,
    generateBulletPoints,
    getActionVerbs,
    generateAchievements,
    clearError,
    clearSuggestions,
  };
}