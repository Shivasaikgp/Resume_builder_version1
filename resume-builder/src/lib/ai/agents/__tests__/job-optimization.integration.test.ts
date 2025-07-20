import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getJobOptimizationAgent } from '../job-optimization';
import { ResumeData, ExperienceItem } from '../../../../types';

describe('Job Optimization Integration Tests', () => {
  let agent: any;

  const realWorldResume: ResumeData = {
    personalInfo: {
      fullName: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1-555-0199',
      location: 'Seattle, WA',
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      github: 'https://github.com/sarahjohnson'
    },
    sections: [
      {
        type: 'experience',
        title: 'Professional Experience',
        items: [
          {
            title: 'Frontend Developer',
            company: 'TechStart Inc.',
            location: 'Seattle, WA',
            startDate: '2021-03',
            endDate: '2024-01',
            description: [
              'Built responsive web applications using React and JavaScript',
              'Collaborated with design team to implement user interfaces',
              'Optimized application performance resulting in 30% faster load times',
              'Participated in code reviews and agile development processes'
            ]
          } as ExperienceItem,
          {
            title: 'Junior Web Developer',
            company: 'Digital Solutions LLC',
            location: 'Seattle, WA',
            startDate: '2019-06',
            endDate: '2021-03',
            description: [
              'Developed websites using HTML, CSS, and vanilla JavaScript',
              'Maintained existing web applications and fixed bugs',
              'Worked with clients to gather requirements and provide updates'
            ]
          } as ExperienceItem
        ],
        visible: true
      },
      {
        type: 'skills',
        title: 'Technical Skills',
        items: [
          {
            category: 'Frontend Technologies',
            skills: ['React', 'JavaScript', 'HTML5', 'CSS3', 'Sass']
          },
          {
            category: 'Tools & Frameworks',
            skills: ['Git', 'Webpack', 'npm', 'VS Code']
          }
        ],
        visible: true
      },
      {
        type: 'education',
        title: 'Education',
        items: [
          {
            degree: 'Bachelor of Science in Computer Science',
            school: 'University of Washington',
            location: 'Seattle, WA',
            graduationDate: '2019-05'
          }
        ],
        visible: true
      }
    ]
  };

  const realWorldJobDescription = `
    Senior Frontend Engineer - React Specialist
    
    Company: InnovateTech Solutions
    Location: Seattle, WA (Hybrid)
    
    About the Role:
    We are seeking a Senior Frontend Engineer with deep expertise in React and modern JavaScript to join our growing engineering team. You will be responsible for building scalable, high-performance web applications that serve millions of users worldwide.
    
    Key Responsibilities:
    • Design and develop complex user interfaces using React, TypeScript, and modern CSS
    • Lead frontend architecture decisions and establish best practices
    • Collaborate with product managers, designers, and backend engineers
    • Mentor junior developers and conduct technical interviews
    • Optimize application performance and ensure excellent user experience
    • Implement automated testing strategies using Jest and React Testing Library
    • Work with state management solutions like Redux or Zustand
    • Integrate with RESTful APIs and GraphQL endpoints
    
    Required Qualifications:
    • 5+ years of professional frontend development experience
    • Expert-level proficiency in React and JavaScript/TypeScript
    • Strong understanding of HTML5, CSS3, and responsive design principles
    • Experience with modern build tools (Webpack, Vite) and package managers
    • Proficiency with version control systems (Git) and collaborative workflows
    • Experience with testing frameworks and test-driven development
    • Knowledge of web performance optimization techniques
    • Bachelor's degree in Computer Science or equivalent experience
    
    Preferred Qualifications:
    • Experience with Next.js and server-side rendering
    • Knowledge of GraphQL and Apollo Client
    • Familiarity with cloud platforms (AWS, Azure, GCP)
    • Experience with CI/CD pipelines and DevOps practices
    • Leadership experience and ability to mentor team members
    • Contributions to open-source projects
    
    What We Offer:
    • Competitive salary range: $120,000 - $160,000
    • Comprehensive health, dental, and vision insurance
    • 401(k) with company matching
    • Flexible work arrangements and unlimited PTO
    • Professional development budget and conference attendance
    • Stock options and performance bonuses
  `;

  beforeAll(() => {
    agent = getJobOptimizationAgent();
  });

  describe('Real-world job analysis', () => {
    it('should extract comprehensive job information', async () => {
      const analysis = await agent.analyzeJobDescription(realWorldJobDescription);
      
      expect(analysis).toBeDefined();
      expect(analysis.keywords).toBeDefined();
      expect(analysis.requirements).toBeDefined();
      expect(analysis.skills).toBeDefined();
      
      // Should extract technical keywords
      expect(analysis.keywords.technical).toContain('React');
      expect(analysis.keywords.technical).toContain('TypeScript');
      expect(analysis.keywords.technical).toContain('JavaScript');
      
      // Should identify experience level
      expect(analysis.requirements.experienceLevel).toBe('senior');
      expect(analysis.requirements.yearsRequired).toBe(5);
      
      // Should extract tools and technologies
      expect(analysis.keywords.tools).toContain('Jest');
      expect(analysis.keywords.tools).toContain('Redux');
    }, 10000);

    it('should identify skill gaps and matches', async () => {
      const jobAnalysis = await agent.analyzeJobDescription(realWorldJobDescription);
      const matchResults = agent.matchSkillsAndExperience(realWorldResume, jobAnalysis);
      
      expect(matchResults).toBeDefined();
      expect(matchResults.skillMatches).toBeDefined();
      expect(matchResults.experienceMatches).toBeDefined();
      
      // Should find React as a matching skill
      const reactMatch = matchResults.skillMatches.find(s => 
        s.skill.toLowerCase().includes('react')
      );
      expect(reactMatch?.found).toBe(true);
      
      // Should identify missing skills like TypeScript
      const missingSkills = matchResults.skillMatches.filter(s => !s.found);
      expect(missingSkills.length).toBeGreaterThan(0);
      
      // Overall match should be reasonable but not perfect
      expect(matchResults.overallMatch).toBeGreaterThan(30);
      expect(matchResults.overallMatch).toBeLessThan(90);
    }, 10000);
  });

  describe('Resume optimization for real job', () => {
    it('should provide actionable optimization suggestions', async () => {
      const optimization = await agent.optimizeResumeForJob(
        realWorldResume,
        realWorldJobDescription
      );
      
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThan(0);
      expect(optimization.keywordOptimization).toBeDefined();
      expect(optimization.contentEnhancements).toBeDefined();
      expect(optimization.priorityActions).toBeDefined();
      
      // Should suggest adding missing keywords
      const keywordSuggestions = optimization.keywordOptimization;
      expect(keywordSuggestions.length).toBeGreaterThan(0);
      
      // Should find TypeScript as a missing critical keyword
      const typescriptSuggestion = keywordSuggestions.find(k => 
        k.keyword.toLowerCase().includes('typescript')
      );
      expect(typescriptSuggestion).toBeDefined();
      expect(typescriptSuggestion?.importance).toBe('critical');
      
      // Should provide content enhancement suggestions
      const contentSuggestions = optimization.contentEnhancements;
      expect(contentSuggestions.length).toBeGreaterThan(0);
      
      // Should have high-impact suggestions
      const highImpactSuggestions = contentSuggestions.filter(s => s.impact === 'high');
      expect(highImpactSuggestions.length).toBeGreaterThan(0);
      
      // Should prioritize actions logically
      const priorityActions = optimization.priorityActions;
      expect(priorityActions.length).toBeGreaterThan(0);
      expect(priorityActions[0].order).toBe(1);
    }, 15000);

    it('should generate job-specific content suggestions', async () => {
      const userExperience = realWorldResume.sections
        .find(s => s.type === 'experience')
        ?.items as ExperienceItem[];
      
      const contentSuggestions = await agent.generateJobSpecificContent(
        'Senior Frontend Engineer',
        'InnovateTech Solutions',
        realWorldJobDescription,
        userExperience || []
      );
      
      expect(contentSuggestions).toBeDefined();
      expect(Array.isArray(contentSuggestions)).toBe(true);
      
      // Should provide relevant suggestions for the role
      if (contentSuggestions.length > 0) {
        const suggestions = contentSuggestions;
        expect(suggestions.some(s => s.section === 'experience')).toBe(true);
        
        // Should have actionable suggestions
        suggestions.forEach(suggestion => {
          expect(suggestion.suggestion).toBeDefined();
          expect(suggestion.reasoning).toBeDefined();
          expect(['high', 'medium', 'low']).toContain(suggestion.impact);
        });
      }
    }, 10000);
  });

  describe('Performance and accuracy validation', () => {
    it('should handle multiple optimization requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(3).fill(null).map(() =>
        agent.optimizeResumeForJob(realWorldResume, realWorldJobDescription)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (allowing for AI calls)
      expect(duration).toBeLessThan(30000); // 30 seconds max
      
      // All results should be valid
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.matchScore).toBeGreaterThanOrEqual(0);
        expect(result.matchScore).toBeLessThanOrEqual(100);
      });
    }, 35000);

    it('should provide consistent results for same inputs', async () => {
      const result1 = await agent.optimizeResumeForJob(realWorldResume, realWorldJobDescription);
      const result2 = await agent.optimizeResumeForJob(realWorldResume, realWorldJobDescription);
      
      // Match scores should be similar (allowing for some AI variability)
      const scoreDifference = Math.abs(result1.matchScore - result2.matchScore);
      expect(scoreDifference).toBeLessThan(20);
      
      // Should have similar number of suggestions
      const suggestionDifference = Math.abs(
        result1.keywordOptimization.length - result2.keywordOptimization.length
      );
      expect(suggestionDifference).toBeLessThan(5);
    }, 20000);
  });

  describe('Edge cases and error handling', () => {
    it('should handle very short job descriptions', async () => {
      const shortJobDescription = 'React developer needed. Must know JavaScript.';
      
      const analysis = await agent.analyzeJobDescription(shortJobDescription);
      expect(analysis).toBeDefined();
      
      const optimization = await agent.optimizeResumeForJob(realWorldResume, shortJobDescription);
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle job descriptions with unusual formatting', async () => {
      const weirdJobDescription = `
        !!!URGENT!!! React Developer Needed NOW!!!
        
        We need someone who knows:
        - React (MUST HAVE!!!)
        - JavaScript/TypeScript
        - CSS & HTML
        
        Experience: 3+ years minimum
        
        Apply today!!!
      `;
      
      const analysis = await agent.analyzeJobDescription(weirdJobDescription);
      expect(analysis).toBeDefined();
      expect(analysis.keywords.technical).toContain('React');
      
      const optimization = await agent.optimizeResumeForJob(realWorldResume, weirdJobDescription);
      expect(optimization).toBeDefined();
    });

    it('should handle resumes with minimal information', async () => {
      const minimalResume: ResumeData = {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        sections: [
          {
            type: 'experience',
            title: 'Experience',
            items: [
              {
                title: 'Developer',
                company: 'Company',
                startDate: '2020-01',
                description: ['Wrote code']
              } as ExperienceItem
            ],
            visible: true
          }
        ]
      };
      
      const optimization = await agent.optimizeResumeForJob(minimalResume, realWorldJobDescription);
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
      expect(optimization.keywordOptimization.length).toBeGreaterThan(0);
    });
  });
});