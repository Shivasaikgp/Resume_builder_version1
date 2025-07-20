import { test, expect } from '@playwright/test';

// Test data for consistent visual testing
const mockResumeData = {
  personalInfo: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/johndoe',
    website: 'johndoe.dev'
  },
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corporation',
      location: 'San Francisco, CA',
      startDate: '2022-01',
      endDate: '2024-12',
      description: 'Led development of scalable web applications serving 100,000+ users. Implemented microservices architecture resulting in 40% performance improvement. Mentored team of 5 junior developers and established code review processes.'
    },
    {
      title: 'Software Engineer',
      company: 'StartupCo',
      location: 'San Francisco, CA',
      startDate: '2020-06',
      endDate: '2021-12',
      description: 'Developed full-stack web applications using React and Node.js. Built RESTful APIs and integrated third-party services. Collaborated with design team to implement responsive user interfaces.'
    }
  ],
  education: [
    {
      degree: 'Bachelor of Science in Computer Science',
      school: 'University of California, Berkeley',
      location: 'Berkeley, CA',
      graduationDate: '2020-05',
      gpa: '3.8'
    }
  ],
  skills: [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile', 'TDD'
  ],
  projects: [
    {
      name: 'E-commerce Platform',
      description: 'Built a full-stack e-commerce platform with React, Node.js, and PostgreSQL',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe API'],
      url: 'https://github.com/johndoe/ecommerce'
    }
  ]
};

