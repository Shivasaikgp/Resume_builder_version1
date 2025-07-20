// React Hook for Context Agent Integration
// Provides easy access to context management functionality in React components

import { useState, useEffect, useCallback } from 'react';
import { 
  UserContext, 
  UserInteraction, 
  ResumeData 
} from '../types';
import { 
  PersonalizedRecommendation, 
  ContextInsight 
} from '../lib/ai/agents/context';

interface UseContextAgentReturn {
  // State
  userContext: UserContext | null;
  recommendations: PersonalizedRecommendation[];
  insights: ContextInsight[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  buildContext: () => Promise<void>;
  updateContext: (interaction: UserInteraction) => Promise<void>;
  getRecommendations: (currentResume?: ResumeData) => Promise<void>;
  getInsights: () => Promise<void>;
  clearError: () => void;
}

export function useContextAgent(): UseContextAgentReturn {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [insights, setInsights] = useState<ContextInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build user context
  const buildContext = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/context', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to build user context');
      }

      const data = await response.json();
      setUserContext(data.context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to build context:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update context with new interaction
  const updateContext = useCallback(async (interaction: UserInteraction) => {
    setError(null);
    
    try {
      const response = await fetch('/api/ai/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interaction }),
      });

      if (!response.ok) {
        throw new Error('Failed to update context');
      }

      // Optionally rebuild context after update
      // await buildContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update context');
      console.error('Failed to update context:', err);
    }
  }, []);

  // Get personalized recommendations
  const getRecommendations = useCallback(async (currentResume?: ResumeData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/context/recommendations', {
        method: currentResume ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: currentResume ? JSON.stringify({ currentResume }) : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
      console.error('Failed to get recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get context insights
  const getInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/context/insights', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get insights');
      }

      const data = await response.json();
      setInsights(data.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get insights');
      console.error('Failed to get insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-build context on mount
  useEffect(() => {
    buildContext();
  }, [buildContext]);

  return {
    // State
    userContext,
    recommendations,
    insights,
    isLoading,
    error,
    
    // Actions
    buildContext,
    updateContext,
    getRecommendations,
    getInsights,
    clearError,
  };
}

// Helper hook for tracking user interactions
export function useInteractionTracking() {
  const { updateContext } = useContextAgent();

  const trackInteraction = useCallback(async (
    type: UserInteraction['type'],
    data?: Record<string, any>
  ) => {
    const interaction: UserInteraction = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    await updateContext(interaction);
  }, [updateContext]);

  return { trackInteraction };
}

// Helper hook for recommendation management
export function useRecommendations(currentResume?: ResumeData) {
  const { recommendations, getRecommendations, isLoading, error } = useContextAgent();
  const [acceptedRecommendations, setAcceptedRecommendations] = useState<Set<string>>(new Set());
  const [rejectedRecommendations, setRejectedRecommendations] = useState<Set<string>>(new Set());
  const { trackInteraction } = useInteractionTracking();

  // Get recommendations on mount or when resume changes
  useEffect(() => {
    getRecommendations(currentResume);
  }, [getRecommendations, currentResume]);

  // Accept a recommendation
  const acceptRecommendation = useCallback(async (recommendationId: string) => {
    setAcceptedRecommendations(prev => new Set(prev).add(recommendationId));
    
    await trackInteraction('suggestion_accepted', {
      recommendationId,
      recommendationType: recommendations.find(r => r.id === recommendationId)?.type,
    });
  }, [recommendations, trackInteraction]);

  // Reject a recommendation
  const rejectRecommendation = useCallback(async (recommendationId: string) => {
    setRejectedRecommendations(prev => new Set(prev).add(recommendationId));
    
    await trackInteraction('suggestion_rejected', {
      recommendationId,
      recommendationType: recommendations.find(r => r.id === recommendationId)?.type,
    });
  }, [recommendations, trackInteraction]);

  // Get filtered recommendations (excluding accepted/rejected)
  const activeRecommendations = (recommendations || []).filter(
    rec => !acceptedRecommendations.has(rec.id) && !rejectedRecommendations.has(rec.id)
  );

  return {
    recommendations: activeRecommendations,
    acceptedRecommendations: Array.from(acceptedRecommendations),
    rejectedRecommendations: Array.from(rejectedRecommendations),
    isLoading,
    error,
    acceptRecommendation,
    rejectRecommendation,
    refreshRecommendations: () => getRecommendations(currentResume),
  };
}