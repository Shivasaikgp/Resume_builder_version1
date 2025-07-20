'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { ResumeData, UserContext, ResumeScore } from '../../types';

interface RealtimeScoreProps {
  resume: ResumeData;
  context?: UserContext;
  updateInterval?: number;
  onScoreUpdate?: (score: ResumeScore) => void;
}

export function RealtimeScore({ 
  resume, 
  context, 
  updateInterval = 2000,
  onScoreUpdate 
}: RealtimeScoreProps) {
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        resume: JSON.stringify(resume),
        ...(context && { context: JSON.stringify(context) })
      });

      const response = await fetch(`/api/ai/analyze?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch score');
      }

      const result = await response.json();
      const newScore = result.data as ResumeScore;

      setScore(newScore);
      onScoreUpdate?.(newScore);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate score');
    } finally {
      setLoading(false);
    }
  }, [resume, context, loading, onScoreUpdate]);

  // Debounced effect for real-time updates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScore();
    }, updateInterval);

    return () => clearTimeout(timer);
  }, [resume, fetchScore, updateInterval]);

  // Initial load
  useEffect(() => {
    fetchScore();
  }, []);

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

  const getProgressColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="text-red-800 text-sm">
          <strong>Scoring Error:</strong> {error}
        </div>
      </Card>
    );
  }

  if (!score && loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Calculating score...</span>
        </div>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-500 text-sm">
          No score available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Resume Score</h3>
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        )}
      </div>

      {/* Overall Score Circle */}
      <div className="flex justify-center mb-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getScoreBackground(score.overall)}`}>
          <span className={`text-2xl font-bold ${getScoreColor(score.overall)}`}>
            {score.overall}
          </span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3">
        {Object.entries(score.breakdown).map(([category, value]) => (
          <div key={category} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 capitalize">
              {category === 'atsCompatibility' ? 'ATS' : category}
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(value)}`}
                  style={{ width: `${value}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(value)}`}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      {score.details && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {score.details.criticalIssues.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-red-700 mb-1">Critical Issues</h4>
              <ul className="space-y-1">
                {score.details.criticalIssues.slice(0, 2).map((issue, index) => (
                  <li key={index} className="text-xs text-red-600 flex items-start">
                    <span className="mr-1">•</span>
                    <span className="line-clamp-2">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.details.improvements.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-orange-700 mb-1">Quick Wins</h4>
              <ul className="space-y-1">
                {score.details.improvements.slice(0, 2).map((improvement, index) => (
                  <li key={index} className="text-xs text-orange-600 flex items-start">
                    <span className="mr-1">→</span>
                    <span className="line-clamp-2">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.details.strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 mb-1">Strengths</h4>
              <ul className="space-y-1">
                {score.details.strengths.slice(0, 2).map((strength, index) => (
                  <li key={index} className="text-xs text-green-600 flex items-start">
                    <span className="mr-1">✓</span>
                    <span className="line-clamp-2">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </Card>
  );
}