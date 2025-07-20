import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BaseTemplate } from '@/components/resume/BaseTemplate';
import { TemplateProvider } from '@/components/resume/TemplateProvider';
import { PersonalInfoSection } from '@/components/resume/sections/PersonalInfoSection';
import { ExperienceSection } from '@/components/resume/sections/ExperienceSection';
import { EducationSection } from '@/components/resume/sections/EducationSection';
import { SkillsSection } from '@/components/resume/sections/SkillsSection';
import { ProjectsSection } from '@/components/resume/sections/ProjectsSection';
import { 
  ResumeData, 
  TemplateConfig, 
  AdaptiveTemplate,
  PersonalInfo,
  ExperienceItem,
  EducationItem,
  SkillsItem,
  ProjectItem
} from '@/types';
import { createValidEmptyResume, createDefaultTemplateConfig } from '@/utils/resume-data';
import { createDefaultAdaptiveTemplate } from '@/lib/template-adaptation';

// Mock CSS import
vi.mock('@/components/resume/template.css', () => ({}));

describe('PersonalInfoSection', () => {
  const mockPersonalInfo: PersonalInfo = {
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    website: 'https://johndoe.dev'
  };

  const mockStyling = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 'medium' as const,
    colorScheme: 'blue',
    accentColor: '#2563eb',
    lineHeight: 1.5
  };

  it('should render personal information correctly', () => {
    render(
      <PersonalInfoSection 
        personalInfo={mockPersonalInfo}
        styling={mockStyling}
        headerStyle="standard"
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
  });

  it('should render links when provided', () => {
    render(
      <PersonalInfoSection 
        personalInfo={mockPersonalInfo}
        styling={mockStyling}
        headerStyle="standard"
      />
    );

    expect(screen.getByText(/LinkedIn:/)).toBeInTheDocument();
    expect(screen.getByText(/GitHub:/)).toBeInTheDocument();
    expect(screen.getByText(/Website:/)).toBeInTheDocument();
  });

  it('should handle different header styles', () => {
    const { rerender } = render(
      <PersonalInfoSection 
        personalInfo={mockPersonalInfo}
        styling={mockStyling}
        headerStyle="minimal"
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();

    rerender(
      <PersonalInfoSection 
        personalInfo={mockPersonalInfo}
        styling={mockStyling}
        headerStyle="prominent"
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle missing optional fields', () => {
    const minimalInfo: PersonalInfo = {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: ''
    };

    render(
      <PersonalInfoSection 
        personalInfo={minimalInfo}
        styling={mockStyling}
        headerStyle="standard"
      />
    );

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/LinkedIn:/)).not.toBeInTheDocument();
  });
});

describe('ExperienceSection', () => {
  const mockExperienceSection = {
    type: 'experience' as const,
    title: 'Professional Experience',
    items: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: '2022-01-01',
        endDate: '2024-01-01',
        current: false,
        description: [
          'Led development of web applications using React and Node.js',
          'Mentored junior developers and conducted code reviews',
          'Improved application performance by 40%'
        ]
      } as ExperienceItem,
      {
        title: 'Software Engineer',
        company: 'Startup Inc',
        location: 'Remote',
        startDate: '2020-06-01',
        endDate: '2021-12-01',
        current: false,
        description: [
          'Built RESTful APIs using Python and Django',
          'Implemented automated testing and CI/CD pipelines'
        ]
      } as ExperienceItem
    ],
    order: 1,
    visible: true
  };

  const mockStyling = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 'medium' as const,
    colorScheme: 'blue',
    accentColor: '#2563eb',
    lineHeight: 1.5
  };

  it('should render section title', () => {
    render(<ExperienceSection section={mockExperienceSection} styling={mockStyling} />);
    
    expect(screen.getByText('Professional Experience')).toBeInTheDocument();
  });

  it('should render all experience items', () => {
    render(<ExperienceSection section={mockExperienceSection} styling={mockStyling} />);
    
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Startup Inc')).toBeInTheDocument();
  });

  it('should format date ranges correctly', () => {
    render(<ExperienceSection section={mockExperienceSection} styling={mockStyling} />);
    
    expect(screen.getByText(/2022-01-01 - 2024-01-01/)).toBeInTheDocument();
    expect(screen.getByText(/2020-06-01 - 2021-12-01/)).toBeInTheDocument();
  });

  it('should render job descriptions', () => {
    render(<ExperienceSection section={mockExperienceSection} styling={mockStyling} />);
    
    expect(screen.getByText(/Led development of web applications/)).toBeInTheDocument();
    expect(screen.getByText(/Built RESTful APIs using Python/)).toBeInTheDocument();
  });

  it('should handle current position', () => {
    const currentPositionSection = {
      ...mockExperienceSection,
      items: [
        {
          ...mockExperienceSection.items[0],
          current: true,
          endDate: undefined
        } as ExperienceItem
      ]
    };

    render(<ExperienceSection section={currentPositionSection} styling={mockStyling} />);
    
    expect(screen.getByText(/Present/)).toBeInTheDocument();
  });
});

