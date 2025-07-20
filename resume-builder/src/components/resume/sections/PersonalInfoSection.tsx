'use client';

import React from 'react';
import { PersonalInfo, StyleConfig } from '@/types';

interface PersonalInfoSectionProps {
  personalInfo: PersonalInfo;
  styling: StyleConfig;
  headerStyle: 'minimal' | 'standard' | 'prominent';
}

export function PersonalInfoSection({ 
  personalInfo, 
  styling, 
  headerStyle 
}: PersonalInfoSectionProps) {
  const headerClasses = [
    'personal-info-section',
    `header-${headerStyle}`,
  ].join(' ');

  const nameStyle = {
    color: styling.accentColor,
    fontSize: headerStyle === 'prominent' ? '2rem' : 
              headerStyle === 'standard' ? '1.5rem' : '1.25rem',
    fontWeight: 'bold',
    marginBottom: headerStyle === 'minimal' ? '0.25rem' : '0.5rem',
  };

  const contactStyle = {
    color: styling.accentColor === '#000000' ? '#6b7280' : styling.accentColor,
    fontSize: '0.875rem',
    opacity: 0.8,
  };

  return (
    <div className={headerClasses}>
      <h1 style={nameStyle}>
        {personalInfo.fullName}
      </h1>
      
      <div className="contact-info" style={contactStyle}>
        <div className="contact-row">
          {personalInfo.email && (
            <span className="contact-item">
              {personalInfo.email}
            </span>
          )}
          {personalInfo.phone && (
            <span className="contact-item">
              {personalInfo.phone}
            </span>
          )}
          {personalInfo.location && (
            <span className="contact-item">
              {personalInfo.location}
            </span>
          )}
        </div>
        
        {(personalInfo.linkedin || personalInfo.github || personalInfo.website) && (
          <div className="contact-row links">
            {personalInfo.linkedin && (
              <span className="contact-item">
                LinkedIn: {personalInfo.linkedin}
              </span>
            )}
            {personalInfo.github && (
              <span className="contact-item">
                GitHub: {personalInfo.github}
              </span>
            )}
            {personalInfo.website && (
              <span className="contact-item">
                Website: {personalInfo.website}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}