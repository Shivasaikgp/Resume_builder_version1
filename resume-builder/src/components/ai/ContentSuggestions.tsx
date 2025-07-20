// React component for displaying and managing content suggestions
'use client';

import React, { useState } from 'react';
import { useContentGeneration } from '../../hooks/useContentGeneration';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { ContentSuggestion, UserContext } from '../../types';
import { ErrorDisplay } from '../ui/error-display';
import { LoadingOverlay, AIProcessing } from '../ui/loading-states';
import { FeedbackCollector, QuickFeedback } from '../feedback/FeedbackCollector';
import { logUIError } from '@/lib/error-logging';

interface ContentSuggestionsProps {
  context: UserContext;
  section: string;
  currentContent?: string;
  onSuggestionSelect?: (suggestion: ContentSuggestion) => void;
  className?: string;
}

export function ContentSuggestions({
  context,
  section,
  currentContent,
  onSuggestionSelect,
  className = ''
}: ContentSuggestionsProps) {
  const {
    isLoading,
    error,
    suggestions,
    generateSuggestions,
    clearError,
    clearSuggestions
  } = useContentGeneration();

  const { withErrorHandling, retry, canRetry } = useErrorHandling();
  const [showReasoning, setShowReasoning] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'generating' | 'optimizing' | 'finalizing' | null>(null);

  const handleGenerateSuggestions = async () => {
    try {
      await withErrorHandling(async () => {
        setProcessingStage('analyzing');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing stages
        
        setProcessingStage('generating');
        const result = await generateSuggestions(context, section, currentContent, {
          maxSuggestions: 5,
          includeReasoning: true
        });
        
        setProcessingStage('finalizing');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setProcessingStage(null);
        return result;
      });
    } catch (err) {
      setProcessingStage(null);
      logUIError(err as Error, 'ContentSuggestions', context.userId);
      console.error('Failed to generate suggestions:', err);
    }
  };

  const handleSuggestionClick = (suggestion: ContentSuggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  const handleFeedback = async (feedbackData: any) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      });
      setShowFeedback(null);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleQuickFeedback = async (suggestionId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    await handleFeedback({
      type: 'suggestion',
      rating,
      context: {
        suggestionId,
        section,
        content: currentContent,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'bullet_point':
        return 'bg-blue-100 text-blue-800';
      case 'achievement':
        return 'bg-green-100 text-green-800';
      case 'skill':
        return 'bg-purple-100 text-purple-800';
      case 'keyword':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          AI Content Suggestions
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showReasoning ? 'Hide' : 'Show'} Reasoning
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={clearSuggestions}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorDisplay
            error={error}
            onRetry={canRetry ? retry : undefined}
            onDismiss={clearError}
          />
        </div>
      )}

      {processingStage && (
        <div className="mb-4">
          <AIProcessing stage={processingStage} />
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating Suggestions...' : 'Generate AI Suggestions'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Found {suggestions.length} suggestions for {section}:
          </p>
          
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSuggestionTypeColor(suggestion.type)}`}
                >
                  {suggestion.type.replace('_', ' ')}
                </span>
                <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                  {Math.round(suggestion.confidence * 100)}% confidence
                </span>
              </div>
              
              <p className="text-sm text-gray-900 mb-2">
                {suggestion.content}
              </p>
              
              <p className="text-xs text-gray-600 mb-2">
                {suggestion.context}
              </p>
              
              {showReasoning && suggestion.reasoning && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                  <strong>Reasoning:</strong> {suggestion.reasoning}
                </div>
              )}
              
              <div className="mt-2 flex items-center justify-between">
                <QuickFeedback
                  onFeedback={(rating) => handleQuickFeedback(suggestion.id, rating)}
                  className="text-xs"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFeedback(suggestion.id);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Detailed Feedback
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            Click "Generate AI Suggestions" to get personalized content recommendations
          </p>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <FeedbackCollector
              type="suggestion"
              suggestionId={showFeedback}
              section={section}
              content={currentContent}
              onSubmit={handleFeedback}
              onCancel={() => setShowFeedback(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}