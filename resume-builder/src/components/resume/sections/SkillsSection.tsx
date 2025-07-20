'use client';

import React from 'react';
import { ResumeSection, SkillsItem, StyleConfig } from '@/types';

interface SkillsSectionProps {
  section: ResumeSection;
  styling: StyleConfig;
}

export function SkillsSection({ section, styling }: SkillsSectionProps) {
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
    <div className="skills-section" style={sectionStyle}>
      <h2 style={titleStyle}>{section.title}</h2>
      
      <div className="skills-items">
        {section.items.map((item, index) => {
          const skills = item as SkillsItem;
          return (
            <SkillsItem 
              key={index} 
              skills={skills} 
              styling={styling}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SkillsItemProps {
  skills: SkillsItem;
  styling: StyleConfig;
}

function SkillsItem({ skills, styling }: SkillsItemProps) {
  const itemStyle = {
    marginBottom: '0.75rem',
  };

  const categoryStyle = {
    fontWeight: 'bold',
    fontSize: '0.875rem',
    color: styling.accentColor,
    marginBottom: '0.25rem',
  };

  const skillsListStyle = {
    fontSize: '0.875rem',
    lineHeight: styling.lineHeight,
    color: '#374151',
  };

  return (
    <div className="skills-item" style={itemStyle}>
      <div style={categoryStyle}>{skills.category}:</div>
      <div style={skillsListStyle}>
        {skills.skills.join(' • ')}
      </div>
    </div>
  );
}