import { 
  ResumeData, 
  AdaptiveTemplate, 
  AdaptationRule, 
  TemplateModification,
  LayoutConfig,
  StyleConfig,
  ExperienceItem,
  EducationItem 
} from '@/types';

/**
 * Template Adaptation Engine
 * Analyzes resume content and applies intelligent template modifications
 */
export class TemplateAdaptationEngine {
  private baseTemplate: AdaptiveTemplate;

  constructor(baseTemplate: AdaptiveTemplate) {
    this.baseTemplate = baseTemplate;
  }

  /**
   * Adapts the template based on resume content
   */
  adaptTemplate(resumeData: ResumeData): AdaptiveTemplate {
    const adaptedTemplate = this.cloneTemplate(this.baseTemplate);
    
    // Apply dynamic adaptations based on content analysis first
    this.applyDynamicAdaptations(adaptedTemplate, resumeData);

    // Apply all adaptation rules (these can override dynamic adaptations)
    for (const rule of this.baseTemplate.adaptationRules) {
      if (rule.condition(resumeData)) {
        this.applyModifications(adaptedTemplate, rule.modifications);
      }
    }

    return adaptedTemplate;
  }

  /**
   * Applies template modifications
   */
  private applyModifications(
    template: AdaptiveTemplate, 
    modifications: TemplateModification[]
  ): void {
    for (const modification of modifications) {
      switch (modification.type) {
        case 'layout':
          this.applyLayoutChanges(template.layout, modification.changes);
          break;
        case 'styling':
          this.applyStylingChanges(template.styling, modification.changes);
          break;
        case 'sections':
          this.applySectionChanges(template, modification.changes);
          break;
      }
    }
  }

  /**
   * Applies dynamic adaptations based on content analysis
   */
  private applyDynamicAdaptations(
    template: AdaptiveTemplate, 
    resumeData: ResumeData
  ): void {
    const analysis = this.analyzeContent(resumeData);
    
    // Adapt layout based on experience level
    this.adaptLayoutForExperience(template, analysis.experienceLevel);
    
    // Adapt section order based on content strength
    this.adaptSectionOrder(template, analysis.sectionStrengths);
    
    // Adapt spacing based on content density
    this.adaptSpacing(template, analysis.contentDensity);
    
    // Adapt header style based on experience level
    this.adaptHeaderStyle(template, analysis.experienceLevel);
  }

  /**
   * Analyzes resume content to determine adaptation strategies
   */
  private analyzeContent(resumeData: ResumeData) {
    const experienceSection = resumeData.sections.find(s => s.type === 'experience');
    const educationSection = resumeData.sections.find(s => s.type === 'education');
    const skillsSection = resumeData.sections.find(s => s.type === 'skills');
    const projectsSection = resumeData.sections.find(s => s.type === 'projects');

    // Determine experience level
    const experienceLevel = this.determineExperienceLevel(experienceSection);
    
    // Calculate section strengths
    const sectionStrengths = {
      experience: this.calculateSectionStrength(experienceSection),
      education: this.calculateSectionStrength(educationSection),
      skills: this.calculateSectionStrength(skillsSection),
      projects: this.calculateSectionStrength(projectsSection),
    };

    // Calculate content density
    const totalItems = resumeData.sections.reduce(
      (sum, section) => sum + (section.items?.length || 0), 
      0
    );
    const contentDensity = totalItems > 15 ? 'high' : totalItems > 8 ? 'medium' : 'low';

    return {
      experienceLevel,
      sectionStrengths,
      contentDensity: contentDensity as 'low' | 'medium' | 'high',
    };
  }

  /**
   * Determines experience level based on work experience
   */
  private determineExperienceLevel(
    experienceSection?: { items: any[] }
  ): 'entry' | 'mid' | 'senior' | 'executive' {
    if (!experienceSection || !experienceSection.items.length) {
      return 'entry';
    }

    const experiences = experienceSection.items as ExperienceItem[];
    const totalYears = this.calculateTotalExperience(experiences);
    const hasLeadershipRoles = this.hasLeadershipExperience(experiences);
    const hasExecutiveRoles = this.hasExecutiveExperience(experiences);

    if (hasExecutiveRoles || totalYears >= 15) {
      return 'executive';
    } else if (hasLeadershipRoles || totalYears >= 7) {
      return 'senior';
    } else if (totalYears >= 3) {
      return 'mid';
    } else {
      return 'entry';
    }
  }

