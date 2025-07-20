'use client';

import React, { useMemo } from 'react';
import { ResumeData, TemplateConfig, AdaptiveTemplate } from '@/types';
import { BaseTemplate } from './BaseTemplate';
import { 
  TemplateAdaptationEngine, 
  createDefaultAdaptiveTemplate 
} from '@/lib/template-adaptation';

interface TemplateProviderProps {
  resumeData: ResumeData;
  templateConfig: TemplateConfig;
  baseTemplate?: AdaptiveTemplate;
  className?: string;
}

export function TemplateProvider({
  resumeData,
  templateConfig,
  baseTemplate,
  className,
}: TemplateProviderProps) {
  // Use default template if none provided
  const defaultTemplate = useMemo(() => createDefaultAdaptiveTemplate(), []);
  const template = baseTemplate || defaultTemplate;

  // Create adaptation engine and adapt template based on content
  const adaptedTemplate = useMemo(() => {
    const engine = new TemplateAdaptationEngine(template);
    return engine.adaptTemplate(resumeData);
  }, [template, resumeData]);

  // Merge template config with adapted template styling
  const mergedTemplate = useMemo(() => {
    return {
      ...adaptedTemplate,
      styling: {
        ...adaptedTemplate.styling,
        // Override with template config values
        fontSize: templateConfig.fontSize || adaptedTemplate.styling.fontSize,
        colorScheme: templateConfig.colorScheme || adaptedTemplate.styling.colorScheme,
        accentColor: getAccentColor(templateConfig.colorScheme || adaptedTemplate.styling.colorScheme),
      },
    };
  }, [adaptedTemplate, templateConfig]);

  return (
    <BaseTemplate
      resumeData={resumeData}
      templateConfig={templateConfig}
      adaptiveTemplate={mergedTemplate}
      className={className}
    />
  );
}

/**
 * Gets accent color based on color scheme
 */
function getAccentColor(colorScheme: string): string {
  const colors = {
    blue: '#2563eb',
    green: '#059669',
    purple: '#7c3aed',
    gray: '#374151',
    black: '#000000',
  };
  return colors[colorScheme as keyof typeof colors] || colors.blue;
}