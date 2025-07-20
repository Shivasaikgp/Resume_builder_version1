'use client';

import React from 'react';
import { ResumeSection, ExperienceItem, StyleConfig } from '@/types';

interface ExperienceSectionProps {
  section: ResumeSection;
  styling: StyleConfig;
}

export function ExperienceSection({ section, styling }: ExperienceSectionProps) {
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
    <div className="experience-section" style={sectionStyle}>
      <h2 style={titleStyle}>{section.title}</h2>
      
      <div className="experience-items">
        {section.items.map((item, index) => {
          const experience = item as ExperienceItem;
          return (
            <ExperienceItem 
              key={index} 
              experience={experience} 
              styling={styling}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ExperienceItemProps {
  experience: ExperienceItem;
  styling: StyleConfig;
}

function ExperienceItem({ experience, styling }: ExperienceItemProps) {
  const itemStyle = {
    marginBottom: '1rem',
  };

  const headerStyle = {
    marginBottom: '0.25rem',
  };

  const titleStyle = {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: styling.accentColor,
  };

  const companyStyle = {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#374151',
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
  };

  const formatDateRange = () => {
    const start = experience.startDate;
    const end = experience.current ? 'Present' : experience.endDate || 'Present';
    return `${start} - ${end}`;
  };

  return (
    <div className="experience-item" style={itemStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>{experience.title}</div>
        <div style={companyStyle}>{experience.company}</div>
        <div style={metaStyle}>
          {formatDateRange()}
          {experience.location && ` • ${experience.location}`}
        </div>
      </div>
      
      {experience.description && experience.description.length > 0 && (
        <ul style={descriptionStyle}>
          {experience.description.map((desc, index) => (
            <li key={index} style={{ marginBottom: '0.25rem' }}>
              {desc}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}