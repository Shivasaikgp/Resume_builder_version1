'use client';

import React from 'react';
import { ResumeData, TemplateConfig, AdaptiveTemplate } from '@/types';
import { PersonalInfoSection } from './sections/PersonalInfoSection';
import { ExperienceSection } from './sections/ExperienceSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { CustomSection } from './sections/CustomSection';

interface BaseTemplateProps {
  resumeData: ResumeData;
  templateConfig: TemplateConfig;
  adaptiveTemplate: AdaptiveTemplate;
  className?: string;
}

export function BaseTemplate({
  resumeData,
  templateConfig,
  adaptiveTemplate,
  className = '',
}: BaseTemplateProps) {
  const { layout, styling } = adaptiveTemplate;

  // Apply template styling
  const templateStyles = {
    fontFamily: styling.fontFamily,
    fontSize: getFontSize(styling.fontSize),
    lineHeight: styling.lineHeight,
    color: getColorScheme(styling.colorScheme).text,
  };

  const containerClasses = [
    'resume-template',
    `layout-${layout.columns === 1 ? 'single' : 'multi'}-column`,
    `spacing-${layout.spacing}`,
    `header-${layout.headerStyle}`,
    className,
  ].join(' ');

  // Render sections in the specified order
  const renderSection = (sectionType: string, index: number) => {
    const section = resumeData.sections.find(s => s.type === sectionType);
    if (!section || !section.visible) return null;

    const key = `${sectionType}-${index}`;

    switch (section.type) {
      case 'experience':
        return <ExperienceSection key={key} section={section} styling={styling} />;
      case 'education':
        return <EducationSection key={key} section={section} styling={styling} />;
      case 'skills':
        return <SkillsSection key={key} section={section} styling={styling} />;
      case 'projects':
        return <ProjectsSection key={key} section={section} styling={styling} />;
      case 'custom':
        return <CustomSection key={key} section={section} styling={styling} />;
      default:
        return null;
    }
  };

  return (
    <div className={containerClasses} style={templateStyles}>
      {/* Header Section */}
      <div className="resume-header">
        <PersonalInfoSection 
          personalInfo={resumeData.personalInfo} 
          styling={styling}
          headerStyle={layout.headerStyle}
        />
      </div>

      {/* Main Content */}
      <div className={`resume-content columns-${layout.columns}`}>
        {layout.sectionOrder.map((sectionType, index) => 
          renderSection(sectionType, index)
        )}
      </div>
    </div>
  );
}

// Helper functions for styling
function getFontSize(size: 'small' | 'medium' | 'large'): string {
  const sizes = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.125rem',
  };
  return sizes[size];
}

function getColorScheme(scheme: string) {
  const schemes = {
    blue: {
      primary: '#2563eb',
      secondary: '#1e40af',
      text: '#1f2937',
      muted: '#6b7280',
    },
    green: {
      primary: '#059669',
      secondary: '#047857',
      text: '#1f2937',
      muted: '#6b7280',
    },
    purple: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
      text: '#1f2937',
      muted: '#6b7280',
    },
    gray: {
      primary: '#374151',
      secondary: '#1f2937',
      text: '#1f2937',
      muted: '#6b7280',
    },
    black: {
      primary: '#000000',
      secondary: '#1f2937',
      text: '#1f2937',
      muted: '#6b7280',
    },
  };
  return schemes[scheme as keyof typeof schemes] || schemes.blue;
}