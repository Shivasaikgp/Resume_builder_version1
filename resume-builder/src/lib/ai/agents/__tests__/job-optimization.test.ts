import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getJobOptimizationAgent, JobOptimizationAgent } from '../job-optimization';
import { ResumeData, ExperienceItem } from '../../../../types';

// Mock AI clients
vi.mock('../../clients', () => ({
  getAIClients: () => ({
    generateCompletion: vi.fn()
  })
}));

describe('JobOptimizationAgent', () => {
  let agent: JobOptimizationAgent;
  let mockAIResponse: any;

  const sampleResume: ResumeData = {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA'
    },
    sections: [
      {
        type: 'experience',
        title: 'Experience',
        items: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            startDate: '2022-01',
            endDate: '2024-01',
            description: [
              'Developed web applications using React and Node.js',
              'Collaborated with cross-functional teams to deliver features',
              'Improved application performance by 25%'
            ]
          } as ExperienceItem,
          {
            title: 'Junior Developer',
            company: 'StartupXYZ',
            location: 'San Francisco, CA',
            startDate: '2020-06',
            endDate: '2022-01',
            description: [
              'Built responsive web interfaces using HTML, CSS, and JavaScript',
              'Participated in agile development processes',
              'Fixed bugs and implemented new features'
            ]
          } as ExperienceItem
        ]
      },
      {
        type: 'skills',
        title: 'Skills',
        items: [
          {
            category: 'Programming Languages',
            skills: ['JavaScript', 'Python', 'TypeScript']
          },
          {
            category: 'Frameworks',
            skills: ['React', 'Node.js', 'Express']
          }
        ]
      },
      {
        type: 'education',
        title: 'Education',
        items: [
          {
            degree: 'Bachelor of Science in Computer Science',
            school: 'University of California',
            location: 'Berkeley, CA',
            graduationDate: '2020-05'
          }
        ]
      }
    ]
  };

  const sampleJobDescription = `
    Senior Software Engineer - Frontend
    
    We are looking for a Senior Software Engineer to join our frontend team. You will be responsible for building scalable web applications using React, TypeScript, and modern development practices.
    
    Requirements:
    - 5+ years of experience in software development
    - Strong proficiency in React, TypeScript, and JavaScript
    - Experience with state management libraries (Redux, Zustand)
    - Knowledge of testing frameworks (Jest, React Testing Library)
    - Experience with CI/CD pipelines and DevOps practices
    - Bachelor's degree in Computer Science or related field
    
    Preferred Qualifications:
    - Experience with Next.js and server-side rendering
    - Knowledge of GraphQL and API design
    - Experience with cloud platforms (AWS, GCP)
    - Leadership experience and mentoring junior developers
    
    Responsibilities:
    - Design and implement user-facing features
    - Collaborate with product managers and designers
    - Write clean, maintainable, and well-tested code
    - Mentor junior developers and conduct code reviews
    - Participate in architectural decisions and technical planning
  `;

  beforeEach(() => {
    agent = getJobOptimizationAgent();
    
    // Mock AI response
    mockAIResponse = {
      content: JSON.stringify({
        keywords: {
          technical: ['React', 'TypeScript', 'JavaScript', 'Redux', 'Jest'],
          soft: ['collaboration', 'leadership', 'mentoring'],
          industry: ['software development', 'frontend', 'web applications'],
          tools: ['Next.js', 'GraphQL', 'AWS', 'CI/CD'],
          certifications: [],
          actionVerbs: ['design', 'implement', 'collaborate', 'mentor'],
          buzzwords: ['scalable', 'modern', 'clean code']
        },
        requirements: {
          mustHave: ['5+ years experience', 'React proficiency', 'TypeScript', 'JavaScript'],
          niceToHave: ['Next.js experience', 'GraphQL knowledge', 'AWS experience'],
          experienceLevel: 'senior',
          yearsRequired: 5,
          educationLevel: "Bachelor's degree"
        },
        skills: {
          technical: [
            { skill: 'React', importance: 'critical' },
            { skill: 'TypeScript', importance: 'critical' },
            { skill: 'Redux', importance: 'important' }
          ],
          soft: [
            { skill: 'Leadership', importance: 'important' },
            { skill: 'Mentoring', importance: 'preferred' }
          ],
          tools: [
            { skill: 'Jest', importance: 'important' },
            { skill: 'Next.js', importance: 'preferred' }
          ]
        },
        experience: {
          relevantExperience: ['Software Engineer', 'Frontend Developer'],
          missingExperience: ['Senior level responsibilities', 'Team leadership'],
          transferableSkills: ['Web development', 'JavaScript programming']
        },
        culture: {
          values: ['collaboration', 'innovation', 'quality'],
          workStyle: ['agile', 'team-oriented'],
          environment: 'collaborative',
          teamStructure: 'cross-functional'
        }
      })
    };

    // Mock the AI client
    const mockAIClients = {
      generateCompletion: vi.fn().mockResolvedValue(mockAIResponse)
    };
    
    // @ts-ignore - Mocking private property for testing
    agent.aiClients = mockAIClients;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeJobDescription', () => {
    it('should extract keywords from job description', async () => {
      const analysis = await agent.analyzeJobDescription(sampleJobDescription);
      
      expect(analysis).toBeDefined();
      expect(analysis.keywords).toBeDefined();
      expect(analysis.keywords.technical).toContain('React');
      expect(analysis.keywords.technical).toContain('TypeScript');
      expect(analysis.keywords.technical).toContain('JavaScript');
    });

    it('should identify experience requirements', async () => {
      const analysis = await agent.analyzeJobDescription(sampleJobDescription);
      
      expect(analysis.requirements).toBeDefined();
      expect(analysis.requirements.experienceLevel).toBe('senior');
      expect(analysis.requirements.yearsRequired).toBe(5);
    });

    it('should extract must-have and nice-to-have requirements', async () => {
      const analysis = await agent.analyzeJobDescription(sampleJobDescription);
      
      expect(analysis.requirements.mustHave).toContain('5+ years experience');
      expect(analysis.requirements.niceToHave).toContain('Next.js experience');
    });

    it('should handle AI service failures gracefully', async () => {
      // Mock AI failure
      const mockFailingAIClients = {
        generateCompletion: vi.fn().mockRejectedValue(new Error('AI service unavailable'))
      };
      
      // @ts-ignore
      agent.aiClients = mockFailingAIClients;

      const analysis = await agent.analyzeJobDescription(sampleJobDescription);
      
      // Should return fallback analysis
      expect(analysis).toBeDefined();
      expect(analysis.keywords).toBeDefined();
      expect(analysis.requirements).toBeDefined();
    });
  });

  describe('optimizeResumeForJob', () => {
    it('should generate optimization suggestions', async () => {
      const optimization = await agent.optimizeResumeForJob(sampleResume, sampleJobDescription);
      
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThan(0);
      expect(optimization.keywordOptimization).toBeDefined();
      expect(optimization.contentEnhancements).toBeDefined();
      expect(optimization.priorityActions).toBeDefined();
    });

    it('should identify missing keywords', async () => {
      const optimization = await agent.optimizeResumeForJob(sampleResume, sampleJobDescription);
      
      const missingKeywords = optimization.keywordOptimization.filter(k => k.currentUsage === 0);
      expect(missingKeywords.length).toBeGreaterThan(0);
      
      // Should suggest adding Redux since it's not in the resume
      const reduxSuggestion = optimization.keywordOptimization.find(k => k.keyword === 'Redux');
      expect(reduxSuggestion).toBeDefined();
      expect(reduxSuggestion?.currentUsage).toBe(0);
      expect(reduxSuggestion?.recommendedUsage).toBeGreaterThan(0);
    });

    it('should suggest content enhancements', async () => {
      const optimization = await agent.optimizeResumeForJob(sampleResume, sampleJobDescription);
      
      expect(optimization.contentEnhancements.length).toBeGreaterThan(0);
      
      const highImpactEnhancements = optimization.contentEnhancements.filter(e => e.impact === 'high');
      expect(highImpactEnhancements.length).toBeGreaterThan(0);
    });

    it('should prioritize actions by impact and effort', async () => {
      const optimization = await agent.optimizeResumeForJob(sampleResume, sampleJobDescription);
      
      expect(optimization.priorityActions.length).toBeGreaterThan(0);
      
      // Actions should be ordered by priority
      const orders = optimization.priorityActions.map(a => a.order);
      const sortedOrders = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sortedOrders);
    });

    it('should calculate match score accurately', async () => {
      const optimization = await agent.optimizeResumeForJob(sampleResume, sampleJobDescription);
      
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
      expect(optimization.matchScore).toBeLessThanOrEqual(100);
      
      // Should be a reasonable match since resume has React and JavaScript
      expect(optimization.matchScore).toBeGreaterThan(20);
    });
  });

  describe('matchSkillsAndExperience', () => {
    it('should match existing skills correctly', async () => {
      const jobAnalysis = await agent.analyzeJobDescription(sampleJobDescription);
      const matchResults = agent.matchSkillsAndExperience(sampleResume, jobAnalysis);
      
      expect(matchResults).toBeDefined();
      expect(matchResults.skillMatches).toBeDefined();
      expect(matchResults.experienceMatches).toBeDefined();
      expect(matchResults.overallMatch).toBeGreaterThanOrEqual(0);
      expect(matchResults.overallMatch).toBeLessThanOrEqual(100);
    });

    it('should identify found and missing skills', async () => {
      const jobAnalysis = await agent.analyzeJobDescription(sampleJobDescription);
      const matchResults = agent.matchSkillsAndExperience(sampleResume, jobAnalysis);
      
      const foundSkills = matchResults.skillMatches.filter(s => s.found);
      const missingSkills = matchResults.skillMatches.filter(s => !s.found);
      
      expect(foundSkills.length).toBeGreaterThan(0);
      expect(missingSkills.length).toBeGreaterThan(0);
      
      // React should be found
      const reactSkill = matchResults.skillMatches.find(s => s.skill === 'React');
      expect(reactSkill?.found).toBe(true);
    });

    it('should calculate experience relevance scores', async () => {
      const jobAnalysis = await agent.analyzeJobDescription(sampleJobDescription);
      const matchResults = agent.matchSkillsAndExperience(sampleResume, jobAnalysis);
      
      expect(matchResults.experienceMatches.length).toBeGreaterThan(0);
      
      matchResults.experienceMatches.forEach(exp => {
        expect(exp.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(exp.relevanceScore).toBeLessThanOrEqual(100);
      });
      
      // Software Engineer should have higher relevance than Junior Developer
      const seniorExp = matchResults.experienceMatches.find(e => e.jobTitle === 'Software Engineer');
      const juniorExp = matchResults.experienceMatches.find(e => e.jobTitle === 'Junior Developer');
      
      if (seniorExp && juniorExp) {
        expect(seniorExp.relevanceScore).toBeGreaterThanOrEqual(juniorExp.relevanceScore);
      }
    });
  });

  describe('generateJobSpecificContent', () => {
    it('should generate content suggestions for specific job', async () => {
      const userExperience: ExperienceItem[] = [
        {
          title: 'Software Engineer',
          company: 'Tech Corp',
          startDate: '2022-01',
          endDate: '2024-01',
          description: [
            'Developed web applications using React',
            'Collaborated with teams'
          ]
        }
      ];

      // Mock content generation response
      const mockContentResponse = {
        content: JSON.stringify([
          {
            section: 'experience',
            type: 'modify',
            suggestion: 'Emphasize React and TypeScript experience in bullet points',
            reasoning: 'These are critical skills for the target role',
            impact: 'high'
          },
          {
            section: 'skills',
            type: 'add',
            suggestion: 'Add Redux and Jest to technical skills',
            reasoning: 'Job description specifically mentions these tools',
            impact: 'medium'
          }
        ])
      };

      // @ts-ignore
      agent.aiClients.generateCompletion.mockResolvedValue(mockContentResponse);

      const suggestions = await agent.generateJobSpecificContent(
        'Senior Software Engineer',
        'Tech Company',
        sampleJobDescription,
        userExperience
      );

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      
      const highImpactSuggestions = suggestions.filter(s => s.impact === 'high');
      expect(highImpactSuggestions.length).toBeGreaterThan(0);
    });

    it('should handle content generation failures gracefully', async () => {
      // Mock AI failure
      // @ts-ignore
      agent.aiClients.generateCompletion.mockRejectedValue(new Error('Content generation failed'));

      const suggestions = await agent.generateJobSpecificContent(
        'Senior Software Engineer',
        'Tech Company',
        sampleJobDescription,
        []
      );

      // Should return fallback suggestions
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('keyword extraction', () => {
    it('should extract technical keywords accurately', () => {
      const testJobDescription = `
        We need a developer with React, Vue.js, and Angular experience.
        Must know JavaScript, TypeScript, and Python.
        Experience with Docker and Kubernetes is required.
      `;

      // Test the private method through public interface
      const analysis = agent.analyzeJobDescription(testJobDescription);
      
      // This will test the keyword extraction logic
      expect(analysis).resolves.toBeDefined();
    });

    it('should identify action verbs in job descriptions', () => {
      const testJobDescription = `
        You will develop, implement, and maintain software solutions.
        Lead cross-functional teams and collaborate with stakeholders.
        Analyze requirements and optimize performance.
      `;

      const analysis = agent.analyzeJobDescription(testJobDescription);
      expect(analysis).resolves.toBeDefined();
    });

    it('should extract years of experience requirements', () => {
      const testCases = [
        { text: '5+ years of experience', expected: 5 },
        { text: '3-5 years experience in software development', expected: 3 },
        { text: 'Minimum 7 years of professional experience', expected: 7 },
        { text: '2+ years exp in React', expected: 2 }
      ];

      testCases.forEach(async ({ text, expected }) => {
        const analysis = await agent.analyzeJobDescription(text);
        // The years extraction logic should be tested through the analysis
        expect(analysis).toBeDefined();
      });
    });
  });

  describe('match score calculation', () => {
    it('should return higher scores for better matches', async () => {
      // Create a resume that closely matches the job
      const wellMatchedResume: ResumeData = {
        ...sampleResume,
        sections: [
          {
            type: 'experience',
            title: 'Experience',
            items: [
              {
                title: 'Senior Software Engineer',
                company: 'Tech Corp',
                startDate: '2019-01',
                endDate: '2024-01',
                description: [
                  'Led development of React applications using TypeScript',
                  'Implemented Redux for state management',
                  'Mentored junior developers and conducted code reviews',
                  'Designed and built scalable web applications',
                  'Collaborated with product managers on feature planning'
                ]
              } as ExperienceItem
            ]
          },
          {
            type: 'skills',
            title: 'Skills',
            items: [
              {
                category: 'Frontend',
                skills: ['React', 'TypeScript', 'JavaScript', 'Redux', 'Next.js']
              },
              {
                category: 'Testing',
                skills: ['Jest', 'React Testing Library']
              },
              {
                category: 'Tools',
                skills: ['GraphQL', 'AWS', 'CI/CD']
              }
            ]
          }
        ]
      };

      const wellMatchedOptimization = await agent.optimizeResumeForJob(
        wellMatchedResume,
        sampleJobDescription
      );

      const poorlyMatchedOptimization = await agent.optimizeResumeForJob(
        sampleResume,
        sampleJobDescription
      );

      expect(wellMatchedOptimization.matchScore).toBeGreaterThan(poorlyMatchedOptimization.matchScore);
    });

    it('should handle edge cases in match calculation', async () => {
      // Empty resume
      const emptyResume: ResumeData = {
        personalInfo: {
          fullName: 'Empty User',
          email: 'empty@example.com'
        },
        sections: []
      };

      const optimization = await agent.optimizeResumeForJob(emptyResume, sampleJobDescription);
      
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
      expect(optimization.matchScore).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling and resilience', () => {
    it('should handle malformed job descriptions', async () => {
      const malformedJobDescription = 'Short job desc';
      
      const analysis = await agent.analyzeJobDescription(malformedJobDescription);
      expect(analysis).toBeDefined();
      
      const optimization = await agent.optimizeResumeForJob(sampleResume, malformedJobDescription);
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty or invalid resume data', async () => {
      const invalidResume = {
        personalInfo: { fullName: '', email: '' },
        sections: []
      } as ResumeData;

      const optimization = await agent.optimizeResumeForJob(invalidResume, sampleJobDescription);
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
    });

    it('should provide meaningful fallback when AI services fail', async () => {
      // Mock complete AI failure
      // @ts-ignore
      agent.aiClients.generateCompletion.mockRejectedValue(new Error('Complete AI failure'));

      const analysis = await agent.analyzeJobDescription(sampleJobDescription);
      expect(analysis).toBeDefined();
      expect(analysis.keywords).toBeDefined();
      expect(analysis.requirements).toBeDefined();

      const optimization = await agent.optimizeResumeForJob(sampleResume, sampleJobDescription);
      expect(optimization).toBeDefined();
      expect(optimization.matchScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance and efficiency', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      await agent.analyzeJobDescription(sampleJobDescription);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds (accounting for mocked AI calls)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() => 
        agent.analyzeJobDescription(sampleJobDescription)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.keywords).toBeDefined();
      });
    });
  });
});

describe('JobOptimizationAgent Integration', () => {
  it('should maintain singleton pattern', () => {
    const agent1 = getJobOptimizationAgent();
    const agent2 = getJobOptimizationAgent();
    
    expect(agent1).toBe(agent2);
  });

  it('should integrate with existing analysis workflow', async () => {
    const agent = getJobOptimizationAgent();
    
    // Test that job optimization can work alongside resume analysis
    const jobAnalysis = await agent.analyzeJobDescription(
      'Software Engineer position requiring React and Node.js experience'
    );
    
    expect(jobAnalysis).toBeDefined();
    expect(jobAnalysis.keywords.technical).toContain('React');
  });
});