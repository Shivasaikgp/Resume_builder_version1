'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Resume } from '@/types/database';
import { 
  X, 
  GitCompare, 
  TrendingUp, 
  TrendingDown,
  Minus,
  FileText,
  Calendar,
  Target,
  Building,
  Tag,
  BarChart3,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ResumeComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  resumeIds: string[];
}

interface ComparisonData {
  resume: Resume;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function ResumeComparison({ isOpen, onClose, resumeIds }: ResumeComparisonProps) {
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && resumeIds.length > 0) {
      fetchComparisonData();
    }
  }, [isOpen, resumeIds]);

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const promises = resumeIds.map(async (id) => {
        const response = await fetch(`/api/resumes/${id}`);
        if (!response.ok) throw new Error('Failed to fetch resume');
        const resume = await response.json();
        
        // Mock analysis data - in real app, this would come from AI analysis
        const mockAnalysis = {
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          strengths: [
            'Strong technical skills section',
            'Quantified achievements',
            'Relevant work experience',
            'Clear formatting',
          ].slice(0, Math.floor(Math.random() * 3) + 2),
          weaknesses: [
            'Missing keywords for ATS',
            'Could improve summary section',
            'Needs more action verbs',
            'Skills section could be more detailed',
          ].slice(0, Math.floor(Math.random() * 2) + 1),
          recommendations: [
            'Add more industry-specific keywords',
            'Quantify more achievements with numbers',
            'Improve summary to highlight key strengths',
            'Consider adding a projects section',
          ].slice(0, Math.floor(Math.random() * 2) + 2),
        };
        
        return {
          resume,
          ...mockAnalysis,
        };
      });
      
      const results = await Promise.all(promises);
      setComparisons(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number, compareScore?: number) => {
    if (!compareScore) return <Minus className="w-4 h-4" />;
    if (score > compareScore) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score < compareScore) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0 animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <GitCompare className="w-6 h-6 mr-2 text-blue-500" />
                Resume Comparison
              </h2>
              <p className="text-gray-600 mt-1">
                Compare {resumeIds.length} resumes side by side
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Analyzing resumes...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchComparisonData} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && comparisons.length > 0 && (
            <div className="space-y-6">
              {/* Score Comparison */}
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                  Score Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparisons.map((comparison, index) => (
                    <div key={comparison.resume.id} className="text-center">
                      <div className="relative">
                        <div className={`text-2xl font-bold px-3 py-2 rounded-full inline-flex items-center ${getScoreColor(comparison.score)}`}>
                          {comparison.score}%
                          <span className="ml-2">
                            {getScoreIcon(comparison.score, comparisons[0]?.score)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-2 truncate">
                        {comparison.resume.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {index === 0 ? 'Baseline' : `${comparison.score > comparisons[0].score ? '+' : ''}${comparison.score - comparisons[0].score} vs baseline`}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Detailed Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {comparisons.map((comparison) => {
                  const metadata = comparison.resume.metadata as any || {};
                  const tags = metadata.tags || [];
                  
                  return (
                    <Card key={comparison.resume.id} className="p-6 hover-lift">
                      {/* Resume Header */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                            {comparison.resume.title}
                          </h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${getScoreColor(comparison.score)}`}>
                            {comparison.score}%
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDistanceToNow(new Date(comparison.resume.updatedAt), { addSuffix: true })}
                          </div>
                          
                          {metadata.targetJob && (
                            <div className="flex items-center">
                              <Target className="w-4 h-4 mr-2 text-green-500" />
                              {metadata.targetJob}
                            </div>
                          )}
                          
                          {metadata.targetCompany && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2 text-purple-500" />
                              {metadata.targetCompany}
                            </div>
                          )}
                        </div>
                        
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Strengths */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Strengths
                        </h5>
                        <ul className="space-y-1">
                          {comparison.strengths.map((strength, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-start">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Weaknesses */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                          <TrendingDown className="w-4 h-4 mr-1" />
                          Areas for Improvement
                        </h5>
                        <ul className="space-y-1">
                          {comparison.weaknesses.map((weakness, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-start">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendations */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          Recommendations
                        </h5>
                        <ul className="space-y-1">
                          {comparison.recommendations.map((rec, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-start">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-4 border-t border-gray-200">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/preview/${comparison.resume.id}`, '_blank')}
                          className="flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/builder?resumeId=${comparison.resume.id}`}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Summary Insights */}
              <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                  Key Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Best Performing Resume</h4>
                    <p className="text-gray-600">
                      {comparisons.reduce((best, current) => 
                        current.score > best.score ? current : best
                      ).resume.title} with {Math.max(...comparisons.map(c => c.score))}% score
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Common Strengths</h4>
                    <p className="text-gray-600">
                      Most resumes excel in technical skills and work experience sections
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Areas to Focus</h4>
                    <p className="text-gray-600">
                      Consider improving ATS optimization and adding more quantified achievements
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recommendation</h4>
                    <p className="text-gray-600">
                      Use the best performing resume as a template for others
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button onClick={onClose} className="bg-gradient-primary text-white">
              Close Comparison
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}