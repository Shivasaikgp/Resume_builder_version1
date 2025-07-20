import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Import components to test
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { RealTimePreview } from '@/components/resume/RealTimePreview';
import { AIAnalysisPanel } from '@/components/ai/AIAnalysisPanel';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { AuthForm } from '@/components/auth/AuthForm';

// Mock AI services
vi.mock('@/lib/ai/content-generation-agent');
vi.mock('@/lib/ai/analysis-agent');
vi.mock('@/lib/ai/context-agent');

describe('UI Accessibility Tests', () => {
  describe('Resume Builder Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<ResumeBuilder />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(<ResumeBuilder />);
      
      // Check for proper heading structure
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
      
      // Ensure no heading levels are skipped
      const headings = screen.getAllByRole('heading');
      const levels = headings.map(h => parseInt(h.tagName.charAt(1)));
      
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i-1]).toBeLessThanOrEqual(1);
      }
    });

    it('should have proper form labels and associations', () => {
      render(<ResumeBuilder />);
      
      // Check that all form inputs have labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
      
      // Check specific form fields
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ResumeBuilder />);
      
      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'full-name-input');
      
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'email-input');
      
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'phone-input');
    });

    it('should have proper ARIA attributes', () => {
      render(<ResumeBuilder />);
      
      // Check for required ARIA attributes
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label');
      
      // Check for progress indicators
      const progressBar = screen.queryByRole('progressbar');
      if (progressBar) {
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-valuemin');
        expect(progressBar).toHaveAttribute('aria-valuemax');
      }
      
      // Check for live regions
      const liveRegion = screen.queryByRole('status');
      if (liveRegion) {
        expect(liveRegion).toHaveAttribute('aria-live');
      }
    });

    it('should announce AI suggestions to screen readers', async () => {
      const user = userEvent.setup();
      render(<ResumeBuilder />);
      
      const jobTitleInput = screen.getByTestId('job-title-input');
      await user.type(jobTitleInput, 'Software Engineer');
      
      // Wait for AI suggestions
      const suggestionsContainer = await screen.findByTestId('ai-suggestions');
      expect(suggestionsContainer).toHaveAttribute('aria-live', 'polite');
      expect(suggestionsContainer).toHaveAttribute('role', 'region');
      expect(suggestionsContainer).toHaveAccessibleName();
    });

    it('should have proper color contrast', async () => {
      const { container } = render(<ResumeBuilder />);
      
      // This would typically use a color contrast checking library
      // For now, we'll check that text elements have appropriate styling
      const textElements = container.querySelectorAll('p, span, label, button');
      
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Ensure text is not transparent or very light
        expect(styles.color).not.toBe('transparent');
        expect(styles.opacity).not.toBe('0');
      });
    });

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<ResumeBuilder />);
      
      // Check that high contrast styles are applied
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Should have visible borders in high contrast mode
        expect(styles.border).not.toBe('none');
      });
    });
  });

  describe('Real-Time Preview Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const mockResumeData = {
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
        experience: [{ title: 'Developer', company: 'TechCorp' }]
      };
      
      const { container } = render(<RealTimePreview data={mockResumeData} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce preview updates to screen readers', async () => {
      const mockResumeData = {
        personalInfo: { name: 'John Doe' }
      };
      
      const { rerender } = render(<RealTimePreview data={mockResumeData} />);
      
      const previewContainer = screen.getByTestId('resume-preview');
      expect(previewContainer).toHaveAttribute('aria-live', 'polite');
      
      // Update data
      const updatedData = {
        personalInfo: { name: 'Jane Doe' }
      };
      
      rerender(<RealTimePreview data={updatedData} />);
      
      // Should announce the change
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      const mockResumeData = {
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
        experience: [{ title: 'Developer', company: 'TechCorp' }],
        education: [{ degree: 'BS CS', school: 'University' }]
      };
      
      render(<RealTimePreview data={mockResumeData} />);
      
      // Check for proper document structure
      expect(screen.getByRole('document')).toBeInTheDocument();
      
      // Check for sections
      expect(screen.getByRole('region', { name: /personal information/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /experience/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /education/i })).toBeInTheDocument();
    });
  });

  describe('AI Analysis Panel Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const mockAnalysis = {
        score: 85,
        breakdown: { content: 80, formatting: 90 },
        suggestions: [{ type: 'content', message: 'Add metrics' }]
      };
      
      const { container } = render(<AIAnalysisPanel analysis={mockAnalysis} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible score visualization', () => {
      const mockAnalysis = {
        score: 85,
        breakdown: { content: 80, formatting: 90 },
        suggestions: []
      };
      
      render(<AIAnalysisPanel analysis={mockAnalysis} />);
      
      // Score should be accessible to screen readers
      const scoreElement = screen.getByTestId('resume-score');
      expect(scoreElement).toHaveAttribute('aria-label', expect.stringContaining('85'));
      
      // Progress bars should have proper ARIA attributes
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('should announce score changes', async () => {
      const initialAnalysis = { score: 75, breakdown: {}, suggestions: [] };
      const { rerender } = render(<AIAnalysisPanel analysis={initialAnalysis} />);
      
      const scoreContainer = screen.getByTestId('score-container');
      expect(scoreContainer).toHaveAttribute('aria-live', 'polite');
      
      // Update score
      const updatedAnalysis = { score: 85, breakdown: {}, suggestions: [] };
      rerender(<AIAnalysisPanel analysis={updatedAnalysis} />);
      
      // Should announce the score change
      expect(screen.getByText(/85/)).toBeInTheDocument();
    });

    it('should have accessible suggestion list', () => {
      const mockAnalysis = {
        score: 75,
        breakdown: {},
        suggestions: [
          { type: 'content', message: 'Add quantifiable metrics', priority: 'high' },
          { type: 'keywords', message: 'Include industry keywords', priority: 'medium' }
        ]
      };
      
      render(<AIAnalysisPanel analysis={mockAnalysis} />);
      
      // Suggestions should be in a list
      const suggestionsList = screen.getByRole('list', { name: /suggestions/i });
      expect(suggestionsList).toBeInTheDocument();
      
      const suggestions = screen.getAllByRole('listitem');
      expect(suggestions).toHaveLength(2);
      
      // Each suggestion should have proper priority indication
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveAttribute('aria-label', expect.stringMatching(/priority/i));
      });
    });
  });

  describe('Dashboard Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const mockResumes = [
        { id: '1', title: 'Software Engineer Resume', updatedAt: new Date() },
        { id: '2', title: 'Product Manager Resume', updatedAt: new Date() }
      ];
      
      const { container } = render(<Dashboard resumes={mockResumes} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible resume cards', () => {
      const mockResumes = [
        { id: '1', title: 'Software Engineer Resume', updatedAt: new Date() },
        { id: '2', title: 'Product Manager Resume', updatedAt: new Date() }
      ];
      
      render(<Dashboard resumes={mockResumes} />);
      
      // Resume cards should be accessible
      const resumeCards = screen.getAllByRole('article');
      expect(resumeCards).toHaveLength(2);
      
      resumeCards.forEach(card => {
        expect(card).toHaveAccessibleName();
        expect(card).toHaveAttribute('tabindex', '0');
      });
    });

    it('should support keyboard navigation for resume management', async () => {
      const user = userEvent.setup();
      const mockResumes = [
        { id: '1', title: 'Resume 1', updatedAt: new Date() }
      ];
      
      render(<Dashboard resumes={mockResumes} />);
      
      // Should be able to navigate to resume actions
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'create-resume-button');
      
      await user.tab();
      expect(document.activeElement).toHaveAttribute('data-testid', 'resume-card-1');
      
      // Should be able to activate with Enter or Space
      await user.keyboard('{Enter}');
      // Verify navigation or action occurred
    });
  });

  describe('Authentication Form Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<AuthForm type="signin" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form validation messages', async () => {
      const user = userEvent.setup();
      render(<AuthForm type="signin" />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      // Error messages should be associated with inputs
      const emailInput = screen.getByLabelText(/email/i);
      const emailError = screen.getByRole('alert');
      
      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(emailError).toHaveAttribute('id', emailInput.getAttribute('aria-describedby'));
    });

    it('should announce form submission status', async () => {
      const user = userEvent.setup();
      render(<AuthForm type="signin" />);
      
      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      // Status should be announced
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus when opening modals', async () => {
      const user = userEvent.setup();
      render(<ResumeBuilder />);
      
      // Open a modal (e.g., save dialog)
      const saveButton = screen.getByTestId('save-resume-button');
      await user.click(saveButton);
      
      // Focus should move to modal
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();
      
      // Should trap focus within modal
      await user.tab();
      const focusedElement = document.activeElement;
      expect(modal.contains(focusedElement)).toBe(true);
    });

    it('should restore focus when closing modals', async () => {
      const user = userEvent.setup();
      render(<ResumeBuilder />);
      
      const saveButton = screen.getByTestId('save-resume-button');
      await user.click(saveButton);
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      // Focus should return to save button
      expect(saveButton).toHaveFocus();
    });

    it('should skip to main content', async () => {
      const user = userEvent.setup();
      render(<ResumeBuilder />);
      
      // Should have skip link
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      
      await user.click(skipLink);
      
      // Focus should move to main content
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful page titles', () => {
      render(<ResumeBuilder />);
      
      // Page should have descriptive title
      expect(document.title).toMatch(/resume builder/i);
    });

    it('should use landmarks appropriately', () => {
      render(<ResumeBuilder />);
      
      // Should have proper landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main content
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });

    it('should provide context for dynamic content', async () => {
      const user = userEvent.setup();
      render(<ResumeBuilder />);
      
      // Add experience section
      const addButton = screen.getByTestId('add-experience-button');
      await user.click(addButton);
      
      // New section should be announced
      const newSection = screen.getByTestId('experience-section-0');
      expect(newSection).toHaveAttribute('aria-label', expect.stringContaining('Experience section'));
    });
  });

  describe('Mobile Accessibility', () => {
    it('should be accessible on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      
      const { container } = render(<ResumeBuilder />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have appropriate touch targets', () => {
      render(<ResumeBuilder />);
      
      // Buttons should be large enough for touch
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minSize = 44; // 44px minimum touch target
        
        expect(parseInt(styles.minHeight) || parseInt(styles.height)).toBeGreaterThanOrEqual(minSize);
        expect(parseInt(styles.minWidth) || parseInt(styles.width)).toBeGreaterThanOrEqual(minSize);
      });
    });
  });
});