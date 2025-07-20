// Real-time AI enhancement component with streaming suggestions
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRealTimeAI } from '../../hooks/useRealTimeAI';
import { UserContext } from '../../types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  CheckIcon, 
  XMarkIcon, 
  SparklesIcon, 
  LightBulbIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface RealTimeEnhancementProps {
  content: string;
  section: string;
  context: UserContext;
  onContentChange?: (content: string) => void;
  onSuggestionApplied?: (originalContent: string, newContent: string) => void;
  className?: string;
  disabled?: boolean;
}

export function RealTimeEnhancement({
  content,
  section,
  context,
  onContentChange,
  onSuggestionApplied,
  className = '',
  disabled = false
}: RealTimeEnhancementProps) {
  const {
    streamingSuggestions,
    isStreaming,
    improvedContent,
    contextualHelp,
    helpVisible,
    feedbackHistory,
    startRealTimeAnalysis,
    stopRealTimeAnalysis,
    acceptSuggestion,
    rejectSuggestion,
    showContextualHelp,
    hideContextualHelp,
    clearSuggestions,
    error,
    clearError
  } = useRealTimeAI({
    debounceMs: 800,
    minContentLength: 15,
    maxSuggestions: 4,
    enableStreaming: true
  });

  const [isEnabled, setIsEnabled] = useState(true);
  const [showImprovedContent, setShowImprovedContent] = useState(false);
  const previousContentRef = useRef(content);

  // Start real-time analysis when content changes
  useEffect(() => {
    if (!disabled && isEnabled && content !== previousContentRef.current) {
      previousContentRef.current = content;
      
      if (content.trim().length > 0) {
        startRealTimeAnalysis(content, section, context);
      } else {
        clearSuggestions();
      }
    }
  }, [content, section, context, disabled, isEnabled, startRealTimeAnalysis, clearSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealTimeAnalysis();
    };
  }, [stopRealTimeAnalysis]);

  const handleAcceptSuggestion = (suggestion: any) => {
    acceptSuggestion(suggestion);
    
    if (onSuggestionApplied) {
      onSuggestionApplied(content, suggestion.content);
    }
  };

  const handleApplyImprovedContent = () => {
    if (improvedContent && onContentChange) {
      onContentChange(improvedContent);
      
      if (onSuggestionApplied) {
        onSuggestionApplied(content, improvedContent);
      }
      
      setShowImprovedContent(false);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'bullet_point':
        return <SparklesIcon className="h-4 w-4" />;
      case 'achievement':
        return <CheckIcon className="h-4 w-4" />;
      case 'skill':
        return <LightBulbIcon className="h-4 w-4" />;
      default:
        return <SparklesIcon className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (disabled) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Control Panel */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Real-time AI Enhancement</span>
          </div>
          
          {isStreaming && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <ClockIcon className="h-4 w-4 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => showContextualHelp(content, section)}
            disabled={!content.trim()}
          >
            <LightBulbIcon className="h-4 w-4 mr-1" />
            Help
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEnabled(!isEnabled)}
            className={isEnabled ? 'bg-green-50 text-green-700' : ''}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Streaming Suggestions */}
      {streamingSuggestions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
            <Badge variant="secondary">
              {streamingSuggestions.length} suggestion{streamingSuggestions.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-3">
            {streamingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`border rounded-lg p-3 transition-all duration-200 ${
                  suggestion.isComplete ? 'border-gray-200' : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSuggestionIcon(suggestion.type || 'bullet_point')}
                    <span className="text-sm font-medium text-gray-700">
                      {suggestion.type?.replace('_', ' ') || 'Suggestion'}
                    </span>
                    {suggestion.confidence && (
                      <Badge 
                        variant="secondary" 
                        className={getConfidenceColor(suggestion.confidence)}
                      >
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    )}
                  </div>

                  {suggestion.isComplete && (
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectSuggestion(suggestion)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-900 mb-2">
                  {suggestion.content}
                </p>

                {suggestion.context && (
                  <p className="text-xs text-gray-600">
                    {suggestion.context}
                  </p>
                )}

                {!suggestion.isComplete && (
                  <div className="mt-2">
                    <Progress value={60} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Improved Content */}
      {improvedContent && improvedContent !== content && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800">Enhanced Content</h3>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => setShowImprovedContent(!showImprovedContent)}
                variant="outline"
              >
                {showImprovedContent ? 'Hide' : 'Show'} Changes
              </Button>
              <Button
                size="sm"
                onClick={handleApplyImprovedContent}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Apply Enhancement
              </Button>
            </div>
          </div>

          {showImprovedContent && (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Original:</h4>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                  {content}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Enhanced:</h4>
                <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                  {improvedContent}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Contextual Help */}
      {helpVisible && contextualHelp && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <LightBulbIcon className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Contextual Help</h3>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={hideContextualHelp}
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="prose prose-sm max-w-none text-blue-900">
            {contextualHelp.split('\n').map((line, index) => (
              <p key={index} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </div>
        </Card>
      )}

      {/* Feedback Statistics */}
      {feedbackHistory.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          Session feedback: {feedbackHistory.filter(f => f.action === 'accepted').length} accepted, {' '}
          {feedbackHistory.filter(f => f.action === 'rejected').length} rejected, {' '}
          {feedbackHistory.filter(f => f.action === 'modified').length} modified
        </div>
      )}
    </div>
  );
}