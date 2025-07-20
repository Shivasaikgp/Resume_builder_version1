'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Resume } from '@/types/database';
import { 
  MoreVertical, 
  Copy, 
  Edit, 
  Trash2, 
  Download, 
  Eye,
  Calendar,
  Target,
  Building,
  Tag,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ResumeCardProps {
  resume: Resume;
  viewMode: 'grid' | 'list';
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ResumeCard({
  resume,
  viewMode,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: ResumeCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const metadata = resume.metadata as any || {};
  const tags = metadata.tags || [];
  const targetJob = metadata.targetJob;
  const targetCompany = metadata.targetCompany;
  const lastAnalysis = resume.analyses?.[0];
  const score = lastAnalysis?.score;

  const handleEdit = () => {
    window.location.href = `/builder?resumeId=${resume.id}`;
  };

  const handlePreview = () => {
    window.open(`/preview/${resume.id}`, '_blank');
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Download resume:', resume.id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (viewMode === 'list') {
    return (
      <Card className={`p-6 hover:shadow-xl transition-all duration-300 hover-lift bg-white/80 backdrop-blur-sm border-0 shadow-md ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 transition-all"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-slate-800 truncate">
                  {resume.title}
                </h3>
                {score && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getScoreColor(score)}`}>
                    {score}% Score
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
                  Updated {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
                </span>
                
                {targetJob && (
                  <span className="flex items-center">
                    <Target className="w-4 h-4 mr-1.5 text-green-500" />
                    {targetJob}
                  </span>
                )}
                
                {targetCompany && (
                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1.5 text-purple-500" />
                    {targetCompany}
                  </span>
                )}
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-medium"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-full">
                      +{tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handlePreview}
              className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 focus-ring"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEdit}
              className="text-slate-600 hover:text-green-600 hover:bg-green-50 focus-ring"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDuplicate}
              className="text-slate-600 hover:text-purple-600 hover:bg-purple-50 focus-ring"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              className="text-slate-600 hover:text-orange-600 hover:bg-orange-50 focus-ring"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              className="text-slate-600 hover:text-red-600 hover:bg-red-50 focus-ring"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`relative p-6 hover:shadow-2xl transition-all duration-300 hover-lift cursor-pointer bg-white/80 backdrop-blur-sm border-0 shadow-lg ${
      selected ? 'ring-2 ring-blue-500 bg-blue-50/50 shadow-blue-200/50' : ''
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-1 w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 transition-all"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 line-clamp-2 leading-tight">
              {resume.title}
            </h3>
            
            {(targetJob || targetCompany) && (
              <div className="space-y-2 mb-4">
                {targetJob && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Target className="w-4 h-4 mr-2 text-green-500" />
                    <span className="truncate">{targetJob}</span>
                  </div>
                )}
                {targetCompany && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Building className="w-4 h-4 mr-2 text-purple-500" />
                    <span className="truncate">{targetCompany}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-ring"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showActions && (
            <div className="absolute right-0 top-8 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl z-20 py-2 min-w-[140px] animate-fade-in">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors"
              >
                <Eye className="w-4 h-4 mr-3 text-blue-500" />
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 hover:text-green-700 flex items-center transition-colors"
              >
                <Edit className="w-4 h-4 mr-3 text-green-500" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 hover:text-purple-700 flex items-center transition-colors"
              >
                <Copy className="w-4 h-4 mr-3 text-purple-500" />
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 hover:text-orange-700 flex items-center transition-colors"
              >
                <Download className="w-4 h-4 mr-3 text-orange-500" />
                Download
              </button>
              <hr className="my-2 border-slate-200" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Score and Analysis */}
      {score && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">Resume Score</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getScoreColor(score)}`}>
              {score}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                score >= 80 
                  ? 'bg-gradient-to-r from-green-400 to-green-600' 
                  : score >= 60 
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' 
                    : 'bg-gradient-to-r from-red-400 to-red-600'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-medium"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-xs text-slate-500 px-2.5 py-1 bg-slate-100 rounded-full font-medium">
                +{tags.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-200">
        <span className="flex items-center">
          <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
          {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
        </span>
        
        {lastAnalysis && (
          <span className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-green-500" />
            <span className="text-green-600 font-medium">Analyzed</span>
          </span>
        )}
      </div>
      
      {/* Click overlay for card selection */}
      <div
        className="absolute inset-0 z-0 rounded-lg"
        onClick={() => onSelect(!selected)}
      />
    </Card>
  );
}