  /**
   * Calculates total years of experience
   */
  private calculateTotalExperience(experiences: ExperienceItem[]): number {
    let totalMonths = 0;
    
    for (const exp of experiences) {
      const startDate = new Date(exp.startDate);
      const endDate = exp.current ? new Date() : new Date(exp.endDate || new Date());
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                    (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, months);
    }
    
    return totalMonths / 12;
  }

  /**
   * Checks if resume has leadership experience
   */
  private hasLeadershipExperience(experiences: ExperienceItem[]): boolean {
    const leadershipKeywords = [
      'manager', 'director', 'lead', 'supervisor', 'head', 'chief', 
      'team lead', 'senior', 'principal', 'architect'
    ];
    
    return experiences.some(exp => 
      leadershipKeywords.some(keyword => 
        exp.title.toLowerCase().includes(keyword)
      )
    );
  }

  /**
   * Checks if resume has executive experience
   */
  private hasExecutiveExperience(experiences: ExperienceItem[]): boolean {
    const executiveKeywords = [
      'ceo', 'cto', 'cfo', 'vp', 'vice president', 'president', 
      'executive', 'founder', 'co-founder'
    ];
    
    return experiences.some(exp => 
      executiveKeywords.some(keyword => 
        exp.title.toLowerCase().includes(keyword)
      )
    );
  }

  /**
   * Calculates the strength of a resume section
   */
  private calculateSectionStrength(section?: { items: any[] }): number {
    if (!section || !section.items.length) return 0;
    
    const itemCount = section.items.length;
    const hasDetailedContent = section.items.some(item => {
      if (typeof item === 'object' && item.description) {
        return Array.isArray(item.description) ? 
          item.description.length > 0 : 
          item.description.length > 50;
      }
      return false;
    });
    
    let strength = itemCount * 2;
    if (hasDetailedContent) strength += 3;
    
    return Math.min(strength, 10); // Cap at 10
  }

  /**
   * Adapts layout based on experience level
   */
  private adaptLayoutForExperience(
    template: AdaptiveTemplate, 
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive'
  ): void {
    switch (experienceLevel) {
      case 'entry':
        // Single column for entry level to maximize space
        template.layout.columns = 1;
        break;
      case 'mid':
        // Keep default layout
        break;
      case 'senior':
        // Multi-column if content supports it
        template.layout.columns = 2;
        break;
      case 'executive':
        // Prominent header for executives
        template.layout.headerStyle = 'prominent';
        template.layout.columns = 2;
        break;
    }
  }

  /**
   * Adapts section order based on content strength
   */
  private adaptSectionOrder(
    template: AdaptiveTemplate, 
    sectionStrengths: Record<string, number>
  ): void {
    // Sort sections by strength, keeping experience first for most cases
    const sortedSections = Object.entries(sectionStrengths)
      .sort(([, a], [, b]) => b - a)
      .map(([section]) => section);

    // Always keep experience first if it has content
    if (sectionStrengths.experience > 0) {
      template.layout.sectionOrder = [
        'experience',
        ...sortedSections.filter(s => s !== 'experience')
      ];
    } else {
      // For entry level, prioritize education and projects
      template.layout.sectionOrder = sortedSections;
    }
  }

  /**
   * Adapts spacing based on content density
   */
  private adaptSpacing(
    template: AdaptiveTemplate, 
    contentDensity: 'low' | 'medium' | 'high'
  ): void {
    switch (contentDensity) {
      case 'low':
        template.layout.spacing = 'relaxed';
        break;
      case 'medium':
        template.layout.spacing = 'normal';
        break;
      case 'high':
        template.layout.spacing = 'compact';
        break;
    }
  }

  /**
   * Adapts header style based on experience level
   */
  private adaptHeaderStyle(
    template: AdaptiveTemplate, 
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive'
  ): void {
    switch (experienceLevel) {
      case 'entry':
        template.layout.headerStyle = 'standard';
        break;
      case 'mid':
        template.layout.headerStyle = 'standard';
        break;
      case 'senior':
        template.layout.headerStyle = 'prominent';
        break;
      case 'executive':
        template.layout.headerStyle = 'prominent';
        break;
    }
  }

