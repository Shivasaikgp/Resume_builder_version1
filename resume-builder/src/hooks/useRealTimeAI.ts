// Real-time AI enhancement hook with streaming capabilities
import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ContentSuggestion, 
  UserContext, 
  ExperienceItem 
} from '../types';

interface StreamingSuggestion {
  id: string;
  content: string;
  isComplete: boolean;
  confidence?: number;
  type?: string;
  context?: string;
}

interface RealTimeAIOptions {
  debounceMs?: number;
  minContentLength?: number;
  maxSuggestions?: number;
  enableStreaming?: boolean;
}

interface SuggestionFeedback {
  suggestionId: string;
  action: 'accepted' | 'rejected' | 'modified';
  originalContent: string;
  finalContent?: string;
  timestamp: Date;
  context: string;
}

interface UseRealTimeAIReturn {
  // Streaming suggestions
  streamingSuggestions: StreamingSuggestion[];
  isStreaming: boolean;
  
  // Real-time content improvement
  improvedContent: string | null;
  isImproving: boolean;
  
  // Contextual help
  contextualHelp: string | null;
  helpVisible: boolean;
  
  // Feedback tracking
  feedbackHistory: SuggestionFeedback[];
  
  // Actions
  startRealTimeAnalysis: (content: string, section: string, context: UserContext) => void;
  stopRealTimeAnalysis: () => void;
  acceptSuggestion: (suggestion: StreamingSuggestion, finalContent?: string) => void;
  rejectSuggestion: (suggestion: StreamingSuggestion) => void;
  showContextualHelp: (content: string, section: string) => void;
  hideContextualHelp: () => void;
  clearSuggestions: () => void;
  
  // State
  error: string | null;
  clearError: () => void;
}

