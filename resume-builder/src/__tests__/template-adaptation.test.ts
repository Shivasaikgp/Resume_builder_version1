import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TemplateAdaptationEngine, 
  createDefaultAdaptiveTemplate,
  createDefaultAdaptationRules 
} from '@/lib/template-adaptation';
import { ResumeData, AdaptiveTemplate, ExperienceItem, EducationItem } from '@/types';
import { createValidEmptyResume } from '@/utils/resume-data';

describe('TemplateAdaptationEngine', () => {
  let engine: TemplateAdaptationEngine;
  let baseTemplate: AdaptiveTemplate;
  let baseResumeData: ResumeData;

  beforeEach(() => {
    baseTemplate = createDefaultAdaptiveTemplate();
    engine = new TemplateAdaptationEngine(baseTemplate);
    baseResumeData = createValidEmptyResume();
  });

  describe('Experience Level Detection', () => {
    it('should detect entry level for no experience', () => {
      const resumeData = { ...baseResumeData };
      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Entry level should use single column and standard header
      expect(adaptedTemplate.layout.columns).toBe(1);
      expect(adaptedTemplate.layout.headerStyle).toBe('standard');
    });

    it('should detect mid level for 3-6 years experience', () => {
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'Software Developer',
            company: 'Tech Corp',
            startDate: '2021-01-01',
            endDate: '2024-01-01',
            current: false,
            description: ['Developed web applications']
          } as ExperienceItem
        ];
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Should maintain default layout for mid-level
      expect(adaptedTemplate.layout.headerStyle).toBe('standard');
    });

    it('should detect senior level for leadership roles', () => {
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            startDate: '2018-01-01',
            current: true,
            description: ['Led development team']
          } as ExperienceItem
        ];
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Senior level should use prominent header and multi-column
      expect(adaptedTemplate.layout.headerStyle).toBe('prominent');
      expect(adaptedTemplate.layout.columns).toBe(2);
    });

    it('should detect executive level for C-level roles', () => {
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'CTO',
            company: 'Startup Inc',
            startDate: '2020-01-01',
            current: true,
            description: ['Led technology strategy']
          } as ExperienceItem
        ];
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Executive level should use prominent header and multi-column
      expect(adaptedTemplate.layout.headerStyle).toBe('prominent');
      expect(adaptedTemplate.layout.columns).toBe(2);
    });
  });

  describe('Section Order Adaptation', () => {
    it('should prioritize education for entry level candidates', () => {
      const resumeData = { ...baseResumeData };
      const educationSection = resumeData.sections.find(s => s.type === 'education');
      
      if (educationSection) {
        educationSection.items = [
          {
            degree: 'Bachelor of Computer Science',
            school: 'University of Tech',
            graduationDate: '2023-05-01'
          } as EducationItem
        ];
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Education should come first for entry level
      expect(adaptedTemplate.layout.sectionOrder[0]).toBe('education');
    });

    it('should prioritize skills for technical roles', () => {
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'Frontend Developer',
            company: 'Web Agency',
            startDate: '2022-01-01',
            current: true,
            description: ['Built React applications']
          } as ExperienceItem
        ];
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Technical roles rule should apply and override dynamic adaptation
      // Experience should be first, skills second for technical roles
      expect(adaptedTemplate.layout.sectionOrder[0]).toBe('experience');
      expect(adaptedTemplate.layout.sectionOrder[1]).toBe('skills');
    });
  });

  describe('Spacing Adaptation', () => {
    it('should use compact spacing for high content density', () => {
      const resumeData = { ...baseResumeData };
      
      // Add many items to create high density (need >15 total items)
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      if (experienceSection) {
        experienceSection.items = Array(16).fill(null).map((_, i) => ({
          title: `Position ${i + 1}`,
          company: `Company ${i + 1}`,
          startDate: '2020-01-01',
          endDate: '2021-01-01',
          description: [`Description ${i + 1}`]
        } as ExperienceItem));
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      expect(adaptedTemplate.layout.spacing).toBe('compact');
    });

    it('should use relaxed spacing for low content density', () => {
      const resumeData = { ...baseResumeData };
      
      // Keep minimal content
      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      expect(adaptedTemplate.layout.spacing).toBe('relaxed');
    });
  });

  describe('Adaptation Rules', () => {
    it('should apply entry level education priority rule', () => {
      const rules = createDefaultAdaptationRules();
      const entryLevelRule = rules[0];
      
      const resumeData = { ...baseResumeData };
      const educationSection = resumeData.sections.find(s => s.type === 'education');
      if (educationSection) {
        educationSection.items = [
          {
            degree: 'Bachelor of Science',
            school: 'University',
            graduationDate: '2023-05-01'
          } as EducationItem
        ];
      }

      expect(entryLevelRule.condition(resumeData)).toBe(true);
      expect(entryLevelRule.modifications[0].changes.sectionOrder[0]).toBe('education');
    });

    it('should apply technical role skills priority rule', () => {
      const rules = createDefaultAdaptationRules();
      const technicalRule = rules[1];
      
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            startDate: '2022-01-01',
            current: true
          } as ExperienceItem
        ];
      }

      expect(technicalRule.condition(resumeData)).toBe(true);
      expect(technicalRule.modifications[0].changes.sectionOrder[1]).toBe('skills');
    });

    it('should apply high density compact spacing rule', () => {
      const rules = createDefaultAdaptationRules();
      const densityRule = rules[2];
      
      const resumeData = { ...baseResumeData };
      
      // Add many items
      resumeData.sections.forEach(section => {
        section.items = Array(6).fill({}).map((_, i) => ({ id: i }));
      });

      expect(densityRule.condition(resumeData)).toBe(true);
      expect(densityRule.modifications[0].changes.spacing).toBe('compact');
    });

    it('should apply executive prominent header rule', () => {
      const rules = createDefaultAdaptationRules();
      const executiveRule = rules[3];
      
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'CEO',
            company: 'Startup Inc',
            startDate: '2020-01-01',
            current: true
          } as ExperienceItem
        ];
      }

      expect(executiveRule.condition(resumeData)).toBe(true);
      expect(executiveRule.modifications[0].changes.headerStyle).toBe('prominent');
      expect(executiveRule.modifications[0].changes.columns).toBe(2);
    });
  });

  describe('Template Cloning', () => {
    it('should not modify the original template', () => {
      const originalTemplate = createDefaultAdaptiveTemplate();
      const originalSectionOrder = [...originalTemplate.layout.sectionOrder];
      const originalSpacing = originalTemplate.layout.spacing;
      
      const resumeData = { ...baseResumeData };
      // Create a scenario that will definitely trigger changes (entry level with education)
      const educationSection = resumeData.sections.find(s => s.type === 'education');
      if (educationSection) {
        educationSection.items = [
          {
            degree: 'Bachelor of Computer Science',
            school: 'University of Tech',
            graduationDate: '2023-05-01'
          } as EducationItem
        ];
      }

      const engine = new TemplateAdaptationEngine(originalTemplate);
      const adaptedTemplate = engine.adaptTemplate(resumeData);

      // Original template should remain unchanged
      expect(originalTemplate.layout.sectionOrder).toEqual(originalSectionOrder);
      expect(originalTemplate.layout.spacing).toBe(originalSpacing);
      
      // Adapted template should be different (education first for entry level)
      expect(adaptedTemplate.layout.sectionOrder[0]).toBe('education');
      expect(adaptedTemplate.layout.spacing).toBe('relaxed'); // Low content density
    });
  });

  describe('Content Analysis', () => {
    it('should calculate section strength correctly', () => {
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'Software Developer',
            company: 'Tech Corp',
            startDate: '2022-01-01',
            current: true,
            description: [
              'Developed web applications using React',
              'Collaborated with cross-functional teams',
              'Implemented CI/CD pipelines'
            ]
          } as ExperienceItem
        ];
      }

      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Should adapt based on content strength
      expect(adaptedTemplate.layout.sectionOrder[0]).toBe('experience');
    });

    it('should handle empty sections gracefully', () => {
      const resumeData = { ...baseResumeData };
      
      // All sections are empty by default
      const adaptedTemplate = engine.adaptTemplate(resumeData);
      
      // Should not throw errors and provide reasonable defaults
      expect(adaptedTemplate.layout.columns).toBe(1);
      expect(adaptedTemplate.layout.spacing).toBe('relaxed');
      expect(adaptedTemplate.layout.headerStyle).toBe('standard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed experience dates', () => {
      const resumeData = { ...baseResumeData };
      const experienceSection = resumeData.sections.find(s => s.type === 'experience');
      
      if (experienceSection) {
        experienceSection.items = [
          {
            title: 'Software Developer',
            company: 'Tech Corp',
            startDate: 'invalid-date',
            endDate: 'also-invalid',
            current: false
          } as ExperienceItem
        ];
      }

      expect(() => {
        const adaptedTemplate = engine.adaptTemplate(resumeData);
        expect(adaptedTemplate).toBeDefined();
      }).not.toThrow();
    });

    it('should handle missing section types', () => {
      const resumeData = {
        personalInfo: baseResumeData.personalInfo,
        sections: [
          {
            type: 'custom' as const,
            title: 'Custom Section',
            items: [{ content: 'Some content' }],
            order: 1,
            visible: true
          }
        ]
      };

      expect(() => {
        const adaptedTemplate = engine.adaptTemplate(resumeData);
        expect(adaptedTemplate).toBeDefined();
      }).not.toThrow();
    });
  });
});

describe('Default Template Creation', () => {
  it('should create a valid default template', () => {
    const template = createDefaultAdaptiveTemplate();
    
    expect(template.id).toBe('default-adaptive');
    expect(template.name).toBe('Default Adaptive Template');
    expect(template.layout.columns).toBe(1);
    expect(template.layout.sectionOrder).toContain('experience');
    expect(template.layout.sectionOrder).toContain('education');
    expect(template.layout.sectionOrder).toContain('skills');
    expect(template.styling.fontFamily).toBeDefined();
    expect(template.styling.fontSize).toBe('medium');
    expect(template.adaptationRules.length).toBeGreaterThan(0);
  });

  it('should create valid default adaptation rules', () => {
    const rules = createDefaultAdaptationRules();
    
    expect(rules.length).toBe(4);
    
    // Each rule should have condition and modifications
    rules.forEach(rule => {
      expect(typeof rule.condition).toBe('function');
      expect(Array.isArray(rule.modifications)).toBe(true);
      expect(rule.modifications.length).toBeGreaterThan(0);
    });
  });
});