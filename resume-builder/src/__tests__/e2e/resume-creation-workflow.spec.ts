import { test, expect } from '@playwright/test';

test.describe('Complete Resume Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full resume creation workflow', async ({ page }) => {
    // Step 1: Authentication
    await test.step('User authentication', async () => {
      // Check if user needs to sign in
      const signInButton = page.locator('text=Sign In');
      if (await signInButton.isVisible()) {
        await signInButton.click();
        
        // Fill in test credentials
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'testpassword123');
        await page.click('[data-testid="sign-in-submit"]');
        
        // Wait for successful authentication
        await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      }
    });

    // Step 2: Navigate to resume builder
    await test.step('Navigate to resume builder', async () => {
      await page.click('[data-testid="create-resume-button"]');
      await expect(page.locator('[data-testid="resume-builder"]')).toBeVisible();
    });

    // Step 3: Add Content - Personal Information
    await test.step('Add personal information', async () => {
      await page.fill('[data-testid="full-name-input"]', 'John Doe');
      await page.fill('[data-testid="email-input"]', 'john.doe@example.com');
      await page.fill('[data-testid="phone-input"]', '+1 (555) 123-4567');
      await page.fill('[data-testid="location-input"]', 'San Francisco, CA');
      await page.fill('[data-testid="linkedin-input"]', 'linkedin.com/in/johndoe');
      
      // Verify real-time preview updates
      await expect(page.locator('[data-testid="preview-name"]')).toContainText('John Doe');
      await expect(page.locator('[data-testid="preview-email"]')).toContainText('john.doe@example.com');
    });

    // Step 4: Add Work Experience
    await test.step('Add work experience', async () => {
      await page.click('[data-testid="add-experience-button"]');
      
      await page.fill('[data-testid="job-title-input"]', 'Senior Software Engineer');
      await page.fill('[data-testid="company-input"]', 'Tech Corp');
      await page.fill('[data-testid="start-date-input"]', '2022-01');
      await page.fill('[data-testid="end-date-input"]', '2024-12');
      
      // Add job description
      await page.fill('[data-testid="job-description-input"]', 'Led development of web applications using React and Node.js');
      
      // Wait for AI suggestions to appear
      await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
      
      // Accept an AI suggestion
      const firstSuggestion = page.locator('[data-testid="ai-suggestion"]').first();
      await firstSuggestion.click();
      
      // Verify suggestion was applied
      await expect(page.locator('[data-testid="job-description-input"]')).not.toHaveValue('Led development of web applications using React and Node.js');
    });

    // Step 5: Add Education
    await test.step('Add education', async () => {
      await page.click('[data-testid="add-education-button"]');
      
      await page.fill('[data-testid="degree-input"]', 'Bachelor of Science in Computer Science');
      await page.fill('[data-testid="school-input"]', 'University of California');
      await page.fill('[data-testid="graduation-year-input"]', '2020');
    });

    // Step 6: Add Skills
    await test.step('Add skills', async () => {
      await page.click('[data-testid="add-skill-button"]');
      await page.fill('[data-testid="skill-input"]', 'JavaScript');
      await page.press('[data-testid="skill-input"]', 'Enter');
      
      await page.fill('[data-testid="skill-input"]', 'React');
      await page.press('[data-testid="skill-input"]', 'Enter');
      
      await page.fill('[data-testid="skill-input"]', 'Node.js');
      await page.press('[data-testid="skill-input"]', 'Enter');
      
      // Verify skills appear in preview
      await expect(page.locator('[data-testid="preview-skills"]')).toContainText('JavaScript');
      await expect(page.locator('[data-testid="preview-skills"]')).toContainText('React');
      await expect(page.locator('[data-testid="preview-skills"]')).toContainText('Node.js');
    });

    // Step 7: AI Enhancement - Real-time Analysis
    await test.step('Verify AI analysis and scoring', async () => {
      // Check that analysis panel is visible
      await expect(page.locator('[data-testid="analysis-panel"]')).toBeVisible();
      
      // Verify score is displayed
      await expect(page.locator('[data-testid="resume-score"]')).toBeVisible();
      
      // Check for improvement suggestions
      await expect(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible();
      
      // Apply an improvement suggestion
      const improvementButton = page.locator('[data-testid="apply-suggestion"]').first();
      if (await improvementButton.isVisible()) {
        await improvementButton.click();
        
        // Verify score updates
        await page.waitForTimeout(2000); // Wait for score recalculation
        await expect(page.locator('[data-testid="resume-score"]')).toBeVisible();
      }
    });

    // Step 8: Template Customization
    await test.step('Verify template adaptation', async () => {
      // Check that template has adapted to content
      await expect(page.locator('[data-testid="resume-preview"]')).toBeVisible();
      
      // Verify sections are properly organized
      await expect(page.locator('[data-testid="preview-experience-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-education-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-skills-section"]')).toBeVisible();
    });

    // Step 9: Save Resume
    await test.step('Save resume', async () => {
      await page.click('[data-testid="save-resume-button"]');
      
      // Fill resume title
      await page.fill('[data-testid="resume-title-input"]', 'Software Engineer Resume');
      await page.click('[data-testid="confirm-save-button"]');
      
      // Verify save success
      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();
    });

    // Step 10: Download Resume
    await test.step('Download resume', async () => {
      // Test PDF download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-pdf-button"]');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.pdf');
      
      // Test Word download
      const wordDownloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-word-button"]');
      const wordDownload = await wordDownloadPromise;
      
      // Verify Word download
      expect(wordDownload.suggestedFilename()).toContain('.docx');
    });
  });

  test('should handle resume creation with job description optimization', async ({ page }) => {
    // Navigate to builder
    await page.goto('/builder');
    
    // Add basic information
    await page.fill('[data-testid="full-name-input"]', 'Jane Smith');
    await page.fill('[data-testid="email-input"]', 'jane.smith@example.com');
    
    // Add job description for optimization
    await test.step('Add job description for optimization', async () => {
      await page.click('[data-testid="optimize-for-job-button"]');
      
      const jobDescription = `
        We are looking for a Senior Frontend Developer with experience in React, TypeScript, and modern web technologies.
        The ideal candidate should have experience with state management, testing, and performance optimization.
        Experience with Next.js and GraphQL is a plus.
      `;
      
      await page.fill('[data-testid="job-description-textarea"]', jobDescription);
      await page.click('[data-testid="analyze-job-button"]');
      
      // Wait for analysis
      await expect(page.locator('[data-testid="job-analysis-results"]')).toBeVisible();
      
      // Verify keyword suggestions appear
      await expect(page.locator('[data-testid="keyword-suggestions"]')).toBeVisible();
      
      // Apply keyword suggestions
      await page.click('[data-testid="apply-keywords-button"]');
      
      // Verify optimization score improves
      await expect(page.locator('[data-testid="optimization-score"]')).toBeVisible();
    });
  });

  test('should handle resume import and parsing', async ({ page }) => {
    await page.goto('/builder');
    
    await test.step('Import existing resume', async () => {
      // Click import button
      await page.click('[data-testid="import-resume-button"]');
      
      // Mock file upload (in real test, you'd upload an actual file)
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      
      // For testing purposes, we'll simulate the parsing result
      await page.evaluate(() => {
        // Simulate successful parsing
        window.dispatchEvent(new CustomEvent('resume-parsed', {
          detail: {
            personalInfo: {
              name: 'Imported User',
              email: 'imported@example.com',
              phone: '555-0123'
            },
            experience: [{
              title: 'Software Developer',
              company: 'Previous Company',
              startDate: '2020-01',
              endDate: '2022-12'
            }]
          }
        }));
      });
      
      // Verify parsed data appears in form
      await expect(page.locator('[data-testid="full-name-input"]')).toHaveValue('Imported User');
      await expect(page.locator('[data-testid="email-input"]')).toHaveValue('imported@example.com');
    });
  });
});