export function useRealTimeAI(options: RealTimeAIOptions = {}): UseRealTimeAIReturn {
  const {
    debounceMs = 500,
    minContentLength = 10,
    maxSuggestions = 5,
    enableStreaming = true
  } = options;

  // State
  const [streamingSuggestions, setStreamingSuggestions] = useState<StreamingSuggestion[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [improvedContent, setImprovedContent] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [contextualHelp, setContextualHelp] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<SuggestionFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for managing streaming and debouncing
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamingSessionRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuggestions = useCallback(() => {
    setStreamingSuggestions([]);
    setImprovedContent(null);
    setContextualHelp(null);
    setHelpVisible(false);
  }, []);

  const startRealTimeAnalysis = useCallback((
    content: string,
    section: string,
    context: UserContext
  ) => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't analyze if content is too short
    if (content.length < minContentLength) {
      clearSuggestions();
      return;
    }

    // Debounce the analysis
    debounceTimerRef.current = setTimeout(() => {
      performRealTimeAnalysis(content, section, context);
    }, debounceMs);
  }, [debounceMs, minContentLength, clearSuggestions]);

  const performRealTimeAnalysis = useCallback(async (
    content: string,
    section: string,
    context: UserContext
  ) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const sessionId = crypto.randomUUID();
    streamingSessionRef.current = sessionId;

    setIsStreaming(true);
    setError(null);
    setStreamingSuggestions([]);

    try {
      if (enableStreaming) {
        await performStreamingAnalysis(content, section, context, abortController, sessionId);
      } else {
        await performBatchAnalysis(content, section, context, abortController);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setError(error.message);
        console.error('Real-time analysis error:', error);
      }
    } finally {
      if (streamingSessionRef.current === sessionId) {
        setIsStreaming(false);
      }
    }
  }, [enableStreaming]);

  const performStreamingAnalysis = useCallback(async (
    content: string,
    section: string,
    context: UserContext,
    abortController: AbortController,
    sessionId: string
  ) => {
    const response = await fetch('/api/ai/realtime/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        section,
        context,
        options: {
          maxSuggestions,
          includeImprovement: true,
          includeHelp: true
        }
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming analysis');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Only process if this is still the current session
        if (streamingSessionRef.current !== sessionId) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              processStreamingData(data, sessionId);
            } catch (e) {
              console.warn('Failed to parse streaming data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, [maxSuggestions]);

  const processStreamingData = useCallback((data: any, sessionId: string) => {
    // Only process if this is still the current session
    if (streamingSessionRef.current !== sessionId) {
      return;
    }

    switch (data.type) {
      case 'suggestion':
        setStreamingSuggestions(prev => {
          const existing = prev.find(s => s.id === data.id);
          if (existing) {
            return prev.map(s => 
              s.id === data.id 
                ? { ...s, content: data.content, isComplete: data.isComplete }
                : s
            );
          } else {
            return [...prev, {
              id: data.id,
              content: data.content,
              isComplete: data.isComplete,
              confidence: data.confidence,
              type: data.suggestionType,
              context: data.context
            }];
          }
        });
        break;

      case 'improvement':
        setImprovedContent(data.content);
        break;

      case 'help':
        setContextualHelp(data.content);
        break;

      case 'error':
        setError(data.message);
        break;
    }
  }, []);

  const performBatchAnalysis = useCallback(async (
    content: string,
    section: string,
    context: UserContext,
    abortController: AbortController
  ) => {
    const response = await fetch('/api/ai/realtime/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        section,
        context,
        options: { maxSuggestions }
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error('Failed to analyze content');
    }

    const data = await response.json();
    
    // Convert to streaming format
    const suggestions: StreamingSuggestion[] = data.suggestions.map((s: ContentSuggestion) => ({
      id: s.id,
      content: s.content,
      isComplete: true,
      confidence: s.confidence,
      type: s.type,
      context: s.context
    }));

    setStreamingSuggestions(suggestions);
    
    if (data.improvedContent) {
      setImprovedContent(data.improvedContent);
    }
  }, [maxSuggestions]);

  const stopRealTimeAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    streamingSessionRef.current = null;
    setIsStreaming(false);
  }, []);

  const acceptSuggestion = useCallback((
    suggestion: StreamingSuggestion,
    finalContent?: string
  ) => {
    const feedback: SuggestionFeedback = {
      suggestionId: suggestion.id,
      action: finalContent && finalContent !== suggestion.content ? 'modified' : 'accepted',
      originalContent: suggestion.content,
      finalContent,
      timestamp: new Date(),
      context: suggestion.context || ''
    };

    setFeedbackHistory(prev => [...prev, feedback]);

    // Send feedback to server for learning
    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    }).catch(console.error);

    // Remove suggestion from list
    setStreamingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, []);

  const rejectSuggestion = useCallback((suggestion: StreamingSuggestion) => {
    const feedback: SuggestionFeedback = {
      suggestionId: suggestion.id,
      action: 'rejected',
      originalContent: suggestion.content,
      timestamp: new Date(),
      context: suggestion.context || ''
    };

    setFeedbackHistory(prev => [...prev, feedback]);

    // Send feedback to server for learning
    fetch('/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    }).catch(console.error);

    // Remove suggestion from list
    setStreamingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, []);

  const showContextualHelp = useCallback(async (content: string, section: string) => {
    setHelpVisible(true);
    
    try {
      const response = await fetch('/api/ai/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, section })
      });

      if (response.ok) {
        const data = await response.json();
        setContextualHelp(data.help);
      }
    } catch (error) {
      console.error('Failed to get contextual help:', error);
    }
  }, []);

  const hideContextualHelp = useCallback(() => {
    setHelpVisible(false);
  }, []);

  return {
    // Streaming suggestions
    streamingSuggestions,
    isStreaming,
    
    // Real-time content improvement
    improvedContent,
    isImproving,
    
    // Contextual help
    contextualHelp,
    helpVisible,
    
    // Feedback tracking
    feedbackHistory,
    
    // Actions
    startRealTimeAnalysis,
    stopRealTimeAnalysis,
    acceptSuggestion,
    rejectSuggestion,
    showContextualHelp,
    hideContextualHelp,
    clearSuggestions,
    
    // State
    error,
    clearError
  };
}