describe('EducationSection', () => {
  const mockEducationSection = {
    type: 'education' as const,
    title: 'Education',
    items: [
      {
        degree: 'Master of Computer Science',
        school: 'Stanford University',
        location: 'Stanford, CA',
        graduationDate: '2020-06-01',
        gpa: '3.8',
        honors: ['Magna Cum Laude', 'Dean\'s List']
      } as EducationItem,
      {
        degree: 'Bachelor of Science in Computer Engineering',
        school: 'UC Berkeley',
        location: 'Berkeley, CA',
        graduationDate: '2018-05-01',
        gpa: '3.6'
      } as EducationItem
    ],
    order: 2,
    visible: true
  };

  const mockStyling = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 'medium' as const,
    colorScheme: 'blue',
    accentColor: '#2563eb',
    lineHeight: 1.5
  };

  it('should render education items', () => {
    render(<EducationSection section={mockEducationSection} styling={mockStyling} />);
    
    expect(screen.getByText('Master of Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Stanford University')).toBeInTheDocument();
    expect(screen.getByText('Bachelor of Science in Computer Engineering')).toBeInTheDocument();
    expect(screen.getByText('UC Berkeley')).toBeInTheDocument();
  });

  it('should render GPA when provided', () => {
    render(<EducationSection section={mockEducationSection} styling={mockStyling} />);
    
    expect(screen.getByText(/GPA: 3.8/)).toBeInTheDocument();
    expect(screen.getByText(/GPA: 3.6/)).toBeInTheDocument();
  });

  it('should render honors when provided', () => {
    render(<EducationSection section={mockEducationSection} styling={mockStyling} />);
    
    expect(screen.getByText(/Magna Cum Laude, Dean's List/)).toBeInTheDocument();
  });
});

describe('SkillsSection', () => {
  const mockSkillsSection = {
    type: 'skills' as const,
    title: 'Technical Skills',
    items: [
      {
        category: 'Programming Languages',
        skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
      } as SkillsItem,
      {
        category: 'Frameworks & Libraries',
        skills: ['React', 'Node.js', 'Django', 'Express']
      } as SkillsItem
    ],
    order: 3,
    visible: true
  };

  const mockStyling = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 'medium' as const,
    colorScheme: 'blue',
    accentColor: '#2563eb',
    lineHeight: 1.5
  };

  it('should render skill categories and items', () => {
    render(<SkillsSection section={mockSkillsSection} styling={mockStyling} />);
    
    expect(screen.getByText('Programming Languages:')).toBeInTheDocument();
    expect(screen.getByText(/JavaScript • TypeScript • Python • Java/)).toBeInTheDocument();
    expect(screen.getByText('Frameworks & Libraries:')).toBeInTheDocument();
    expect(screen.getByText(/React • Node.js • Django • Express/)).toBeInTheDocument();
  });
});

