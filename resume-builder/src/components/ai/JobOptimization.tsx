'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert } from '../ui/alert';
import { ResumeData, OptimizationSuggestions, JobAnalysis } from '../../types';

interface JobOptimizationProps {
  resume: ResumeData;
  onOptimizationComplete?: (suggestions: OptimizationSuggestions) => void;
  className?: string;
}

interface OptimizationState {
  jobDescription: string;
  isAnalyzing: boolean;
  isOptimizing: boolean;
  jobAnalysis: JobAnalysis | null;
  optimization: OptimizationSuggestions | null;
  error: string | null;
}

export function JobOptimization({ resume, onOptimizationComplete, className }: JobOptimizationProps) {
  const [state, setState] = useState<OptimizationState>({
    jobDescription: '',
    isAnalyzing: false,
    isOptimizing: false,
    jobAnalysis: null,
    optimization: null,
    error: null
  });

  const analyzeJobDescription = useCallback(async () => {
    if (!state.jobDescription.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a job description' }));
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const response = await fetch('/api/ai/job-optimization?action=analyze-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: state.jobDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze job description');
      }

      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          jobAnalysis: data.data,
          isAnalyzing: false 
        }));
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Analysis failed',
        isAnalyzing: false 
      }));
    }
  }, [state.jobDescription]);

  const optimizeResume = useCallback(async () => {
    if (!state.jobDescription.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a job description' }));
      return;
    }

    setState(prev => ({ ...prev, isOptimizing: true, error: null }));

    try {
      const response = await fetch('/api/ai/job-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume,
          jobDescription: state.jobDescription,
          options: {
            includeKeywordAnalysis: true,
            includeContentSuggestions: true,
            includeStructuralChanges: true,
            maxSuggestions: 10
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to optimize resume');
      }

      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          optimization: data.data,
          isOptimizing: false 
        }));
        
        if (onOptimizationComplete) {
          onOptimizationComplete(data.data);
        }
      } else {
        throw new Error(data.error || 'Optimization failed');
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Optimization failed',
        isOptimizing: false 
      }));
    }
  }, [resume, state.jobDescription, onOptimizationComplete]);

  const handleJobDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, jobDescription: e.target.value, error: null }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      jobAnalysis: null, 
      optimization: null, 
      error: null 
    }));
  }, []);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Job Description Input */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="job-description" className="text-lg font-semibold">
              Job Description
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Paste the job description you want to optimize your resume for
            </p>
          </div>
          
          <textarea
            id="job-description"
            value={state.jobDescription}
            onChange={handleJobDescriptionChange}
            placeholder="Paste the job description here..."
            className="w-full h-40 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={state.isAnalyzing || state.isOptimizing}
          />
          
          <div className="flex gap-3">
            <Button
              onClick={analyzeJobDescription}
              disabled={state.isAnalyzing || !state.jobDescription.trim()}
              variant="outline"
            >
              {state.isAnalyzing ? 'Analyzing...' : 'Analyze Job'}
            </Button>
            
            <Button
              onClick={optimizeResume}
              disabled={state.isOptimizing || !state.jobDescription.trim()}
            >
              {state.isOptimizing ? 'Optimizing...' : 'Optimize Resume'}
            </Button>
            
            {(state.jobAnalysis || state.optimization) && (
              <Button onClick={clearResults} variant="outline">
                Clear Results
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Alert variant="destructive">
          <p>{state.error}</p>
        </Alert>
      )}

      {/* Job Analysis Results */}
      {state.jobAnalysis && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Job Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Keywords */}
            <div>
              <h4 className="font-medium mb-2">Key Technologies</h4>
              <div className="flex flex-wrap gap-2">
                {state.jobAnalysis.keywords.technical.slice(0, 8).map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="font-medium mb-2">Experience Level</h4>
              <p className="text-sm text-gray-600">
                {state.jobAnalysis.requirements.experienceLevel} level
                {state.jobAnalysis.requirements.yearsRequired && 
                  ` (${state.jobAnalysis.requirements.yearsRequired}+ years)`
                }
              </p>
            </div>

            {/* Soft Skills */}
            <div>
              <h4 className="font-medium mb-2">Soft Skills</h4>
              <div className="flex flex-wrap gap-2">
                {state.jobAnalysis.keywords.soft.slice(0, 6).map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div>
              <h4 className="font-medium mb-2">Tools & Frameworks</h4>
              <div className="flex flex-wrap gap-2">
                {state.jobAnalysis.keywords.tools.slice(0, 6).map((tool, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-sm"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Optimization Results */}
      {state.optimization && (
        <div className="space-y-6">
          {/* Match Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resume Match Score</h3>
              <div className="text-3xl font-bold text-blue-600">
                {state.optimization.matchScore}%
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${state.optimization.matchScore}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              {state.optimization.matchScore >= 80 ? 'Excellent match!' :
               state.optimization.matchScore >= 60 ? 'Good match with room for improvement' :
               'Significant optimization opportunities available'}
            </p>
          </Card>

          {/* Priority Actions */}
          {state.optimization.priorityActions.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Priority Actions</h3>
              <div className="space-y-3">
                {state.optimization.priorityActions.slice(0, 5).map((action, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {action.order}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{action.action}</p>
                      <p className="text-xs text-gray-600 mt-1">{action.reasoning}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          action.impact === 'high' ? 'bg-red-100 text-red-800' :
                          action.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {action.impact} impact
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          action.effort === 'low' ? 'bg-green-100 text-green-800' :
                          action.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {action.effort} effort
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Keyword Optimization */}
          {state.optimization.keywordOptimization.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Missing Keywords</h3>
              <div className="space-y-3">
                {state.optimization.keywordOptimization
                  .filter(k => k.currentUsage === 0)
                  .slice(0, 8)
                  .map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{keyword.keyword}</span>
                        <span className={`ml-2 px-2 py-1 rounded-md text-xs ${
                          keyword.importance === 'critical' ? 'bg-red-100 text-red-800' :
                          keyword.importance === 'important' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {keyword.importance}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Add to: {keyword.suggestedPlacement.join(', ')}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Content Enhancements */}
          {state.optimization.contentEnhancements.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Content Suggestions</h3>
              <div className="space-y-4">
                {state.optimization.contentEnhancements
                  .filter(e => e.impact === 'high' || e.impact === 'medium')
                  .slice(0, 5)
                  .map((enhancement, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{enhancement.section}</h4>
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          enhancement.impact === 'high' ? 'bg-red-100 text-red-800' :
                          enhancement.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enhancement.impact} impact
                        </span>
                      </div>
                      <p className="text-sm mb-2">{enhancement.suggestion}</p>
                      <p className="text-xs text-gray-600">{enhancement.reasoning}</p>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default JobOptimization;