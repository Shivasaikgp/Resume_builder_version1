'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { 
  ResumeData, 
  UserContext, 
  ResumeAnalysis as ResumeAnalysisType,
  ResumeScore,
  ATSResult 
} from '../../types';

interface ResumeAnalysisProps {
  resume: ResumeData;
  context?: UserContext;
  onAnalysisComplete?: (analysis: ResumeAnalysisType) => void;
  realTimeMode?: boolean;
}

interface AnalysisState {
  analysis: ResumeAnalysisType | null;
  score: ResumeScore | null;
  atsResult: ATSResult | null;
  loading: boolean;
  error: string | null;
}

export function ResumeAnalysis({ 
  resume, 
  context, 
  onAnalysisComplete,
  realTimeMode = false 
}: ResumeAnalysisProps) {
  const [state, setState] = useState<AnalysisState>({
    analysis: null,
    score: null,
    atsResult: null,
    loading: false,
    error: null
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'detailed' | 'ats'>('overview');

  // Real-time analysis effect
  useEffect(() => {
    if (realTimeMode) {
      const debounceTimer = setTimeout(() => {
        performQuickScore();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(debounceTimer);
    }
  }, [resume, realTimeMode]);

  const performFullAnalysis = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume,
          context,
          options: {
            includeATSCheck: true,
            includeContentAnalysis: true,
            includeKeywordAnalysis: true,
            priorityThreshold: 'medium'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      const analysis = result.data as ResumeAnalysisType;

      setState(prev => ({
        ...prev,
        analysis,
        loading: false
      }));

      onAnalysisComplete?.(analysis);

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Analysis failed',
        loading: false
      }));
    }
  };

  const performQuickScore = async () => {
    try {
      const params = new URLSearchParams({
        resume: JSON.stringify(resume),
        ...(context && { context: JSON.stringify(context) })
      });

      const response = await fetch(`/api/ai/analyze?${params}`);
      
      if (!response.ok) {
        throw new Error('Scoring failed');
      }

      const result = await response.json();
      const score = result.data as ResumeScore;

      setState(prev => ({
        ...prev,
        score,
        error: null
      }));

    } catch (error) {
      console.error('Quick scoring failed:', error);
    }
  };

  const performATSCheck = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/ai/ats-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume }),
      });

      if (!response.ok) {
        throw new Error('ATS check failed');
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        atsResult: result.data.atsResult,
        loading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'ATS check failed',
        loading: false
      }));
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const renderScoreCircle = (score: number, label: string) => (
    <div className="flex flex-col items-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreBackground(score)}`}>
        <span className={`text-xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Overall Score */}
      {(state.analysis || state.score) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Overall Score</h3>
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreBackground(state.analysis?.overallScore || state.score?.overall || 0)}`}>
                <span className={`text-3xl font-bold ${getScoreColor(state.analysis?.overallScore || state.score?.overall || 0)}`}>
                  {state.analysis?.overallScore || state.score?.overall || 0}
                </span>
              </div>
              <span className="text-lg text-gray-700 mt-2">Overall</span>
            </div>
          </div>

          {/* Score Breakdown */}
          {(state.analysis?.breakdown || state.score?.breakdown) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderScoreCircle(
                state.analysis?.breakdown.content || state.score?.breakdown.content || 0,
                'Content'
              )}
              {renderScoreCircle(
                state.analysis?.breakdown.formatting || state.score?.breakdown.formatting || 0,
                'Format'
              )}
              {renderScoreCircle(
                state.analysis?.breakdown.atsCompatibility || state.score?.breakdown.atsCompatibility || 0,
                'ATS'
              )}
              {renderScoreCircle(
                state.analysis?.breakdown.keywords || state.score?.breakdown.keywords || 0,
                'Keywords'
              )}
            </div>
          )}
        </Card>
      )}

      {/* Quick Insights */}
      {state.analysis && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Strengths */}
          <Card className="p-4">
            <h4 className="font-semibold text-green-700 mb-3">Strengths</h4>
            <ul className="space-y-2">
              {state.analysis?.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Top Improvements */}
          <Card className="p-4">
            <h4 className="font-semibold text-orange-700 mb-3">Priority Improvements</h4>
            <ul className="space-y-2">
              {state.analysis?.improvements?.slice(0, 3).map((improvement, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-500 mr-2">!</span>
                  <span className="text-sm">{improvement}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );

  const renderDetailedTab = () => (
    <div className="space-y-6">
      {state.analysis?.suggestions && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Detailed Suggestions</h3>
          <div className="space-y-4">
            {state.analysis.suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  suggestion.priority === 'high' 
                    ? 'border-red-500 bg-red-50' 
                    : suggestion.priority === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestion.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {suggestion.priority.toUpperCase()}
                      </span>
                      {suggestion.section && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {suggestion.section}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {suggestion.message}
                    </p>
                    <p className="text-xs text-gray-600">
                      Type: {suggestion.type}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderATSTab = () => (
    <div className="space-y-6">
      {state.atsResult && (
        <>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">ATS Compatibility Score</h3>
            <div className="flex items-center justify-center mb-6">
              {renderScoreCircle(state.atsResult.score, 'ATS Score')}
            </div>
            
            {state.atsResult.formatting.issues.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-700 mb-2">Issues Found</h4>
                <ul className="space-y-1">
                  {state.atsResult.formatting.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start">
                      <span className="mr-2">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {state.atsResult.formatting.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-blue-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {state.atsResult.formatting.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-600 flex items-start">
                      <span className="mr-2">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Keyword Analysis</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Found Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {state.atsResult.keywords.found.slice(0, 10).map((keyword, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-orange-700 mb-2">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {state.atsResult.keywords.missing.slice(0, 10).map((keyword, index) => (
                    <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Resume Analysis</h2>
        <div className="flex gap-2">
          <Button 
            onClick={performQuickScore}
            variant="outline"
            disabled={state.loading}
          >
            Quick Score
          </Button>
          <Button 
            onClick={performATSCheck}
            variant="outline"
            disabled={state.loading}
          >
            ATS Check
          </Button>
          <Button 
            onClick={performFullAnalysis}
            disabled={state.loading}
          >
            {state.loading ? 'Analyzing...' : 'Full Analysis'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <div className="text-red-800">
            <strong>Error:</strong> {state.error}
          </div>
        </Alert>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'detailed', label: 'Detailed Analysis' },
            { id: 'ats', label: 'ATS Check' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'detailed' && renderDetailedTab()}
      {selectedTab === 'ats' && renderATSTab()}

      {/* Loading State */}
      {state.loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Analyzing resume...</span>
        </div>
      )}
    </div>
  );
}