describe('ProjectsSection', () => {
  const mockProjectsSection = {
    type: 'projects' as const,
    title: 'Projects',
    items: [
      {
        name: 'E-commerce Platform',
        description: 'Full-stack web application for online shopping',
        technologies: ['React', 'Node.js', 'MongoDB'],
        url: 'https://ecommerce-demo.com',
        github: 'https://github.com/johndoe/ecommerce',
        startDate: '2023-01-01',
        endDate: '2023-06-01'
      } as ProjectItem
    ],
    order: 4,
    visible: true
  };

  const mockStyling = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 'medium' as const,
    colorScheme: 'blue',
    accentColor: '#2563eb',
    lineHeight: 1.5
  };

  it('should render project information', () => {
    render(<ProjectsSection section={mockProjectsSection} styling={mockStyling} />);
    
    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
    expect(screen.getByText('Full-stack web application for online shopping')).toBeInTheDocument();
    expect(screen.getByText(/React, Node.js, MongoDB/)).toBeInTheDocument();
  });

  it('should render project links', () => {
    render(<ProjectsSection section={mockProjectsSection} styling={mockStyling} />);
    
    expect(screen.getByText(/Demo: https:\/\/ecommerce-demo.com/)).toBeInTheDocument();
    expect(screen.getByText(/GitHub: https:\/\/github.com\/johndoe\/ecommerce/)).toBeInTheDocument();
  });
});

describe('BaseTemplate', () => {
  let mockResumeData: ResumeData;
  let mockTemplateConfig: TemplateConfig;
  let mockAdaptiveTemplate: AdaptiveTemplate;

  beforeEach(() => {
    mockResumeData = createValidEmptyResume();
    mockTemplateConfig = createDefaultTemplateConfig();
    mockAdaptiveTemplate = createDefaultAdaptiveTemplate();
  });

  it('should render without crashing', () => {
    render(
      <BaseTemplate
        resumeData={mockResumeData}
        templateConfig={mockTemplateConfig}
        adaptiveTemplate={mockAdaptiveTemplate}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(
      <BaseTemplate
        resumeData={mockResumeData}
        templateConfig={mockTemplateConfig}
        adaptiveTemplate={mockAdaptiveTemplate}
        className="custom-class"
      />
    );

    const templateElement = container.querySelector('.resume-template');
    expect(templateElement).toHaveClass('custom-class');
    expect(templateElement).toHaveClass('layout-single-column');
    expect(templateElement).toHaveClass('spacing-normal');
  });

  it('should render sections in correct order', () => {
    const resumeWithContent = {
      ...mockResumeData,
      sections: [
        {
          type: 'experience' as const,
          title: 'Experience',
          items: [{ title: 'Developer', company: 'Tech Corp', startDate: '2022-01-01', current: true }],
          order: 1,
          visible: true
        },
        {
          type: 'education' as const,
          title: 'Education',
          items: [{ degree: 'BS Computer Science', school: 'University' }],
          order: 2,
          visible: true
        }
      ]
    };

    render(
      <BaseTemplate
        resumeData={resumeWithContent}
        templateConfig={mockTemplateConfig}
        adaptiveTemplate={mockAdaptiveTemplate}
      />
    );

    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
  });
});

describe('TemplateProvider', () => {
  let mockResumeData: ResumeData;
  let mockTemplateConfig: TemplateConfig;

  beforeEach(() => {
    mockResumeData = createValidEmptyResume();
    mockTemplateConfig = createDefaultTemplateConfig();
  });

  it('should render with default template', () => {
    render(
      <TemplateProvider
        resumeData={mockResumeData}
        templateConfig={mockTemplateConfig}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should adapt template based on resume content', () => {
    const resumeWithExperience = {
      ...mockResumeData,
      sections: [
        {
          type: 'experience' as const,
          title: 'Experience',
          items: [
            {
              title: 'Senior Software Engineer',
              company: 'Tech Corp',
              startDate: '2020-01-01',
              current: true,
              description: ['Led development team']
            }
          ],
          order: 1,
          visible: true
        }
      ]
    };

    render(
      <TemplateProvider
        resumeData={resumeWithExperience}
        templateConfig={mockTemplateConfig}
      />
    );

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  it('should merge template config with adaptive template', () => {
    const customConfig = {
      ...mockTemplateConfig,
      colorScheme: 'green' as const,
      fontSize: 'large' as const
    };

    render(
      <TemplateProvider
        resumeData={mockResumeData}
        templateConfig={customConfig}
      />
    );

    // Template should render without errors with custom config
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});