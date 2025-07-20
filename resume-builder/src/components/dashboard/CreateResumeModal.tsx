'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Plus, 
  FileText, 
  Briefcase, 
  Building, 
  Target,
  Sparkles,
  Upload,
  Zap
} from 'lucide-react';

interface CreateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateResume: (data: {
    title: string;
    targetJob?: string;
    targetCompany?: string;
    tags: string[];
    template?: string;
    importFile?: File;
  }) => Promise<void>;
}

export function CreateResumeModal({ isOpen, onClose, onCreateResume }: CreateResumeModalProps) {
  const [step, setStep] = useState<'method' | 'details'>('method');
  const [method, setMethod] = useState<'scratch' | 'import' | 'template'>('scratch');
  const [title, setTitle] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const templates = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Clean and modern design perfect for corporate roles',
      color: 'bg-blue-500',
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Bold design for creative and design positions',
      color: 'bg-purple-500',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple and elegant layout focusing on content',
      color: 'bg-gray-500',
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Contemporary design with subtle accents',
      color: 'bg-green-500',
    },
  ];

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onCreateResume({
        title: title.trim(),
        targetJob: targetJob.trim() || undefined,
        targetCompany: targetCompany.trim() || undefined,
        tags,
        template: method === 'template' ? selectedTemplate : undefined,
        importFile: importFile || undefined,
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create resume:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('method');
    setMethod('scratch');
    setTitle('');
    setTargetJob('');
    setTargetCompany('');
    setTags([]);
    setNewTag('');
    setSelectedTemplate('professional');
    setImportFile(null);
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
                <Sparkles className="w-6 h-6 mr-2 text-blue-500" />
                Create New Resume
              </h2>
              <p className="text-gray-600 mt-1">
                {step === 'method' 
                  ? 'Choose how you\'d like to start building your resume'
                  : 'Add details to personalize your resume'
                }
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

          {step === 'method' && (
            <div className="space-y-6">
              {/* Method Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`p-6 cursor-pointer transition-all hover-lift ${
                    method === 'scratch' 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setMethod('scratch')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Start from Scratch</h3>
                    <p className="text-sm text-gray-600">
                      Build your resume step by step with AI assistance
                    </p>
                  </div>
                </Card>

                <Card 
                  className={`p-6 cursor-pointer transition-all hover-lift ${
                    method === 'import' 
                      ? 'ring-2 ring-green-500 bg-green-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setMethod('import')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-success rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Import Existing</h3>
                    <p className="text-sm text-gray-600">
                      Upload your current resume and enhance it with AI
                    </p>
                  </div>
                </Card>

                <Card 
                  className={`p-6 cursor-pointer transition-all hover-lift ${
                    method === 'template' 
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setMethod('template')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Use Template</h3>
                    <p className="text-sm text-gray-600">
                      Start with a professional template and customize
                    </p>
                  </div>
                </Card>
              </div>

              {/* Template Selection */}
              {method === 'template' && (
                <div className="space-y-4 animate-slide-in">
                  <h4 className="font-medium text-gray-900">Choose a Template</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`p-4 cursor-pointer transition-all hover-lift ${
                          selectedTemplate === template.id
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${template.color} rounded-lg flex-shrink-0`} />
                          <div>
                            <h5 className="font-medium text-gray-900">{template.name}</h5>
                            <p className="text-xs text-gray-600">{template.description}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* File Upload */}
              {method === 'import' && (
                <div className="space-y-4 animate-slide-in">
                  <h4 className="font-medium text-gray-900">Upload Your Resume</h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {importFile ? importFile.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX files only</p>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => setStep('details')}
                  className="bg-gradient-primary text-white hover:shadow-lg"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-6">
              {/* Resume Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" />
                  Resume Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Software Engineer Resume - Google"
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
                  placeholder="e.g., Senior Software Engineer"
                  className="focus-ring"
                />
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
                  placeholder="e.g., Google, Microsoft, Startup"
                  className="focus-ring"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-orange-500" />
                  Tags
                </label>
                <div className="flex space-x-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag (e.g., Frontend, React, Remote)"
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
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
                )}
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('method')}
                >
                  Back
                </Button>
                <div className="space-x-3">
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
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Resume
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}