  /**
   * Applies layout changes to template
   */
  private applyLayoutChanges(layout: LayoutConfig, changes: Record<string, any>): void {
    Object.assign(layout, changes);
  }

  /**
   * Applies styling changes to template
   */
  private applyStylingChanges(styling: StyleConfig, changes: Record<string, any>): void {
    Object.assign(styling, changes);
  }

  /**
   * Applies section changes to template
   */
  private applySectionChanges(template: AdaptiveTemplate, changes: Record<string, any>): void {
    if (changes.sectionOrder) {
      template.layout.sectionOrder = changes.sectionOrder;
    }
  }

  /**
   * Deep clones a template
   */
  private cloneTemplate(template: AdaptiveTemplate): AdaptiveTemplate {
    return JSON.parse(JSON.stringify(template));
  }
}

/**
 * Creates default adaptation rules for the template system
 */
export function createDefaultAdaptationRules(): AdaptationRule[] {
  return [
    // Rule: Entry level candidates should emphasize education
    {
      condition: (resume) => {
        const experienceSection = resume.sections.find(s => s.type === 'experience');
        const educationSection = resume.sections.find(s => s.type === 'education');
        
        const hasLimitedExperience = !experienceSection || experienceSection.items.length <= 1;
        const hasEducation = educationSection && educationSection.items.length > 0;
        
        return hasLimitedExperience && hasEducation;
      },
      modifications: [
        {
          type: 'sections',
          changes: {
            sectionOrder: ['education', 'experience', 'projects', 'skills']
          }
        }
      ]
    },

    // Rule: Technical roles should emphasize skills and projects
    {
      condition: (resume) => {
        const experienceSection = resume.sections.find(s => s.type === 'experience');
        if (!experienceSection) return false;
        
        const technicalKeywords = [
          'developer', 'engineer', 'programmer', 'architect', 'devops',
          'software', 'frontend', 'backend', 'fullstack', 'data scientist'
        ];
        
        return experienceSection.items.some((item: any) =>
          technicalKeywords.some(keyword =>
            item.title?.toLowerCase().includes(keyword)
          )
        );
      },
      modifications: [
        {
          type: 'sections',
          changes: {
            sectionOrder: ['experience', 'skills', 'projects', 'education']
          }
        }
      ]
    },

    // Rule: High content density should use compact spacing
    {
      condition: (resume) => {
        const totalItems = resume.sections.reduce(
          (sum, section) => sum + (section.items?.length || 0), 
          0
        );
        return totalItems > 15;
      },
      modifications: [
        {
          type: 'layout',
          changes: {
            spacing: 'compact'
          }
        }
      ]
    },

    // Rule: Executive level should use prominent header
    {
      condition: (resume) => {
        const experienceSection = resume.sections.find(s => s.type === 'experience');
        if (!experienceSection) return false;
        
        const executiveKeywords = [
          'ceo', 'cto', 'cfo', 'vp', 'vice president', 'president',
          'executive', 'founder', 'co-founder', 'director'
        ];
        
        return experienceSection.items.some((item: any) =>
          executiveKeywords.some(keyword =>
            item.title?.toLowerCase().includes(keyword)
          )
        );
      },
      modifications: [
        {
          type: 'layout',
          changes: {
            headerStyle: 'prominent',
            columns: 2
          }
        }
      ]
    }
  ];
}

/**
 * Creates a default adaptive template
 */
export function createDefaultAdaptiveTemplate(): AdaptiveTemplate {
  return {
    id: 'default-adaptive',
    name: 'Default Adaptive Template',
    layout: {
      columns: 1,
      sectionOrder: ['experience', 'education', 'skills', 'projects'],
      spacing: 'normal',
      headerStyle: 'standard',
    },
    styling: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 'medium',
      colorScheme: 'blue',
      accentColor: '#2563eb',
      lineHeight: 1.5,
    },
    adaptationRules: createDefaultAdaptationRules(),
  };
}