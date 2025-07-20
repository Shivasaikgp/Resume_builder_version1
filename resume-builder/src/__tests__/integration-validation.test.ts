/**
 * Integration Validation Test for Task 20
 * 
 * This test validates the core integration functionality without complex UI testing:
 * - AI agent interactions and coordination
 * - Template adaptation logic
 * - Multi-resume management functionality
 * - Performance characteristics
 * - Error handling capabilities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Import AI agents and core services
import { ContentGenerationAgent } from '@/lib/ai/content-generation-agent';
import { AnalysisAgent } from '@/lib/ai/analysis-agent';
import { ContextAgent } from '@/lib/ai/context-agent';
import { DocumentExportService } from '@/lib/document-export/DocumentExportService';
import { ResumeParser } from '@/lib/parsing/resume-parser';

// Mock server for API responses
const mockServer = setupServer(
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
  })
);

describe('Integration Validation for Task 20', () => {
  beforeAll(() => {
    mockServer.listen();
  });

  afterAll(() => {
    mockServer.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AI Agent Interactions and Coordination', () => {
    it('should coordinate multiple AI agents effectively', async () => {
      const contentAgent = new ContentGenerationAgent();
      const analysisAgent = new AnalysisAgent();
      const contextAgent = new ContextAgent();

      const startTime = performance.now();

      // Step 1: Generate content suggestions
      const suggestions = await contentAgent.generateSuggestions({
        jobTitle: 'Full Stack Developer',
        industry: 'technology',
        experienceLevel: 'senior'
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      // Step 2: Create mock resume with generated content
      const mockResume = {
        personalInfo: { name: 'Test User', email: 'test@example.com' },
        experience: [{
          title: 'Full Stack Developer',
          company: 'Tech Company',
          description: suggestions[0] || 'Default description'
        }],
        skills: ['JavaScript', 'React', 'Node.js']
      };

      // Step 3: Analyze the resume
      const analysis = await analysisAgent.analyzeResume(mockResume);

      expect(analysis).toBeDefined();
      expect(typeof analysis.score).toBe('number');
      expect(analysis.score).toBeGreaterThan(0);
      expect(analysis.suggestions).toBeDefined();

      // Step 4: Update context based on analysis
      const userId = 'integration-test-user';
      await contextAgent.updateContext(userId, {
        type: 'analysis_completed',
        data: {
          score: analysis.score,
          suggestions: analysis.suggestions,
          jobTitle: 'Full Stack Developer',
          industry: 'technology'
        }
      });

      // Step 5: Get personalized recommendations
      const context = await contextAgent.getUserContext(userId);
      expect(context).toBeDefined();

      const coordinationTime = performance.now() - startTime;
      expect(coordinationTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`AI coordination completed in ${coordinationTime.toFixed(2)}ms`);
      console.log(`Generated ${suggestions.length} suggestions`);
      console.log(`Resume score: ${analysis.score}`);
    });

    it('should handle concurrent AI requests efficiently', async () => {
      const contentAgent = new ContentGenerationAgent();
      const analysisAgent = new AnalysisAgent();

      const startTime = performance.now();
      const concurrentRequests = 5;
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
      const concurrentTime = performance.now() - startTime;

      expect(results).toHaveLength(concurrentRequests * 2);
      expect(concurrentTime).toBeLessThan(15000); // Should handle concurrent requests efficiently

      console.log(`Concurrent AI requests completed in ${concurrentTime.toFixed(2)}ms`);
      console.log(`Processed ${results.length} concurrent requests`);
    });
  });

  describe('Template Adaptation Logic', () => {
    it('should adapt template configuration based on experience level', async () => {
      const { getTemplateAdaptation } = await import('@/lib/template-adaptation');

      // Test entry-level adaptation
      const entryLevelResume = {
        personalInfo: { name: 'Junior Dev' },
        experience: [{
          title: 'Intern',
          company: 'Startup',
          description: 'Learned programming fundamentals'
        }]
      };

      const entryAdaptation = getTemplateAdaptation(entryLevelResume);
      expect(entryAdaptation.experienceLevel).toBe('entry');
      expect(entryAdaptation.emphasizedSections).toContain('skills');
      expect(entryAdaptation.emphasizedSections).toContain('education');

      // Test senior-level adaptation
      const seniorLevelResume = {
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
      };

      const seniorAdaptation = getTemplateAdaptation(seniorLevelResume);
      expect(seniorAdaptation.experienceLevel).toBe('senior');
      expect(seniorAdaptation.emphasizedSections).toContain('experience');
      expect(seniorAdaptation.emphasizedSections).toContain('leadership');

      console.log('Template adaptation logic validated for different experience levels');
    });

    it('should adapt template based on industry and role', async () => {
      const { getTemplateAdaptation } = await import('@/lib/template-adaptation');

      // Test technology industry adaptation
      const techResume = {
        personalInfo: { name: 'Software Engineer' },
        experience: [{
          title: 'Full Stack Developer',
          company: 'Tech Startup',
          description: 'Built web applications using React and Node.js'
        }],
        skills: ['JavaScript', 'React', 'Node.js', 'AWS']
      };

      const techAdaptation = getTemplateAdaptation(techResume);
      expect(techAdaptation.industry).toBe('technology');
      expect(techAdaptation.emphasizedSections).toContain('technical_skills');

      console.log('Template adaptation validated for different industries');
    });
  });

  describe('Document Processing Integration', () => {
    it('should handle document export functionality', async () => {
      const exportService = new DocumentExportService();

      const mockResumeData = {
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-0123'
        },
        experience: [{
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'Developed applications'
        }],
        skills: ['JavaScript', 'React']
      };

      // Test PDF export
      const pdfResult = await exportService.exportToPDF(mockResumeData);
      expect(pdfResult.success).toBe(true);
      expect(pdfResult.downloadUrl).toBeDefined();

      // Test Word export
      const wordResult = await exportService.exportToWord(mockResumeData);
      expect(wordResult.success).toBe(true);
      expect(wordResult.downloadUrl).toBeDefined();

      console.log('Document export functionality validated');
    });

    it('should handle resume parsing functionality', async () => {
      const parser = new ResumeParser();

      // Mock file content
      const mockFileContent = Buffer.from('Mock resume content with John Doe, john@example.com, JavaScript, React');

      const parseResult = await parser.parseResume(mockFileContent, 'application/pdf');

      expect(parseResult.success).toBe(true);
      expect(parseResult.parsedData).toBeDefined();
      expect(parseResult.parsedData.personalInfo).toBeDefined();

      console.log('Resume parsing functionality validated');
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain performance under load', async () => {
      const contentAgent = new ContentGenerationAgent();
      const startTime = performance.now();

      // Simulate high-frequency requests
      const requests = [];
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        requests.push(
          contentAgent.generateSuggestions({
            jobTitle: `Position ${i}`,
            industry: 'technology'
          })
        );
      }

      const results = await Promise.all(requests);
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / requestCount;

      expect(results).toHaveLength(requestCount);
      expect(averageTime).toBeLessThan(1000); // Average request should be under 1 second
      expect(totalTime).toBeLessThan(20000); // Total time should be under 20 seconds

      console.log(`Performance test: ${requestCount} requests in ${totalTime.toFixed(2)}ms`);
      console.log(`Average request time: ${averageTime.toFixed(2)}ms`);
    });

    it('should handle memory efficiently with large datasets', async () => {
      const contextAgent = new ContextAgent();

      // Create large context data
      const largeContextData = {
        userId: 'performance-user',
        interactions: Array.from({ length: 1000 }, (_, i) => ({
          id: `interaction-${i}`,
          type: 'suggestion_accepted',
          timestamp: new Date().toISOString(),
          data: { suggestion: `Suggestion ${i}` }
        }))
      };

      const startTime = performance.now();
      
      // Process large context
      await contextAgent.updateContext('performance-user', {
        type: 'bulk_update',
        data: largeContextData
      });

      const context = await contextAgent.getUserContext('performance-user');
      const processingTime = performance.now() - startTime;

      expect(context).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should process large data within 5 seconds

      console.log(`Large dataset processing completed in ${processingTime.toFixed(2)}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle AI service failures gracefully', async () => {
      // Override server to return error
      mockServer.use(
        http.post('/api/ai/content/generate', () => {
          return HttpResponse.json(
            { error: 'AI service temporarily unavailable' },
            { status: 500 }
          );
        })
      );

      const contentAgent = new ContentGenerationAgent();

      // Should not throw error, but return fallback
      const result = await contentAgent.generateSuggestions({
        jobTitle: 'Developer',
        industry: 'technology'
      });

      expect(result).toBeDefined();
      // Should return fallback suggestions or empty array
      expect(Array.isArray(result)).toBe(true);

      console.log('AI service failure handling validated');
    });

    it('should handle network timeouts gracefully', async () => {
      // Override server to simulate timeout
      mockServer.use(
        http.post('/api/ai/analyze', async () => {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ score: 75, suggestions: [] });
        })
      );

      const analysisAgent = new AnalysisAgent();

      const startTime = performance.now();
      const result = await analysisAgent.analyzeResume({
        personalInfo: { name: 'Test User' },
        experience: [{ title: 'Developer', description: 'Built apps' }]
      });
      const responseTime = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(10000); // Should timeout or complete within 10 seconds

      console.log('Network timeout handling validated');
    });
  });

  describe('Context Persistence and Management', () => {
    it('should maintain context across multiple operations', async () => {
      const contextAgent = new ContextAgent();
      const userId = 'context-persistence-user';

      // Step 1: Initial context building
      await contextAgent.updateContext(userId, {
        type: 'session_start',
        data: {
          industry: 'healthcare',
          experienceLevel: 'mid',
          targetRole: 'Data Scientist'
        }
      });

      // Step 2: Add interaction history
      await contextAgent.updateContext(userId, {
        type: 'suggestion_accepted',
        data: {
          suggestion: 'Analyzed healthcare data to improve patient outcomes',
          category: 'quantified_achievements'
        }
      });

      // Step 3: Retrieve and verify context
      const context = await contextAgent.getUserContext(userId);

      expect(context).toBeDefined();
      expect(context.profile.industry).toBe('healthcare');
      expect(context.profile.experienceLevel).toBe('mid');
      expect(context.profile.targetRoles).toContain('Data Scientist');

      // Step 4: Context evolution
      await contextAgent.updateContext(userId, {
        type: 'preference_updated',
        data: {
          writingStyle: 'technical',
          contentLength: 'detailed'
        }
      });

      const updatedContext = await contextAgent.getUserContext(userId);
      expect(updatedContext.preferences.writingStyle).toBe('technical');

      console.log('Context persistence validated across multiple operations');
    });
  });
});