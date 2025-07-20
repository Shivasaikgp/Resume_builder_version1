// Main Resume Builder Components
export { ResumeBuilder } from './ResumeBuilder';
export { ResumePreview } from './ResumePreview';
export { SectionManager } from './SectionManager';

// Template System Exports
export { BaseTemplate } from './BaseTemplate';
export { TemplateProvider } from './TemplateProvider';

// Section Components
export { PersonalInfoSection } from './sections/PersonalInfoSection';
export { ExperienceSection } from './sections/ExperienceSection';
export { EducationSection } from './sections/EducationSection';
export { SkillsSection } from './sections/SkillsSection';
export { ProjectsSection } from './sections/ProjectsSection';
export { CustomSection } from './sections/CustomSection';

// Template Adaptation Engine
export { 
  TemplateAdaptationEngine,
  createDefaultAdaptiveTemplate,
  createDefaultAdaptationRules
} from '../../lib/template-adaptation';