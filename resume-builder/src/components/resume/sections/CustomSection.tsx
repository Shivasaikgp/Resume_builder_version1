'use client';

import React from 'react';
import { ResumeSection, StyleConfig } from '@/types';

interface CustomSectionProps {
  section: ResumeSection;
  styling: StyleConfig;
}

export function CustomSection({ section, styling }: CustomSectionProps) {
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

  const itemStyle = {
    fontSize: '0.875rem',
    lineHeight: styling.lineHeight,
    color: '#374151',
    marginBottom: '0.5rem',
  };

  return (
    <div className="custom-section" style={sectionStyle}>
      <h2 style={titleStyle}>{section.title}</h2>
      
      <div className="custom-items">
        {section.items.map((item, index) => (
          <div key={index} style={itemStyle}>
            {typeof item === 'string' ? item : JSON.stringify(item)}
          </div>
        ))}
      </div>
    </div>
  );
}