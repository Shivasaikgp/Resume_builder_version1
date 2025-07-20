// Re-export types from database.ts for consistency
export type {
  PersonalInfo,
  ExperienceItem,
  EducationItem,
  SkillsItem,
  ProjectItem,
  ResumeSection,
  TemplateConfig,
  ResumeData,
  UserProfile,
  UserPreferences,
  UserInteraction,
  UserContext,
  ResumeAnalysis,
  User,
  Resume,
  UserContextModel,
  ResumeAnalysisModel,
} from './database'

// Additional interfaces for the application
export interface ResumeVersion {
  id: string;
  name: string;
  data: ResumeData;
  templateConfig: TemplateConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeMetadata {
  version: number;
  lastModified: Date;
  tags: string[];
  targetJob?: string;
  targetCompany?: string;
  notes?: string;
}

// Template adaptation interfaces
export interface AdaptationRule {
  condition: (resume: ResumeData) => boolean;
  modifications: TemplateModification[];
}

export interface TemplateModification {
  type: 'layout' | 'styling' | 'sections';
  changes: Record<string, any>;
}

export interface AdaptiveTemplate {
  id: string;
  name: string;
  layout: LayoutConfig;
  styling: StyleConfig;
  adaptationRules: AdaptationRule[];
}

export interface LayoutConfig {
  columns: number;
  sectionOrder: string[];
  spacing: 'compact' | 'normal' | 'relaxed';
  headerStyle: 'minimal' | 'standard' | 'prominent';
}

export interface StyleConfig {
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'blue' | 'green' | 'purple' | 'gray' | 'black';
  accentColor: string;
  lineHeight: number;
}

// Content suggestion interfaces
export interface ContentSuggestion {
  id: string;
  type: 'bullet_point' | 'skill' | 'achievement' | 'keyword';
  content: string;
  context: string;
  confidence: number;
  reasoning?: string;
}

// Analysis result interfaces
export interface ATSResult {
  score: number;
  keywords: {
    found: string[];
    missing: string[];
    density: Record<string, number>;
  };
  formatting: {
    issues: string[];
    recommendations: string[];
  };
}

export interface ResumeScore {
  overall: number;
  breakdown: {
    content: number;
    formatting: number;
    atsCompatibility: number;
    keywords: number;
  };
  details: {
    strengths: string[];
    improvements: string[];
    criticalIssues: string[];
  };
}