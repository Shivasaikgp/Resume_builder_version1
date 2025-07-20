'use client';

import React from 'react';
import { ResumeSection, ProjectItem, StyleConfig } from '@/types';

interface ProjectsSectionProps {
  section: ResumeSection;
  styling: StyleConfig;
}

export function ProjectsSection({ section, styling }: ProjectsSectionProps) {
  const sectionStyle = {
    marginBottom: '1.5rem',
  };

  const titleStyle = {
    color: styling.accentColor,
    fontSize: '1.125rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    borderBottom: `2px solid ${styling.accentColor}`,
    paddingBottom: '0.25rem',
  };

  return (
    <div className="projects-section" style={sectionStyle}>
      <h2 style={titleStyle}>{section.title}</h2>
      
      <div className="project-items">
        {section.items.map((item, index) => {
          const project = item as ProjectItem;
          return (
            <ProjectItem 
              key={index} 
              project={project} 
              styling={styling}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ProjectItemProps {
  project: ProjectItem;
  styling: StyleConfig;
}

function ProjectItem({ project, styling }: ProjectItemProps) {
  const itemStyle = {
    marginBottom: '1rem',
  };

  const headerStyle = {
    marginBottom: '0.25rem',
  };

  const nameStyle = {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: styling.accentColor,
  };

  const metaStyle = {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: '0.5rem',
  };

  const descriptionStyle = {
    fontSize: '0.875rem',
    lineHeight: styling.lineHeight,
    color: '#374151',
    marginBottom: '0.5rem',
  };

  const techStyle = {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: '500',
  };

  const formatDateRange = () => {
    if (!project.startDate && !project.endDate) return '';
    const start = project.startDate || '';
    const end = project.endDate || 'Present';
    return start && end ? `${start} - ${end}` : start || end;
  };

  const formatLinks = () => {
    const links = [];
    if (project.url) links.push(`Demo: ${project.url}`);
    if (project.github) links.push(`GitHub: ${project.github}`);
    return links.join(' • ');
  };

  return (
    <div className="project-item" style={itemStyle}>
      <div style={headerStyle}>
        <div style={nameStyle}>{project.name}</div>
        <div style={metaStyle}>
          {formatDateRange()}
          {formatLinks() && ` • ${formatLinks()}`}
        </div>
      </div>
      
      {project.description && (
        <div style={descriptionStyle}>
          {project.description}
        </div>
      )}
      
      {project.technologies && project.technologies.length > 0 && (
        <div style={techStyle}>
          <strong>Technologies: </strong>
          {project.technologies.join(', ')}
        </div>
      )}
    </div>
  );
}