import { useState, useCallback } from 'react';
import { Resume } from '@/types/database';

interface DashboardFilters {
  search: string;
  tags: string[];
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

interface CreateResumeOptions {
  title: string;
  method: 'blank' | 'upload';
  file?: File;
}

interface DuplicateOptions {
  title: string;
  targetJob?: string;
  targetCompany?: string;
  modifications?: any;
}

export function useDashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async (filters: DashboardFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/resumes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }

      const data = await response.json();
      setResumes(data.resumes || []);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  }, []);

  const createResume = useCallback(async (options: CreateResumeOptions) => {
    setLoading(true);
    setError(null);

    try {
      let resumeData;

      if (options.method === 'upload' && options.file) {
        // Parse uploaded file first
        const formData = new FormData();
        formData.append('file', options.file);

        const parseResponse = await fetch('/api/documents/parse', {
          method: 'POST',
          body: formData,
        });

        if (!parseResponse.ok) {
          throw new Error('Failed to parse uploaded file');
        }

        const parseData = await parseResponse.json();
        resumeData = parseData.resumeData;
      } else {
        // Create blank resume with default structure
        resumeData = {
          personalInfo: {
            fullName: '',
            email: '',
            phone: '',
            location: '',
            summary: '',
          },
          sections: [
            {
              id: 'experience',
              type: 'experience',
              title: 'Professional Experience',
              items: [],
            },
            {
              id: 'education',
              type: 'education',
              title: 'Education',
              items: [],
            },
            {
              id: 'skills',
              type: 'skills',
              title: 'Skills',
              items: [],
            },
          ],
        };
      }

      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: options.title,
          data: resumeData,
          templateConfig: {
            layout: 'standard',
            theme: 'professional',
          },
          metadata: {
            version: 1,
            tags: [],
            createdMethod: options.method,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create resume');
      }

      const data = await response.json();
      const newResume = data.resume;

      // Add to local state
      setResumes(prev => [newResume, ...prev]);

      // Navigate to builder
      window.location.href = `/builder?resumeId=${newResume.id}`;

      return newResume;
    } catch (err) {
      console.error('Error creating resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to create resume');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicateResume = useCallback(async (resumeId: string, options: DuplicateOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${resumeId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate resume');
      }

      const data = await response.json();
      const duplicatedResume = data.resume;

      // Add to local state
      setResumes(prev => [duplicatedResume, ...prev]);

      return {
        resume: duplicatedResume,
        suggestions: data.suggestions || [],
      };
    } catch (err) {
      console.error('Error duplicating resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate resume');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteResume = useCallback(async (resumeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }

      // Remove from local state
      setResumes(prev => prev.filter(resume => resume.id !== resumeId));
    } catch (err) {
      console.error('Error deleting resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete resume');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateResume = useCallback(async (resumeId: string, updates: Partial<Resume>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update resume');
      }

      const data = await response.json();
      const updatedResume = data.resume;

      // Update local state
      setResumes(prev => 
        prev.map(resume => 
          resume.id === resumeId ? updatedResume : resume
        )
      );

      return updatedResume;
    } catch (err) {
      console.error('Error updating resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to update resume');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getResumeById = useCallback((resumeId: string) => {
    return resumes.find(resume => resume.id === resumeId);
  }, [resumes]);

  const getResumesByTag = useCallback((tag: string) => {
    return resumes.filter(resume => {
      const metadata = resume.metadata as any;
      return metadata?.tags?.includes(tag);
    });
  }, [resumes]);

  const getRecentResumes = useCallback((limit: number = 5) => {
    return [...resumes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }, [resumes]);

  const searchResumes = useCallback((query: string) => {
    if (!query.trim()) return resumes;

    const lowercaseQuery = query.toLowerCase();
    return resumes.filter(resume => {
      const metadata = resume.metadata as any;
      return (
        resume.title.toLowerCase().includes(lowercaseQuery) ||
        metadata?.targetJob?.toLowerCase().includes(lowercaseQuery) ||
        metadata?.targetCompany?.toLowerCase().includes(lowercaseQuery) ||
        metadata?.notes?.toLowerCase().includes(lowercaseQuery) ||
        metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(lowercaseQuery))
      );
    });
  }, [resumes]);

  return {
    resumes,
    loading,
    error,
    fetchResumes,
    createResume,
    duplicateResume,
    deleteResume,
    updateResume,
    getResumeById,
    getResumesByTag,
    getRecentResumes,
    searchResumes,
  };
}