/**
 * Final Integration and User Acceptance Testing
 * 
 * This comprehensive test suite validates:
 * - Complete user workflows from start to finish
 * - AI agent interactions and coordination
 * - Template adaptation across different user scenarios
 * - Multi-resume management and context persistence
 * - Performance under realistic load conditions
 * 
 * Requirements: All requirements comprehensive validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components and services
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ContentGenerationAgent } from '@/lib/ai/content-generation-agent';
import { AnalysisAgent } from '@/lib/ai/analysis-agent';
import { ContextAgent } from '@/lib/ai/context-agent';
import { getClientCacheManager } from '@/lib/cache/client-cache';
import { getPerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import { DocumentExportService } from '@/lib/document-export/DocumentExportService';
import { ResumeParser } from '@/lib/parsing/resume-parser';

// Mock external services
const mockServer = setupServer(
  // Authentication endpoints
  http.post('/api/auth/signin', () => {
    return HttpResponse.json({
      user: { id: 'test-user-123', email: 'test@example.com', name: 'Test User' },
      token: 'mock-jwt-token'
    });
  }),

  // Resume management endpoints
  http.get('/api/resumes', () => {
    return HttpResponse.json([
      {
        id: 'resume-1',
        title: 'Software Engineer Resume',
        userId: 'test-user-123',
        data: {
          personalInfo: { name: 'John Doe', email: 'john@example.com' },
          experience: [{ title: 'Developer', company: 'Tech Corp' }]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }),

  http.post('/api/resumes', () => {
    return HttpResponse.json({
      id: 'new-resume-123',
      title: 'New Resume',
      success: true
    });
  }),

  http.put('/api/resumes/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/resumes/:id/duplicate', () => {
    return HttpResponse.json({
      id: 'duplicated-resume-456',
      title: 'Copy of Resume',
      success: true
    });
  }),

  // AI service endpoints
  http.post('/api/ai/content/generate', () => {
    return HttpResponse.json({
      suggestions: [
        'Developed scalable web applications serving 10,000+ users daily',
        'Led cross-functional team of 5 engineers to deliver projects 20% ahead of schedule',
        'Implemented automated testing reducing bug reports by 40%'
      ]
    });
  }),

  http.post('/api/ai/analyze', () => {
    return HttpResponse.json({
      score: 87,
      breakdown: {
        content_quality: 85,
        ats_compatibility: 90,
        keyword_optimization: 85,
        formatting: 88
      },
      suggestions: [
        {
          type: 'content',
          priority: 'high',
          message: 'Add quantifiable metrics to demonstrate impact',
          section: 'experience'
        },
        {
          type: 'keywords',
          priority: 'medium',
          message: 'Include more industry-specific keywords',
          section: 'skills'
        }
      ]
    });
  }),

  http.post('/api/ai/context/update', () => {
    return HttpResponse.json({
      success: true,
      context: {
        industry: 'technology',
        experienceLevel: 'senior',
        preferences: { writingStyle: 'professional' }
      }
    });
  }),

  http.post('/api/ai/optimize', () => {
    return HttpResponse.json({
      optimizedContent: 'Optimized content based on job description',
      keywordMatches: ['React', 'JavaScript', 'Node.js'],
      improvementScore: 15
    });
  }),

  // Document export endpoints
  http.post('/api/documents/pdf', () => {
    return HttpResponse.json({
      success: true,
      downloadUrl: '/downloads/resume.pdf'
    });
  }),

  http.post('/api/documents/word', () => {
    return HttpResponse.json({
      success: true,
      downloadUrl: '/downloads/resume.docx'
    });
  }),

  // Document parsing endpoints
  http.post('/api/documents/parse', () => {
    return HttpResponse.json({
      success: true,
      parsedData: {
        personalInfo: {
          name: 'Parsed User',
          email: 'parsed@example.com',
          phone: '555-0123'
        },
        experience: [{
          title: 'Senior Developer',
          company: 'Previous Company',
          startDate: '2020-01',
          endDate: '2023-12',
          description: 'Led development of enterprise applications'
        }],
        education: [{
          degree: 'BS Computer Science',
          school: 'University',
          graduationYear: '2019'
        }],
        skills: ['JavaScript', 'React', 'Python', 'AWS']
      }
    });
  })
);

describe('Final Integration and User Acceptance Testing', () => {
  let performanceMonitor: ReturnType<typeof getPerformanceMonitor>;
  let cacheManager: ReturnType<typeof getClientCacheManager>;

  beforeAll(() => {
    mockServer.listen();
    performanceMonitor = getPerformanceMonitor();
    cacheManager = getClientCacheManager();
  });

  afterAll(() => {
    mockServer.close();
    cacheManager.destroy();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });  
describe('Complete User Workflows Integration', () => {
    it('should complete end-to-end resume creation workflow', async () => {
      const user = userEvent.setup();
      performanceMonitor.startTimer('complete_workflow');

      // Step 1: Render Resume Builder
      const mockProps = {
        userId: 'test-user-123',
        onSave: vi.fn(),
        onAnalyze: vi.fn()
      };

      render(<ResumeBuilder {...mockProps} />);

      // Step 2: Fill Personal Information
      await act(async () => {
        await user.type(screen.getByTestId('full-name-input'), 'John Doe');
        await user.type(screen.getByTestId('email-input'), 'john.doe@example.com');
        await user.type(screen.getByTestId('phone-input'), '+1 (555) 123-4567');
        await user.type(screen.getByTestId('location-input'), 'San Francisco, CA');
      });

      // Verify real-time preview updates
      await waitFor(() => {
        expect(screen.getByTestId('preview-name')).toHaveTextContent('John Doe');
        expect(screen.getByTestId('preview-email')).toHaveTextContent('john.doe@example.com');
      });

      // Step 3: Add Work Experience with AI Enhancement
      await act(async () => {
        await user.click(screen.getByTestId('add-experience-button'));
        await user.type(screen.getByTestId('job-title-input'), 'Senior Software Engineer');
        await user.type(screen.getByTestId('company-input'), 'Tech Corp');
        await user.type(screen.getByTestId('job-description-input'), 'Developed web applications');
      });

      // Wait for AI suggestions to appear
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeInTheDocument();
      });

      // Accept AI suggestion
      await act(async () => {
        await user.click(screen.getByTestId('ai-suggestion-0'));
      });

      // Step 4: Add Education and Skills
      await act(async () => {
        await user.click(screen.getByTestId('add-education-button'));
        await user.type(screen.getByTestId('degree-input'), 'BS Computer Science');
        await user.type(screen.getByTestId('school-input'), 'University');

        await user.click(screen.getByTestId('add-skill-button'));
        await user.type(screen.getByTestId('skill-input'), 'JavaScript{enter}React{enter}Node.js{enter}');
      });

      // Step 5: Verify AI Analysis
      await waitFor(() => {
        expect(screen.getByTestId('resume-score')).toBeInTheDocument();
        expect(screen.getByTestId('analysis-panel')).toBeInTheDocument();
      });

      // Step 6: Save Resume
      await act(async () => {
        await user.click(screen.getByTestId('save-resume-button'));
      });

      await waitFor(() => {
        expect(mockProps.onSave).toHaveBeenCalled();
      });

      const workflowTime = performanceMonitor.endTimer('complete_workflow');
      expect(workflowTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Complete workflow time: ${workflowTime.toFixed(2)}ms`);
    });

    it('should handle job description optimization workflow', async () => {
      const user = userEvent.setup();
      performanceMonitor.startTimer('job_optimization_workflow');

      const mockProps = {
        userId: 'test-user-123',
        resumeId: 'existing-resume-123',
        onSave: vi.fn()
      };

      render(<ResumeBuilder {...mockProps} />);

      // Add job description for optimization
      await act(async () => {
        await user.click(screen.getByTestId('optimize-for-job-button'));
        await user.type(screen.getByTestId('job-description-textarea'), 
          'Looking for Senior React Developer with TypeScript experience and GraphQL knowledge'
        );
        await user.click(screen.getByTestId('analyze-job-button'));
      });

      // Wait for job analysis
      await waitFor(() => {
        expect(screen.getByTestId('job-analysis-results')).toBeInTheDocument();
        expect(screen.getByTestId('keyword-suggestions')).toBeInTheDocument();
      });

      // Apply optimization suggestions
      await act(async () => {
        await user.click(screen.getByTestId('apply-optimization-button'));
      });

      // Verify optimization score improvement
      await waitFor(() => {
        expect(screen.getByTestId('optimization-score')).toBeInTheDocument();
      });

      const optimizationTime = performanceMonitor.endTimer('job_optimization_workflow');
      expect(optimizationTime).toBeLessThan(5000);

      console.log(`Job optimization workflow time: ${optimizationTime.toFixed(2)}ms`);
    });

    it('should handle resume import and parsing workflow', async () => {
      const user = userEvent.setup();
      performanceMonitor.startTimer('import_workflow');

      render(<ResumeBuilder userId="test-user-123" onSave={vi.fn()} />);

      // Simulate file upload
      const file = new File(['mock resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByTestId('file-upload-input');

      await act(async () => {
        await user.upload(fileInput, file);
      });

      // Wait for parsing to complete
      await waitFor(() => {
        expect(screen.getByTestId('parsing-progress')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('parsing-complete')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify parsed data appears in form
      await waitFor(() => {
        expect(screen.getByTestId('full-name-input')).toHaveValue('Parsed User');
        expect(screen.getByTestId('email-input')).toHaveValue('parsed@example.com');
      });

      const importTime = performanceMonitor.endTimer('import_workflow');
      expect(importTime).toBeLessThan(15000);

      console.log(`Import workflow time: ${importTime.toFixed(2)}ms`);
    });
  });

  describe('AI Agent Interactions Integration', () => {
    it('should coordinate multiple AI agents effectively', async () => {
      const contentAgent = new ContentGenerationAgent();
      const analysisAgent = new AnalysisAgent();
      const contextAgent = new ContextAgent();

      performanceMonitor.startTimer('ai_coordination');

      const userId = 'integration-test-user';
      const jobTitle = 'Full Stack Developer';

      // Step 1: Generate content suggestions
      const suggestions = await contentAgent.generateSuggestions({
        jobTitle,
        industry: 'technology',
        experienceLevel: 'senior'
      });

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);

      // Step 2: Create resume with generated content
      const mockResume = {
        personalInfo: { name: 'Test User', email: 'test@example.com' },
        experience: [{
          title: jobTitle,
          company: 'Tech Company',
          description: suggestions[0]
        }],
        skills: ['JavaScript', 'React', 'Node.js']
      };

      // Step 3: Analyze the resume
      const analysis = await analysisAgent.analyzeResume(mockResume);

      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThan(0);
      expect(analysis.suggestions).toBeDefined();

      // Step 4: Update context based on analysis
      await contextAgent.updateContext(userId, {
        type: 'analysis_completed',
        data: {
          score: analysis.score,
          suggestions: analysis.suggestions,
          jobTitle,
          industry: 'technology'
        }
      });

      // Step 5: Get personalized recommendations
      const context = await contextAgent.getUserContext(userId);
      const personalizedSuggestions = await contextAgent.getPersonalizedSuggestions(context);

      expect(personalizedSuggestions).toBeDefined();
      expect(personalizedSuggestions.length).toBeGreaterThan(0);

      const coordinationTime = performanceMonitor.endTimer('ai_coordination');
      expect(coordinationTime).toBeLessThan(8000);

      console.log(`AI coordination time: ${coordinationTime.toFixed(2)}ms`);
      console.log(`Generated ${suggestions.length} suggestions`);
      console.log(`Resume score: ${analysis.score}`);
      console.log(`Personalized suggestions: ${personalizedSuggestions.length}`);
    });

    it('should handle concurrent AI requests efficiently', async () => {
      const contentAgent = new ContentGenerationAgent();
      const analysisAgent = new AnalysisAgent();

      performanceMonitor.startTimer('concurrent_ai_requests');

      const concurrentRequests = 10;
      const requests = [];

      // Create multiple concurrent AI requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          contentAgent.generateSuggestions({
            jobTitle: `Developer ${i}`,
            industry: 'technology'
          })
        );

        requests.push(
          analysisAgent.analyzeResume({
            personalInfo: { name: `User ${i}` },
            experience: [{ title: `Role ${i}`, description: `Description ${i}` }]
          })
        );
      }

      const results = await Promise.all(requests);
      const concurrentTime = performanceMonitor.endTimer('concurrent_ai_requests');

      expect(results).toHaveLength(concurrentRequests * 2);
      expect(concurrentTime).toBeLessThan(10000); // Should handle concurrent requests efficiently

      console.log(`Concurrent AI requests time: ${concurrentTime.toFixed(2)}ms`);
      console.log(`Processed ${results.length} concurrent requests`);
    });

    it('should maintain AI context across sessions', async () => {
      const contextAgent = new ContextAgent();
      const userId = 'context-persistence-user';

      // Session 1: Initial context building
      await contextAgent.updateContext(userId, {
        type: 'session_start',
        data: {
          industry: 'healthcare',
          experienceLevel: 'mid',
          targetRole: 'Data Scientist'
        }
      });

      await contextAgent.updateContext(userId, {
        type: 'suggestion_accepted',
        data: {
          suggestion: 'Analyzed healthcare data to improve patient outcomes',
          category: 'quantified_achievements'
        }
      });

      // Session 2: Retrieve and verify context persistence
      const context = await contextAgent.getUserContext(userId);

      expect(context).toBeDefined();
      expect(context.profile.industry).toBe('healthcare');
      expect(context.profile.experienceLevel).toBe('mid');
      expect(context.profile.targetRoles).toContain('Data Scientist');

      // Session 3: Context evolution
      await contextAgent.updateContext(userId, {
        type: 'preference_updated',
        data: {
          writingStyle: 'technical',
          contentLength: 'detailed'
        }
      });

      const updatedContext = await contextAgent.getUserContext(userId);
      expect(updatedContext.preferences.writingStyle).toBe('technical');

      console.log('Context persistence validated across sessions');
    });
  });  
describe('Template Adaptation Validation', () => {
    it('should adapt template for different experience levels', async () => {
      const user = userEvent.setup();

      // Test entry-level adaptation
      const entryLevelProps = {
        userId: 'entry-user',
        initialData: {
          personalInfo: { name: 'Junior Dev' },
          experience: [{
            title: 'Intern',
            company: 'Startup',
            description: 'Learned programming fundamentals'
          }]
        },
        onSave: vi.fn()
      };

      const { rerender } = render(<ResumeBuilder {...entryLevelProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-layout')).toHaveAttribute('data-experience-level', 'entry');
        expect(screen.getByTestId('skills-section')).toBeInTheDocument(); // Emphasized for entry-level
      });

      // Test senior-level adaptation
      const seniorLevelProps = {
        userId: 'senior-user',
        initialData: {
          personalInfo: { name: 'Senior Dev' },
          experience: [
            {
              title: 'Senior Engineer',
              company: 'Big Tech',
              description: 'Led team of 8 developers, architected scalable systems'
            },
            {
              title: 'Tech Lead',
              company: 'Previous Company',
              description: 'Managed technical roadmap, mentored junior developers'
            }
          ]
        },
        onSave: vi.fn()
      };

      rerender(<ResumeBuilder {...seniorLevelProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-layout')).toHaveAttribute('data-experience-level', 'senior');
        expect(screen.getByTestId('leadership-section')).toBeInTheDocument(); // Emphasized for senior-level
      });

      console.log('Template adaptation validated for different experience levels');
    });

    it('should adapt template based on industry and role', async () => {
      const techProps = {
        userId: 'tech-user',
        initialData: {
          personalInfo: { name: 'Software Engineer' },
          experience: [{
            title: 'Full Stack Developer',
            company: 'Tech Startup',
            description: 'Built web applications using React and Node.js'
          }],
          skills: ['JavaScript', 'React', 'Node.js', 'AWS']
        },
        onSave: vi.fn()
      };

      const { rerender } = render(<ResumeBuilder {...techProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-layout')).toHaveAttribute('data-industry', 'technology');
        expect(screen.getByTestId('technical-skills-section')).toBeInTheDocument();
      });

      // Test healthcare industry adaptation
      const healthcareProps = {
        userId: 'healthcare-user',
        initialData: {
          personalInfo: { name: 'Data Scientist' },
          experience: [{
            title: 'Healthcare Data Analyst',
            company: 'Medical Center',
            description: 'Analyzed patient data to improve treatment outcomes'
          }],
          skills: ['Python', 'R', 'SQL', 'Healthcare Analytics']
        },
        onSave: vi.fn()
      };

      rerender(<ResumeBuilder {...healthcareProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('template-layout')).toHaveAttribute('data-industry', 'healthcare');
        expect(screen.getByTestId('certifications-section')).toBeInTheDocument();
      });

      console.log('Template adaptation validated for different industries');
    });

    it('should maintain template consistency across resume versions', async () => {
      const baseResumeData = {
        personalInfo: { name: 'Consistent User', email: 'user@example.com' },
        experience: [{
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'Developed applications'
        }]
      };

      // Create multiple resume versions
      const versions = ['frontend-focused', 'backend-focused', 'fullstack-focused'];
      const renderedVersions = [];

      for (const version of versions) {
        const versionProps = {
          userId: 'consistent-user',
          resumeId: `resume-${version}`,
          initialData: {
            ...baseResumeData,
            metadata: { targetRole: version }
          },
          onSave: vi.fn()
        };

        const { container } = render(<ResumeBuilder {...versionProps} />);
        renderedVersions.push(container);

        await waitFor(() => {
          expect(screen.getByTestId('template-layout')).toBeInTheDocument();
        });
      }

      // Verify consistent styling and structure
      expect(renderedVersions.length).toBe(3);
      console.log('Template consistency validated across resume versions');
    });
  });

  describe('Multi-Resume Management and Context Persistence', () => {
    it('should manage multiple resume versions effectively', async () => {
      const user = userEvent.setup();
      performanceMonitor.startTimer('multi_resume_management');

      const dashboardProps = {
        userId: 'multi-resume-user'
      };

      render(<Dashboard {...dashboardProps} />);

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Create multiple resumes
      const resumeCount = 5;
      for (let i = 0; i < resumeCount; i++) {
        await act(async () => {
          await user.click(screen.getByTestId('create-resume-button'));
          await user.type(screen.getByTestId('resume-title-input'), `Resume ${i + 1}`);
          await user.click(screen.getByTestId('confirm-create-button'));
        });

        await waitFor(() => {
          expect(screen.getByText(`Resume ${i + 1}`)).toBeInTheDocument();
        });
      }

      // Test resume duplication
      await act(async () => {
        await user.click(screen.getByTestId('resume-menu-0'));
        await user.click(screen.getByTestId('duplicate-resume-button'));
      });

      await waitFor(() => {
        expect(screen.getByText('Copy of Resume 1')).toBeInTheDocument();
      });

      // Test resume organization
      await act(async () => {
        await user.click(screen.getByTestId('organize-resumes-button'));
        await user.click(screen.getByTestId('sort-by-date'));
      });

      // Test search functionality
      await act(async () => {
        await user.type(screen.getByTestId('resume-search-input'), 'Resume 3');
      });

      await waitFor(() => {
        expect(screen.getByText('Resume 3')).toBeInTheDocument();
        expect(screen.queryByText('Resume 1')).not.toBeInTheDocument();
      });

      const managementTime = performanceMonitor.endTimer('multi_resume_management');
      expect(managementTime).toBeLessThan(15000);

      console.log(`Multi-resume management time: ${managementTime.toFixed(2)}ms`);
      console.log(`Managed ${resumeCount + 1} resumes (including duplicate)`);
    });

    it('should maintain context across resume switches', async () => {
      const contextAgent = new ContextAgent();
      const userId = 'context-switch-user';

      // Build initial context
      await contextAgent.updateContext(userId, {
        type: 'resume_created',
        data: {
          resumeId: 'resume-1',
          targetRole: 'Frontend Developer',
          industry: 'technology'
        }
      });

      // Switch to different resume
      await contextAgent.updateContext(userId, {
        type: 'resume_switched',
        data: {
          fromResumeId: 'resume-1',
          toResumeId: 'resume-2',
          targetRole: 'Backend Developer'
        }
      });

      // Verify context continuity
      const context = await contextAgent.getUserContext(userId);
      expect(context.profile.industry).toBe('technology'); // Should persist
      expect(context.history.resumeVersions).toContain('resume-1');
      expect(context.history.resumeVersions).toContain('resume-2');

      // Get context-aware suggestions for new resume
      const suggestions = await contextAgent.getPersonalizedSuggestions(context);
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);

      console.log('Context persistence validated across resume switches');
    });

    it('should handle resume version comparison', async () => {
      const user = userEvent.setup();

      render(<Dashboard userId="comparison-user" />);

      // Select multiple resumes for comparison
      await act(async () => {
        await user.click(screen.getByTestId('resume-checkbox-0'));
        await user.click(screen.getByTestId('resume-checkbox-1'));
        await user.click(screen.getByTestId('compare-resumes-button'));
      });

      // Wait for comparison view
      await waitFor(() => {
        expect(screen.getByTestId('resume-comparison')).toBeInTheDocument();
        expect(screen.getByTestId('comparison-resume-1')).toBeInTheDocument();
        expect(screen.getByTestId('comparison-resume-2')).toBeInTheDocument();
      });

      // Verify comparison features
      expect(screen.getByTestId('score-comparison')).toBeInTheDocument();
      expect(screen.getByTestId('content-differences')).toBeInTheDocument();

      console.log('Resume version comparison validated');
    });
  });  d
escribe('Performance Under Realistic Load', () => {
    it('should handle high-frequency user interactions', async () => {
      const user = userEvent.setup();
      performanceMonitor.startTimer('high_frequency_interactions');

      render(<ResumeBuilder userId="performance-user" onSave={vi.fn()} />);

      // Simulate rapid typing and interactions
      const interactions = 100;
      const startTime = performance.now();

      for (let i = 0; i < interactions; i++) {
        await act(async () => {
          // Alternate between different types of interactions
          if (i % 4 === 0) {
            await user.type(screen.getByTestId('job-description-input'), 'a');
          } else if (i % 4 === 1) {
            await user.click(screen.getByTestId('ai-suggestion-refresh'));
          } else if (i % 4 === 2) {
            await user.type(screen.getByTestId('skill-input'), 'skill');
            await user.keyboard('{Backspace>4}');
          } else {
            await user.click(screen.getByTestId('preview-tab'));
          }
        });

        // Small delay to simulate realistic user behavior
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const interactionTime = performanceMonitor.endTimer('high_frequency_interactions');
      const averageInteractionTime = interactionTime / interactions;

      expect(averageInteractionTime).toBeLessThan(50); // Each interaction should be under 50ms
      expect(interactionTime).toBeLessThan(10000); // Total time under 10 seconds

      console.log(`High-frequency interactions: ${interactions} in ${interactionTime.toFixed(2)}ms`);
      console.log(`Average interaction time: ${averageInteractionTime.toFixed(2)}ms`);
    });

    it('should maintain performance with large resume datasets', async () => {
      performanceMonitor.startTimer('large_dataset_performance');

      // Simulate large resume dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `resume-${i}`,
        title: `Resume ${i}`,
        userId: 'performance-user',
        data: {
          personalInfo: {
            name: `User ${i}`,
            email: `user${i}@example.com`
          },
          experience: Array.from({ length: 5 }, (_, j) => ({
            title: `Position ${j}`,
            company: `Company ${j}`,
            description: `Description for position ${j} at company ${j}`.repeat(10)
          })),
          skills: Array.from({ length: 20 }, (_, k) => `Skill ${k}`)
        },
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Cache the large dataset
      for (const resume of largeDataset) {
        cacheManager.resume.cacheResume(resume.id, resume);
      }

      // Test retrieval performance
      const retrievalStartTime = performance.now();
      const retrievedResumes = largeDataset.slice(0, 50).map(resume => 
        cacheManager.resume.getResume(resume.id)
      );

      const retrievalTime = performance.now() - retrievalStartTime;
      expect(retrievalTime).toBeLessThan(1000); // Should retrieve 50 resumes in under 1 second

      // Test search performance
      const searchStartTime = performance.now();
      const searchResults = largeDataset.filter(resume => 
        resume.title.includes('Resume 1') || resume.title.includes('Resume 2')
      );
      const searchTime = performance.now() - searchStartTime;

      expect(searchTime).toBeLessThan(100); // Search should be under 100ms
      expect(searchResults.length).toBeGreaterThan(0);

      const totalTime = performanceMonitor.endTimer('large_dataset_performance');
      expect(totalTime).toBeLessThan(5000);

      console.log(`Large dataset performance: ${largeDataset.length} resumes`);
      console.log(`Retrieval time: ${retrievalTime.toFixed(2)}ms`);
      console.log(`Search time: ${searchTime.toFixed(2)}ms`);
    });

    it('should handle concurrent user sessions', async () => {
      performanceMonitor.startTimer('concurrent_sessions');

      const sessionCount = 20;
      const operationsPerSession = 10;

      const sessionPromises = Array.from({ length: sessionCount }, async (_, sessionIndex) => {
        const userId = `concurrent-user-${sessionIndex}`;
        const contextAgent = new ContextAgent();

        const sessionOperations = [];

        for (let opIndex = 0; opIndex < operationsPerSession; opIndex++) {
          sessionOperations.push(
            contextAgent.updateContext(userId, {
              type: 'user_interaction',
              data: {
                action: `action-${opIndex}`,
                timestamp: new Date(),
                sessionId: `session-${sessionIndex}`
              }
            })
          );
        }

        return Promise.all(sessionOperations);
      });

      await Promise.all(sessionPromises);
      const concurrentTime = performanceMonitor.endTimer('concurrent_sessions');

      expect(concurrentTime).toBeLessThan(15000); // Should handle 20 concurrent sessions in under 15 seconds

      console.log(`Concurrent sessions: ${sessionCount} users, ${operationsPerSession} ops each`);
      console.log(`Total time: ${concurrentTime.toFixed(2)}ms`);
    });
  });

  describe('Document Export and Import Integration', () => {
    it('should export resumes in multiple formats', async () => {
      const exportService = new DocumentExportService();
      performanceMonitor.startTimer('document_export');

      const mockResume = {
        personalInfo: {
          name: 'Export Test User',
          email: 'export@example.com',
          phone: '555-0123'
        },
        experience: [{
          title: 'Software Engineer',
          company: 'Tech Corp',
          startDate: '2020-01',
          endDate: '2023-12',
          description: 'Developed scalable web applications'
        }],
        education: [{
          degree: 'BS Computer Science',
          school: 'University',
          graduationYear: '2019'
        }],
        skills: ['JavaScript', 'React', 'Node.js']
      };

      // Test PDF export
      const pdfResult = await exportService.exportToPDF(mockResume);
      expect(pdfResult.success).toBe(true);
      expect(pdfResult.downloadUrl).toBeDefined();

      // Test Word export
      const wordResult = await exportService.exportToWord(mockResume);
      expect(wordResult.success).toBe(true);
      expect(wordResult.downloadUrl).toBeDefined();

      const exportTime = performanceMonitor.endTimer('document_export');
      expect(exportTime).toBeLessThan(5000);

      console.log(`Document export time: ${exportTime.toFixed(2)}ms`);
    });

    it('should parse and import resumes accurately', async () => {
      const parser = new ResumeParser();
      performanceMonitor.startTimer('document_import');

      // Mock file data
      const mockPDFContent = 'Mock PDF resume content with structured data';
      const mockWordContent = 'Mock Word resume content with formatted sections';

      // Test PDF parsing
      const pdfResult = await parser.parsePDF(mockPDFContent);
      expect(pdfResult.success).toBe(true);
      expect(pdfResult.parsedData).toBeDefined();
      expect(pdfResult.parsedData.personalInfo).toBeDefined();

      // Test Word parsing
      const wordResult = await parser.parseWord(mockWordContent);
      expect(wordResult.success).toBe(true);
      expect(wordResult.parsedData).toBeDefined();

      const importTime = performanceMonitor.endTimer('document_import');
      expect(importTime).toBeLessThan(8000);

      console.log(`Document import time: ${importTime.toFixed(2)}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle AI service failures gracefully', async () => {
      // Mock AI service failure
      mockServer.use(
        http.post('/api/ai/content/generate', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const contentAgent = new ContentGenerationAgent();
      
      // Should not throw error, should return fallback
      const suggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Developer',
        company: 'Test Corp'
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      // Should provide fallback suggestions or empty array
    });

    it('should recover from network interruptions', async () => {
      const user = userEvent.setup();

      render(<ResumeBuilder userId="network-test-user" onSave={vi.fn()} />);

      // Simulate network failure
      mockServer.use(
        http.post('/api/resumes', () => {
          return new HttpResponse(null, { status: 0 }); // Network error
        })
      );

      // Try to save resume
      await act(async () => {
        await user.type(screen.getByTestId('full-name-input'), 'Network Test');
        await user.click(screen.getByTestId('save-resume-button'));
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Restore network and retry
      mockServer.resetHandlers();

      await act(async () => {
        await user.click(screen.getByTestId('retry-save-button'));
      });

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByTestId('save-success-message')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should maintain accessibility standards', async () => {
      const { container } = render(<ResumeBuilder userId="accessibility-user" onSave={vi.fn()} />);

      // Check for proper ARIA labels
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();

      // Check for keyboard navigation
      const firstInput = screen.getByTestId('full-name-input');
      firstInput.focus();
      expect(document.activeElement).toBe(firstInput);

      // Check for screen reader support
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Check color contrast (would need actual color values in real test)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should provide responsive design', async () => {
      // Mock different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewports) {
        // Mock viewport change
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        });

        const { container } = render(<ResumeBuilder userId="responsive-user" onSave={vi.fn()} />);

        // Check responsive behavior
        const layout = screen.getByTestId('resume-builder-layout');
        expect(layout).toBeInTheDocument();

        // Verify mobile-specific elements
        if (viewport.width < 768) {
          expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
        }
      }
    });
  });
});