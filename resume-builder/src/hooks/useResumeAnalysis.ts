'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  ResumeData, 
  UserContext, 
  ResumeAnalysis, 
  ResumeScore, 
  ATSResult 
} from '../types';

interface AnalysisOptions {
  includeATSCheck?: boolean;
  includeContentAnalysis?: boolean;
  includeKeywordAnalysis?: boolean;
  targetJobDescription?: string;
  priorityThreshold?: 'low' | 'medium' | 'high';
}

interface UseResumeAnalysisReturn {
  // State
  analysis: ResumeAnalysis | null;
  score: ResumeScore | null;
  atsResult: ATSResult | null;
  loading: boolean;
  error: string | null;

  // Actions
  analyzeResume: (resume: ResumeData, context?: UserContext, options?: AnalysisOptions) => Promise<void>;
  scoreResume: (resume: ResumeData, context?: UserContext) => Promise<void>;
  checkATS: (resume: ResumeData, jobDescription?: string) => Promise<void>;
  clearResults: () => void;

  // Real-time scoring
  enableRealTimeScoring: (resume: ResumeData, context?: UserContext, interval?: number) => void;
  disableRealTimeScoring: () => void;
}

export function useResumeAnalysis(): UseResumeAnalysisReturn {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [atsResult, setATSResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyzeResume = useCallback(async (
    resume: ResumeData, 
    context?: UserContext, 
    options: AnalysisOptions = {}
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

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
            priorityThreshold: 'medium',
            ...options
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      const analysisResult = result.data as ResumeAnalysis;

      setAnalysis(analysisResult);
      setError(null);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('Resume analysis error:', err);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const scoreResume = useCallback(async (
    resume: ResumeData, 
    context?: UserContext
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        resume: JSON.stringify(resume),
        ...(context && { context: JSON.stringify(context) })
      });

      const response = await fetch(`/api/ai/analyze?${params}`, {
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scoring failed');
      }

      const result = await response.json();
      const scoreResult = result.data as ResumeScore;

      setScore(scoreResult);
      setError(null);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Scoring failed';
      setError(errorMessage);
      console.error('Resume scoring error:', err);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const checkATS = useCallback(async (
    resume: ResumeData, 
    jobDescription?: string
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/ats-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume,
          jobDescription
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ATS check failed');
      }

      const result = await response.json();
      
      setATSResult(result.data.atsResult);
      setError(null);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      
      const errorMessage = err instanceof Error ? err.message : 'ATS check failed';
      setError(errorMessage);
      console.error('ATS check error:', err);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearResults = useCallback(() => {
    setAnalysis(null);
    setScore(null);
    setATSResult(null);
    setError(null);
    
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const enableRealTimeScoring = useCallback((
    resume: ResumeData, 
    context?: UserContext, 
    interval: number = 3000
  ) => {
    // Clear existing interval
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
    }

    // Set up new interval for real-time scoring
    realTimeIntervalRef.current = setInterval(() => {
      scoreResume(resume, context);
    }, interval);

    // Initial score
    scoreResume(resume, context);
  }, [scoreResume]);

  const disableRealTimeScoring = useCallback(() => {
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      disableRealTimeScoring();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [disableRealTimeScoring]);

  return {
    // State
    analysis,
    score,
    atsResult,
    loading,
    error,

    // Actions
    analyzeResume,
    scoreResume,
    checkATS,
    clearResults,

    // Real-time scoring
    enableRealTimeScoring,
    disableRealTimeScoring
  };
}