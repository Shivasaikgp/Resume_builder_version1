import React from 'react';

interface RealTimePreviewProps {
  data?: any;
}

export const RealTimePreview: React.FC<RealTimePreviewProps> = ({ data }) => {
  return (
    <div 
      data-testid="resume-preview" 
      role="document" 
      aria-live="polite"
      aria-label="Resume Preview"
    >
      <section role="region" aria-label="Personal Information">
        <h2>Personal Information</h2>
        <div data-testid="preview-name">{data?.personalInfo?.name || 'Name'}</div>
        <div data-testid="preview-email">{data?.personalInfo?.email || 'Email'}</div>
      </section>
      
      <section role="region" aria-label="Experience">
        <h2>Experience</h2>
        <div data-testid="preview-experience-section">
          {data?.experience?.map((exp: any, index: number) => (
            <div key={index}>
              <h3>{exp.title}</h3>
              <p>{exp.company}</p>
            </div>
          ))}
        </div>
      </section>
      
      <section role="region" aria-label="Education">
        <h2>Education</h2>
        <div data-testid="preview-education-section">
          {data?.education?.map((edu: any, index: number) => (
            <div key={index}>
              <h3>{edu.degree}</h3>
              <p>{edu.school}</p>
            </div>
          ))}
        </div>
      </section>
      
      <section role="region" aria-label="Skills">
        <h2>Skills</h2>
        <div data-testid="preview-skills-section">
          <div data-testid="preview-skills">
            {data?.skills?.join(', ') || 'Skills'}
          </div>
        </div>
      </section>
    </div>
  );
};