'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ResumeCard } from './ResumeCard';
import { ResumeFilters } from './ResumeFilters';
import { DuplicateResumeModal } from './DuplicateResumeModal';
import { CreateResumeModal } from './CreateResumeModal';
import { ResumeComparison } from './ResumeComparison';
import { useDashboard } from '@/hooks/useDashboard';
import { Resume } from '@/types/database';
import { Search, Plus, Grid, List } from 'lucide-react';

interface DashboardFilters {
  search: string;
  tags: string[];
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

export function ResumeDashboard() {
  const { user, logout } = useAuth();
  const {
    resumes,
    loading,
    error,
    fetchResumes,
    deleteResume,
    duplicateResume,
    createResume,
  } = useDashboard();

  const [filters, setFilters] = useState<DashboardFilters>({
    search: '',
    tags: [],
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedResumes, setSelectedResumes] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [resumeToDuplicate, setResumeToDuplicate] = useState<Resume | null>(null);

  useEffect(() => {
    fetchResumes(filters);
  }, [filters, fetchResumes]);

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const handleFilterChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSelectResume = (resumeId: string, selected: boolean) => {
    setSelectedResumes(prev => 
      selected 
        ? [...prev, resumeId]
        : prev.filter(id => id !== resumeId)
    );
  };

  const handleDuplicateResume = (resume: Resume) => {
    setResumeToDuplicate(resume);
    setShowDuplicateModal(true);
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (confirm('Are you sure you want to delete this resume?')) {
      await deleteResume(resumeId);
      setSelectedResumes(prev => prev.filter(id => id !== resumeId));
    }
  };

  const handleCompareResumes = () => {
    if (selectedResumes.length >= 2) {
      setShowComparison(true);
    }
  };

  const availableTags = Array.from(
    new Set(
      resumes.flatMap(resume => 
        (resume.metadata as any)?.tags || []
      )
    )
  );

  if (loading && resumes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading your resumes...</h3>
          <p className="text-slate-600">Please wait while we fetch your documents ✨</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Oops! Something went wrong</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <Button 
            onClick={() => fetchResumes(filters)}
            className="bg-gradient-primary text-white hover:shadow-lg hover-lift focus-ring"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">Resume Dashboard</h1>
              <p className="text-slate-600 mt-1">Welcome back, <span className="font-medium text-blue-600">{user?.name}</span>! ✨</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-primary text-white hover:shadow-lg hover-lift focus-ring"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Resume
              </Button>
              <Button 
                onClick={logout} 
                variant="outline"
                className="border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus-ring"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search resumes by title, job, company, or notes..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-all"
                />
              </div>
              <div className="flex items-center space-x-3">
                <ResumeFilters
                  filters={filters}
                  availableTags={availableTags}
                  onFilterChange={handleFilterChange}
                />
                <div className="flex bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-1 shadow-sm">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg ${
                      viewMode === 'grid' 
                        ? 'bg-gradient-primary text-white shadow-md' 
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg ${
                      viewMode === 'list' 
                        ? 'bg-gradient-primary text-white shadow-md' 
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            {selectedResumes.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 font-medium flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse-custom"></div>
                    {selectedResumes.length} resume{selectedResumes.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    {selectedResumes.length >= 2 && (
                      <Button
                        onClick={handleCompareResumes}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 focus-ring"
                      >
                        Compare
                      </Button>
                    )}
                    <Button
                      onClick={() => setSelectedResumes([])}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-100 focus-ring"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resume Grid/List */}
          {resumes.length === 0 ? (
            <Card className="p-12 text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm hover-lift">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📄</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-3">
                  {filters.search || filters.tags.length > 0 ? "No matching resumes" : "No resumes yet"}
                </h3>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  {filters.search || filters.tags.length > 0
                    ? "Try adjusting your search criteria or filters to find what you're looking for"
                    : "Ready to create your first professional resume? Let's get started with our AI-powered builder! ✨"}
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-primary text-white hover:shadow-lg hover-lift focus-ring px-8 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {filters.search || filters.tags.length > 0 ? "Create New Resume" : "Create Your First Resume"}
                </Button>
              </div>
            </Card>
          ) : (
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }>
              {resumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  viewMode={viewMode}
                  selected={selectedResumes.includes(resume.id)}
                  onSelect={(selected) => handleSelectResume(resume.id, selected)}
                  onDuplicate={() => handleDuplicateResume(resume)}
                  onDelete={() => handleDeleteResume(resume.id)}
                />
              ))}
            </div>
          )}

          {loading && resumes.length > 0 && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateResumeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateResume={createResume}
      />

      {resumeToDuplicate && (
        <DuplicateResumeModal
          isOpen={showDuplicateModal}
          onClose={() => {
            setShowDuplicateModal(false);
            setResumeToDuplicate(null);
          }}
          resume={resumeToDuplicate}
          onDuplicate={duplicateResume}
        />
      )}

      {showComparison && selectedResumes.length >= 2 && (
        <ResumeComparison
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          resumeIds={selectedResumes.slice(0, 3)} // Limit to 3 for comparison
        />
      )}
    </div>
  );
}