'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { DocumentExport } from '@/components/resume/DocumentExport';
import { useDocumentExport } from '@/hooks/useDocumentExport';
import { ResumeData } from '@/types';

export default function BuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('id');
  
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(resumeId);
  const [resumeTitle, setResumeTitle] = useState<string>('My Resume');
  
  const { exportPDF, exportWord, isExporting, exportState } = useDocumentExport();

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, router]);

  const handleSave = async (data: ResumeData) => {
    try {
      const response = await fetch('/api/resumes', {
        method: currentResumeId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentResumeId,
          title: resumeTitle,
          data,
          templateConfig: {
            layout: 'modern',
            colorScheme: 'blue',
            fontSize: 'medium',
            spacing: 'normal',
            showPhoto: false
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save resume');
      }

      const savedResume = await response.json();
      
      if (!currentResumeId) {
        setCurrentResumeId(savedResume.id);
        // Update URL with the new resume ID
        router.push(`/builder?id=${savedResume.id}`);
      }

      console.log('Resume saved successfully');
    } catch (error) {
      console.error('Error saving resume:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!currentResumeId) {
      console.error('No resume ID available for export');
      return;
    }

    try {
      if (format === 'pdf') {
        await exportPDF(currentResumeId);
      } else {
        await exportWord(currentResumeId);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access the resume builder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Builder */}
          <div className="lg:col-span-3">
            <ResumeBuilder 
              onSave={handleSave}
              onExport={handleExport}
            />
          </div>
          
          {/* Export Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {currentResumeId && (
                <DocumentExport
                  resumeId={currentResumeId}
                  resumeTitle={resumeTitle}
                  className="mb-6"
                />
              )}
              
              {/* Export Status */}
              {isExporting && (
                <div className="bg-white rounded-lg p-4 border">
                  <h3 className="font-semibold mb-2">Export Status</h3>
                  <div className="text-sm text-gray-600">
                    <div>{exportState.stage}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportState.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}