test.describe('Template Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Navigate to resume builder
    await page.goto('/builder');
    
    // Mock API responses for consistent testing
    await page.route('/api/ai/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: ['Sample suggestion'],
          score: 85,
          analysis: { content: 80, formatting: 90 }
        })
      });
    });
  });

  test('should render basic template correctly', async ({ page }) => {
    // Fill in basic information
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    await page.fill('[data-testid="phone-input"]', mockResumeData.personalInfo.phone);
    
    // Wait for preview to update
    await page.waitForSelector('[data-testid="resume-preview"]');
    
    // Take screenshot of the basic template
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('basic-template.png');
  });

  test('should render template with experience section', async ({ page }) => {
    // Fill personal info
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    
    // Add experience
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input"]', mockResumeData.experience[0].title);
    await page.fill('[data-testid="company-input"]', mockResumeData.experience[0].company);
    await page.fill('[data-testid="job-description-input"]', mockResumeData.experience[0].description);
    
    // Wait for template adaptation
    await page.waitForSelector('[data-testid="preview-experience-section"]');
    
    // Take screenshot
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-with-experience.png');
  });

  test('should render template with multiple experience entries', async ({ page }) => {
    // Fill personal info
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    
    // Add first experience
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', mockResumeData.experience[0].title);
    await page.fill('[data-testid="company-input-0"]', mockResumeData.experience[0].company);
    await page.fill('[data-testid="job-description-input-0"]', mockResumeData.experience[0].description);
    
    // Add second experience
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-1"]', mockResumeData.experience[1].title);
    await page.fill('[data-testid="company-input-1"]', mockResumeData.experience[1].company);
    await page.fill('[data-testid="job-description-input-1"]', mockResumeData.experience[1].description);
    
    // Wait for template adaptation
    await page.waitForSelector('[data-testid="preview-experience-section"]');
    
    // Take screenshot
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-multiple-experience.png');
  });

  test('should render complete resume template', async ({ page }) => {
    // Fill all sections with mock data
    
    // Personal Info
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    await page.fill('[data-testid="phone-input"]', mockResumeData.personalInfo.phone);
    await page.fill('[data-testid="location-input"]', mockResumeData.personalInfo.location);
    await page.fill('[data-testid="linkedin-input"]', mockResumeData.personalInfo.linkedin);
    
    // Experience
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', mockResumeData.experience[0].title);
    await page.fill('[data-testid="company-input-0"]', mockResumeData.experience[0].company);
    await page.fill('[data-testid="job-description-input-0"]', mockResumeData.experience[0].description);
    
    // Education
    await page.click('[data-testid="add-education-button"]');
    await page.fill('[data-testid="degree-input-0"]', mockResumeData.education[0].degree);
    await page.fill('[data-testid="school-input-0"]', mockResumeData.education[0].school);
    
    // Skills
    for (const skill of mockResumeData.skills.slice(0, 6)) {
      await page.fill('[data-testid="skill-input"]', skill);
      await page.press('[data-testid="skill-input"]', 'Enter');
    }
    
    // Wait for all sections to render
    await page.waitForSelector('[data-testid="preview-experience-section"]');
    await page.waitForSelector('[data-testid="preview-education-section"]');
    await page.waitForSelector('[data-testid="preview-skills-section"]');
    
    // Take screenshot of complete resume
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('complete-resume-template.png');
  });

  test('should adapt template for entry-level candidate', async ({ page }) => {
    // Fill info for entry-level candidate
    await page.fill('[data-testid="full-name-input"]', 'Jane Smith');
    await page.fill('[data-testid="email-input"]', 'jane.smith@example.com');
    
    // Add minimal experience (internship)
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', 'Software Engineering Intern');
    await page.fill('[data-testid="company-input-0"]', 'TechCorp');
    await page.fill('[data-testid="job-description-input-0"]', 'Assisted in developing web applications and learned modern development practices.');
    
    // Add education (recent graduate)
    await page.click('[data-testid="add-education-button"]');
    await page.fill('[data-testid="degree-input-0"]', 'Bachelor of Science in Computer Science');
    await page.fill('[data-testid="school-input-0"]', 'State University');
    
    // Add projects section (important for entry-level)
    await page.click('[data-testid="add-projects-button"]');
    await page.fill('[data-testid="project-name-input-0"]', 'Personal Portfolio Website');
    await page.fill('[data-testid="project-description-input-0"]', 'Built responsive portfolio website using React and deployed on Vercel');
    
    // Wait for template adaptation
    await page.waitForTimeout(1000);
    
    // Take screenshot - should show education and projects prominently
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('entry-level-template.png');
  });

  test('should adapt template for senior-level candidate', async ({ page }) => {
    // Fill info for senior-level candidate
    await page.fill('[data-testid="full-name-input"]', 'Michael Johnson');
    await page.fill('[data-testid="email-input"]', 'michael.johnson@example.com');
    
    // Add multiple senior positions
    const seniorExperience = [
      {
        title: 'Engineering Manager',
        company: 'BigTech Corp',
        description: 'Led engineering team of 12 developers. Drove technical strategy and architecture decisions. Delivered 5 major product releases.'
      },
      {
        title: 'Senior Software Architect',
        company: 'Enterprise Solutions Inc',
        description: 'Designed and implemented microservices architecture. Reduced system latency by 60%. Mentored senior engineers.'
      },
      {
        title: 'Technical Lead',
        company: 'Innovation Labs',
        description: 'Led development of AI-powered analytics platform. Managed cross-functional team of 8. Established engineering best practices.'
      }
    ];
    
    for (let i = 0; i < seniorExperience.length; i++) {
      await page.click('[data-testid="add-experience-button"]');
      await page.fill(`[data-testid="job-title-input-${i}"]`, seniorExperience[i].title);
      await page.fill(`[data-testid="company-input-${i}"]`, seniorExperience[i].company);
      await page.fill(`[data-testid="job-description-input-${i}"]`, seniorExperience[i].description);
    }
    
    // Add leadership skills
    const leadershipSkills = ['Team Leadership', 'Strategic Planning', 'System Architecture', 'Mentoring'];
    for (const skill of leadershipSkills) {
      await page.fill('[data-testid="skill-input"]', skill);
      await page.press('[data-testid="skill-input"]', 'Enter');
    }
    
    // Wait for template adaptation
    await page.waitForTimeout(1000);
    
    // Take screenshot - should emphasize leadership and experience
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('senior-level-template.png');
  });

  test('should render template in different viewport sizes', async ({ page }) => {
    // Fill basic resume data
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', mockResumeData.experience[0].title);
    await page.fill('[data-testid="company-input-0"]', mockResumeData.experience[0].company);
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-desktop.png');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-tablet.png');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-mobile.png');
  });

  test('should render template with different content lengths', async ({ page }) => {
    // Test with minimal content
    await page.fill('[data-testid="full-name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-minimal-content.png');
    
    // Test with maximum content
    await page.fill('[data-testid="phone-input"]', mockResumeData.personalInfo.phone);
    await page.fill('[data-testid="location-input"]', mockResumeData.personalInfo.location);
    await page.fill('[data-testid="linkedin-input"]', mockResumeData.personalInfo.linkedin);
    await page.fill('[data-testid="website-input"]', mockResumeData.personalInfo.website);
    
    // Add multiple experiences with long descriptions
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="add-experience-button"]');
      await page.fill(`[data-testid="job-title-input-${i}"]`, `Position ${i + 1}`);
      await page.fill(`[data-testid="company-input-${i}"]`, `Company ${i + 1}`);
      await page.fill(`[data-testid="job-description-input-${i}"]`, 
        'This is a very long job description that contains multiple sentences and detailed information about responsibilities, achievements, and impact. It includes specific metrics and quantifiable results to demonstrate value. The description also mentions various technologies, methodologies, and collaborative efforts that showcase the breadth of experience and expertise in the role.'
      );
    }
    
    // Add many skills
    const manySkills = [
      'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java',
      'C++', 'Go', 'Rust', 'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'Docker', 'Kubernetes'
    ];
    
    for (const skill of manySkills) {
      await page.fill('[data-testid="skill-input"]', skill);
      await page.press('[data-testid="skill-input"]', 'Enter');
    }
    
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-maximum-content.png');
  });

  test('should render template with special characters and formatting', async ({ page }) => {
    // Test with special characters and formatting
    await page.fill('[data-testid="full-name-input"]', 'José María García-López');
    await page.fill('[data-testid="email-input"]', 'josé.garcía@example.com');
    await page.fill('[data-testid="phone-input"]', '+34 123 456 789');
    await page.fill('[data-testid="location-input"]', 'Madrid, España');
    
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', 'Développeur Senior & Architecte');
    await page.fill('[data-testid="company-input-0"]', 'Société Française S.A.R.L.');
    await page.fill('[data-testid="job-description-input-0"]', 
      'Développement d\'applications web avec React & Node.js. Amélioration des performances de 50%. Collaboration avec équipes internationales (US, UK, DE).'
    );
    
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-special-characters.png');
  });

  test('should render template with dark mode', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Fill basic data
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', mockResumeData.experience[0].title);
    await page.fill('[data-testid="company-input-0"]', mockResumeData.experience[0].company);
    
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-dark-mode.png');
  });

  test('should render template with high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    
    // Fill basic data
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="email-input"]', mockResumeData.personalInfo.email);
    
    await page.click('[data-testid="add-experience-button"]');
    await page.fill('[data-testid="job-title-input-0"]', mockResumeData.experience[0].title);
    await page.fill('[data-testid="company-input-0"]', mockResumeData.experience[0].company);
    
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-high-contrast.png');
  });

  test('should render template during loading states', async ({ page }) => {
    // Mock slow AI response to capture loading state
    await page.route('/api/ai/**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ suggestions: ['Loading complete'] })
        });
      }, 2000);
    });
    
    await page.fill('[data-testid="full-name-input"]', mockResumeData.personalInfo.name);
    await page.fill('[data-testid="job-title-input"]', 'Software Engineer');
    
    // Capture loading state
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-loading-state.png');
    
    // Wait for loading to complete
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="resume-preview"]')).toHaveScreenshot('template-loaded-state.png');
  });
});