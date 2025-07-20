'use client';

import React from 'react';
import { ResumeSection, EducationItem, StyleConfig } from '@/types';

interface EducationSectionProps {
  section: ResumeSection;
  styling: StyleConfig;
}

export function EducationSection({ section, styling }: EducationSectionProps) {
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
    <div className="education-section" style={sectionStyle}>
      <h2 style={titleStyle}>{section.title}</h2>
      
      <div className="education-items">
        {section.items.map((item, index) => {
          const education = item as EducationItem;
          return (
            <EducationItem 
              key={index} 
              education={education} 
              styling={styling}
            />
          );
        })}
      </div>
    </div>
  );
}

interface EducationItemProps {
  education: EducationItem;
  styling: StyleConfig;
}

function EducationItem({ education, styling }: EducationItemProps) {
  const itemStyle = {
    marginBottom: '1rem',
  };

  const headerStyle = {
    marginBottom: '0.25rem',
  };

  const degreeStyle = {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: styling.accentColor,
  };

  const schoolStyle = {
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

  const honorsStyle = {
    fontSize: '0.875rem',
    lineHeight: styling.lineHeight,
    color: '#374151',
  };

  return (
    <div className="education-item" style={itemStyle}>
      <div style={headerStyle}>
        <div style={degreeStyle}>{education.degree}</div>
        <div style={schoolStyle}>{education.school}</div>
        <div style={metaStyle}>
          {education.graduationDate && education.graduationDate}
          {education.location && ` • ${education.location}`}
          {education.gpa && ` • GPA: ${education.gpa}`}
        </div>
      </div>
      
      {education.honors && education.honors.length > 0 && (
        <div style={honorsStyle}>
          <strong>Honors: </strong>
          {education.honors.join(', ')}
        </div>
      )}
    </div>
  );
}