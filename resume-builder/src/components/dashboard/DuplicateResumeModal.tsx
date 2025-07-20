'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Resume } from '@/types/database';
import { 
  X, 
  Copy, 
  FileText, 
  Briefcase, 
  Building, 
  Target,
  Plus,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DuplicateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: Resume;
  onDuplicate: (data: {
    originalId: string;
    title: string;
    targetJob?: string;
    targetCompany?: string;
    tags: string[];
  }) => Promise<void>;
}

export function DuplicateResumeModal({ 
  isOpen, 
  onClose, 
  resume, 
  onDuplicate 
}: DuplicateResumeModalProps) {
  const [title, setTitle] = useState(`${resume.title} (Copy)`);
  const [targetJob, setTargetJob] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const metadata = resume.metadata as any || {};
  const originalTags = metadata.tags || [];
  const originalTargetJob = metadata.targetJob || '';
  const originalTargetCompany = metadata.targetCompany || '';
  const lastAnalysis = resume.analyses?.[0];

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onDuplicate({
        originalId: resume.id,
        title: title.trim(),
        targetJob: targetJob.trim() || undefined,
        targetCompany: targetCompany.trim() || undefined,
        tags,
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to duplicate resume:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(`${resume.title} (Copy)`);
    setTargetJob('');
    setTargetCompany('');
    setTags([]);
    setNewTag('');
    setLoading(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl border-0 animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Copy className="w-6 h-6 mr-2 text-blue-500" />
                Duplicate Resume
              </h2>
              <p className="text-gray-600 mt-1">
                Create a copy of your resume with customizations
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Original Resume Info */}
          <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" />
                  {resume.title}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      Updated {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
                    </div>
                    
                    {originalTargetJob && (
                      <div className="flex items-center">
                        <Target className="w-4 h-4 mr-2 text-green-500" />
                        {originalTargetJob}
                      </div>
                    )}
                    
                    {originalTargetCompany && (
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-purple-500" />
                        {originalTargetCompany}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {lastAnalysis && (
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-orange-500" />
                        Score: {lastAnalysis.score}%
                      </div>
                    )}
                    
                    {originalTags.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {originalTags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {originalTags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{originalTags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {/* New Resume Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-blue-500" />
                New Resume Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for the duplicated resume"
                className="focus-ring"
              />
            </div>

            {/* Target Job */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Target className="w-4 h-4 mr-2 text-green-500" />
                Target Job Position
              </label>
              <Input
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder={originalTargetJob || "e.g., Senior Software Engineer"}
                className="focus-ring"
              />
              {originalTargetJob && (
                <p className="text-xs text-gray-500">
                  Original: {originalTargetJob}
                </p>
              )}
            </div>

            {/* Target Company */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Building className="w-4 h-4 mr-2 text-purple-500" />
                Target Company
              </label>
              <Input
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder={originalTargetCompany || "e.g., Google, Microsoft, Startup"}
                className="focus-ring"
              />
              {originalTargetCompany && (
                <p className="text-xs text-gray-500">
                  Original: {originalTargetCompany}
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Briefcase className="w-4 h-4 mr-2 text-orange-500" />
                Additional Tags
              </label>
              <div className="flex space-x-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add new tags for this version"
                  className="focus-ring"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  size="sm"
                  className="bg-gradient-success text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Original Tags */}
              {originalTags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Original tags (will be copied):</p>
                  <div className="flex flex-wrap gap-1">
                    {originalTags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* New Tags */}
              {tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Additional tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!title.trim() || loading}
                className="bg-gradient-primary text-white hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Duplicating...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}