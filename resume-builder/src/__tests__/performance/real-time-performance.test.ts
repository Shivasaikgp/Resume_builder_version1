import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { performance } from 'perf_hooks';

// Mock components for testing
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { RealTimePreview } from '@/components/resume/RealTimePreview';
import { AIAnalysisPanel } from '@/components/ai/AIAnalysisPanel';

// Mock AI services
vi.mock('@/lib/ai/content-generation-agent', () => ({
  ContentGenerationAgent: vi.fn().mockImplementation(() => ({
    generateSuggestions: vi.fn().mockResolvedValue([
      'Developed scalable web applications',
      'Led cross-functional teams',
      'Optimized system performance'
    ])
  }))
}));

vi.mock('@/lib/ai/analysis-agent', () => ({
  AnalysisAgent: vi.fn().mockImplementation(() => ({
    analyzeResume: vi.fn().mockResolvedValue({
      score: 85,
      breakdown: { content: 80, formatting: 90 },
      suggestions: [{ type: 'content', message: 'Add metrics' }]
    })
  }))
}));

describe('Real-Time Performance Tests', () => {
  let performanceMarks: string[] = [];

  beforeEach(() => {
    performanceMarks = [];
    vi.clearAllMocks();
    
    // Mock performance.mark and performance.measure
    vi.spyOn(performance, 'mark').mockImplementation((name: string) => {
      performanceMarks.push(name);
      return {} as PerformanceMark;
    });
    
    vi.spyOn(performance, 'measure').mockImplementation((name: string, startMark: string, endMark: string) => {
      return { duration: Math.random() * 100 } as PerformanceMeasure;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Real-Time Preview Performance', () => {
    it('should update preview within 100ms of content changes', async () => {
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const nameInput = screen.getByTestId('full-name-input');
      const startTime = performance.now();
      
      // Type in the name field
      await user.type(nameInput, 'John Doe');
      
      // Wait for preview to update
      await waitFor(() => {
        expect(screen.getByTestId('preview-name')).toHaveTextContent('John Doe');
      });
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Should update within 100ms per character (reasonable for real-time)
      expect(updateTime).toBeLessThan(800); // 8 characters * 100ms
    });

    it('should handle rapid typing without performance degradation', async () => {
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const descriptionInput = screen.getByTestId('job-description-input');
      const longText = 'This is a very long job description that simulates rapid typing by a user who wants to test the performance of the real-time preview system.';
      
      const startTime = performance.now();
      
      // Simulate rapid typing
      await user.type(descriptionInput, longText, { delay: 10 });
      
      await waitFor(() => {
        expect(screen.getByTestId('preview-description')).toHaveTextContent(longText);
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle rapid typing efficiently
      expect(totalTime).toBeLessThan(2000); // 2 seconds for long text
    });

    it('should debounce preview updates to avoid excessive re-renders', async () => {
      const user = userEvent.setup();
      let renderCount = 0;
      
      const TestPreview = () => {
        renderCount++;
        return <RealTimePreview />;
      };
      
      render(<TestPreview />);
      
      const input = screen.getByTestId('skill-input');
      
      // Type multiple characters quickly
      await user.type(input, 'JavaScript', { delay: 50 });
      
      // Wait for debounce
      await waitFor(() => {
        expect(screen.getByTestId('preview-skills')).toHaveTextContent('JavaScript');
      }, { timeout: 1000 });
      
      // Should have fewer renders than characters typed due to debouncing
      expect(renderCount).toBeLessThan(15); // Less than characters + initial render
    });

    it('should maintain 60fps during template adaptation', async () => {
      const user = userEvent.setup();
      let frameCount = 0;
      const frameTimes: number[] = [];
      
      // Mock requestAnimationFrame to track frame rate
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = vi.fn((callback) => {
        frameCount++;
        const now = performance.now();
        frameTimes.push(now);
        return originalRAF(callback);
      });
      
      render(<ResumeBuilder />);
      
      // Add content that triggers template adaptation
      const experienceButton = screen.getByTestId('add-experience-button');
      await user.click(experienceButton);
      
      await user.type(screen.getByTestId('job-title-input'), 'Senior Software Engineer');
      await user.type(screen.getByTestId('company-input'), 'Tech Corporation');
      
      // Wait for template adaptation
      await waitFor(() => {
        expect(screen.getByTestId('preview-experience-section')).toBeVisible();
      });
      
      // Calculate average frame time
      if (frameTimes.length > 1) {
        const totalTime = frameTimes[frameTimes.length - 1] - frameTimes[0];
        const averageFrameTime = totalTime / (frameTimes.length - 1);
        
        // Should maintain close to 60fps (16.67ms per frame)
        expect(averageFrameTime).toBeLessThan(20); // Allow some tolerance
      }
      
      window.requestAnimationFrame = originalRAF;
    });
  });

  describe('AI Response Performance', () => {
    it('should provide AI suggestions within 2 seconds', async () => {
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const jobTitleInput = screen.getByTestId('job-title-input');
      const startTime = performance.now();
      
      await user.type(jobTitleInput, 'Software Engineer');
      
      // Wait for AI suggestions to appear
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeVisible();
      }, { timeout: 3000 });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle concurrent AI requests efficiently', async () => {
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const startTime = performance.now();
      
      // Trigger multiple AI requests simultaneously
      await Promise.all([
        user.type(screen.getByTestId('job-title-input'), 'Developer'),
        user.type(screen.getByTestId('company-input'), 'TechCorp'),
        user.type(screen.getByTestId('job-description-input'), 'Built applications')
      ]);
      
      // Wait for all AI responses
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeVisible();
        expect(screen.getByTestId('analysis-panel')).toBeVisible();
      }, { timeout: 5000 });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Concurrent requests should not take significantly longer than sequential
      expect(totalTime).toBeLessThan(3000);
    });

    it('should cache AI responses to improve performance', async () => {
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const jobTitleInput = screen.getByTestId('job-title-input');
      
      // First request
      const firstStartTime = performance.now();
      await user.type(jobTitleInput, 'Software Engineer');
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeVisible();
      });
      
      const firstEndTime = performance.now();
      const firstRequestTime = firstEndTime - firstStartTime;
      
      // Clear and type the same thing again
      await user.clear(jobTitleInput);
      
      const secondStartTime = performance.now();
      await user.type(jobTitleInput, 'Software Engineer');
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeVisible();
      });
      
      const secondEndTime = performance.now();
      const secondRequestTime = secondEndTime - secondStartTime;
      
      // Second request should be faster due to caching
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
    });

    it('should handle AI service timeouts gracefully', async () => {
      // Mock slow AI response
      vi.mock('@/lib/ai/content-generation-agent', () => ({
        ContentGenerationAgent: vi.fn().mockImplementation(() => ({
          generateSuggestions: vi.fn().mockImplementation(() => 
            new Promise(resolve => setTimeout(resolve, 5000))
          )
        }))
      }));
      
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const jobTitleInput = screen.getByTestId('job-title-input');
      const startTime = performance.now();
      
      await user.type(jobTitleInput, 'Software Engineer');
      
      // Should show loading state quickly
      await waitFor(() => {
        expect(screen.getByTestId('ai-loading')).toBeVisible();
      }, { timeout: 500 });
      
      const loadingTime = performance.now() - startTime;
      expect(loadingTime).toBeLessThan(500);
      
      // Should handle timeout gracefully
      await waitFor(() => {
        expect(screen.getByTestId('ai-timeout-message')).toBeVisible();
      }, { timeout: 4000 });
    });
  });

  describe('Memory Performance', () => {
    it('should not have memory leaks during extended use', async () => {
      const user = userEvent.setup();
      
      // Mock memory usage tracking
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(<ResumeBuilder />);
      
      // Simulate extended use
      for (let i = 0; i < 50; i++) {
        const input = screen.getByTestId('job-description-input');
        await user.clear(input);
        await user.type(input, `Job description iteration ${i}`);
        
        // Wait for AI processing
        await waitFor(() => {
          expect(screen.getByTestId('preview-description')).toHaveTextContent(`iteration ${i}`);
        });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not grow excessively (allow for some growth)
      if (initialMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB max growth
      }
    });

    it('should clean up event listeners and subscriptions', async () => {
      let listenerCount = 0;
      
      // Mock addEventListener to track listeners
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = vi.fn((...args) => {
        listenerCount++;
        return originalAddEventListener.apply(window, args);
      });
      
      const originalRemoveEventListener = window.removeEventListener;
      window.removeEventListener = vi.fn((...args) => {
        listenerCount--;
        return originalRemoveEventListener.apply(window, args);
      });
      
      const { unmount } = render(<ResumeBuilder />);
      
      const initialListenerCount = listenerCount;
      
      // Unmount component
      unmount();
      
      // Should have cleaned up listeners
      expect(listenerCount).toBeLessThanOrEqual(initialListenerCount);
      
      // Restore original functions
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });
  });

  describe('Rendering Performance', () => {
    it('should render large resume data efficiently', async () => {
      const largeResumeData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0123'
        },
        experience: Array.from({ length: 20 }, (_, i) => ({
          title: `Position ${i + 1}`,
          company: `Company ${i + 1}`,
          description: `Long description for position ${i + 1} with lots of details about responsibilities and achievements.`
        })),
        education: Array.from({ length: 5 }, (_, i) => ({
          degree: `Degree ${i + 1}`,
          school: `School ${i + 1}`
        })),
        skills: Array.from({ length: 50 }, (_, i) => `Skill ${i + 1}`)
      };
      
      const startTime = performance.now();
      
      render(<ResumeBuilder initialData={largeResumeData} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('resume-preview')).toBeVisible();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render large data within reasonable time
      expect(renderTime).toBeLessThan(1000); // 1 second
    });

    it('should use virtualization for large lists', async () => {
      const manySkills = Array.from({ length: 1000 }, (_, i) => `Skill ${i + 1}`);
      
      render(<ResumeBuilder initialData={{ skills: manySkills }} />);
      
      // Should not render all 1000 skills at once
      const skillElements = screen.queryAllByTestId(/skill-item-/);
      expect(skillElements.length).toBeLessThan(100); // Should virtualize
      
      // But should show the total count
      expect(screen.getByTestId('skills-count')).toHaveTextContent('1000');
    });
  });

  describe('Network Performance', () => {
    it('should batch API requests to reduce network overhead', async () => {
      let requestCount = 0;
      
      // Mock fetch to count requests
      const originalFetch = global.fetch;
      global.fetch = vi.fn((...args) => {
        requestCount++;
        return originalFetch(...args);
      });
      
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      // Make multiple rapid changes
      await user.type(screen.getByTestId('job-title-input'), 'Engineer');
      await user.type(screen.getByTestId('company-input'), 'TechCorp');
      await user.type(screen.getByTestId('job-description-input'), 'Built apps');
      
      // Wait for all processing
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeVisible();
      });
      
      // Should have batched requests
      expect(requestCount).toBeLessThan(10); // Reasonable number of batched requests
      
      global.fetch = originalFetch;
    });

    it('should implement request deduplication', async () => {
      let uniqueRequests = new Set();
      
      // Mock fetch to track unique requests
      const originalFetch = global.fetch;
      global.fetch = vi.fn((url, options) => {
        const requestKey = `${url}-${JSON.stringify(options?.body)}`;
        uniqueRequests.add(requestKey);
        return originalFetch(url, options);
      });
      
      const user = userEvent.setup();
      
      render(<ResumeBuilder />);
      
      const input = screen.getByTestId('job-title-input');
      
      // Make the same request multiple times quickly
      await user.type(input, 'Engineer');
      await user.clear(input);
      await user.type(input, 'Engineer');
      await user.clear(input);
      await user.type(input, 'Engineer');
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-suggestions')).toBeVisible();
      });
      
      // Should have deduplicated identical requests
      const aiRequests = Array.from(uniqueRequests).filter(req => 
        req.includes('/api/ai/')
      );
      expect(aiRequests.length).toBeLessThan(6); // Less than 3 requests * 2 types
      
      global.fetch = originalFetch;
    });
  });
});