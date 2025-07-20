import { ResumeData, TemplateConfig } from '@/types'
import { RenderedTemplate } from './types'

export class TemplateRenderer {
  /**
   * Renders resume data into HTML/CSS for document generation
   */
  static async render(
    resumeData: ResumeData,
    templateConfig: TemplateConfig
  ): Promise<RenderedTemplate> {
    const html = this.generateHTML(resumeData, templateConfig)
    const css = this.generateCSS(templateConfig)
    const metadata = this.generateMetadata(resumeData)

    return {
      html,
      css,
      metadata
    }
  }

  private static generateHTML(resumeData: ResumeData, templateConfig: TemplateConfig): string {
    const { personalInfo, sections } = resumeData
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${personalInfo.fullName} - Resume</title>
        <style>${this.generateCSS(templateConfig)}</style>
      </head>
      <body>
        <div class="resume-container">
          ${this.renderHeader(personalInfo)}
          ${this.renderSections(sections)}
        </div>
      </body>
      </html>
    `
  }

  private static renderHeader(personalInfo: ResumeData['personalInfo']): string {
    const { fullName, email, phone, location, linkedin, github, website } = personalInfo
    
    const contactItems = [
      email,
      phone,
      location,
      linkedin && `LinkedIn: ${linkedin}`,
      github && `GitHub: ${github}`,
      website && `Website: ${website}`
    ].filter(Boolean)

    return `
      <header class="resume-header">
        <h1 class="name">${fullName}</h1>
        <div class="contact-info">
          ${contactItems.map(item => `<span class="contact-item">${item}</span>`).join('')}
        </div>
      </header>
    `
  }

  private static renderSections(sections: ResumeData['sections']): string {
    return sections
      .filter(section => section.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(section => this.renderSection(section))
      .join('')
  }

  private static renderSection(section: ResumeData['sections'][0]): string {
    return `
      <section class="resume-section section-${section.type}">
        <h2 class="section-title">${section.title}</h2>
        <div class="section-content">
          ${this.renderSectionItems(section)}
        </div>
      </section>
    `
  }

  private static renderSectionItems(section: ResumeData['sections'][0]): string {
    switch (section.type) {
      case 'experience':
        return this.renderExperienceItems(section.items as any[])
      case 'education':
        return this.renderEducationItems(section.items as any[])
      case 'skills':
        return this.renderSkillsItems(section.items as any[])
      case 'projects':
        return this.renderProjectItems(section.items as any[])
      default:
        return this.renderGenericItems(section.items)
    }
  }

  private static renderExperienceItems(items: any[]): string {
    return items.map(item => `
      <div class="experience-item">
        <div class="item-header">
          <h3 class="job-title">${item.title}</h3>
          <span class="company">${item.company}</span>
          ${item.location ? `<span class="location">${item.location}</span>` : ''}
        </div>
        <div class="date-range">
          ${item.startDate} - ${item.current ? 'Present' : item.endDate || 'Present'}
        </div>
        ${item.description && item.description.length > 0 ? `
          <ul class="description-list">
            ${item.description.map((desc: string) => `<li>${desc}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')
  }

  private static renderEducationItems(items: any[]): string {
    return items.map(item => `
      <div class="education-item">
        <div class="item-header">
          <h3 class="degree">${item.degree}</h3>
          <span class="school">${item.school}</span>
          ${item.location ? `<span class="location">${item.location}</span>` : ''}
        </div>
        ${item.graduationDate ? `<div class="graduation-date">${item.graduationDate}</div>` : ''}
        ${item.gpa ? `<div class="gpa">GPA: ${item.gpa}</div>` : ''}
        ${item.honors && item.honors.length > 0 ? `
          <div class="honors">
            <strong>Honors:</strong> ${item.honors.join(', ')}
          </div>
        ` : ''}
      </div>
    `).join('')
  }

  private static renderSkillsItems(items: any[]): string {
    return items.map(item => `
      <div class="skills-category">
        <h4 class="category-name">${item.category}</h4>
        <div class="skills-list">
          ${item.skills.map((skill: string) => `<span class="skill-item">${skill}</span>`).join('')}
        </div>
      </div>
    `).join('')
  }

  private static renderProjectItems(items: any[]): string {
    return items.map(item => `
      <div class="project-item">
        <div class="item-header">
          <h3 class="project-name">${item.name}</h3>
          ${item.url ? `<a href="${item.url}" class="project-link">View Project</a>` : ''}
          ${item.github ? `<a href="${item.github}" class="github-link">GitHub</a>` : ''}
        </div>
        ${item.description ? `<p class="project-description">${item.description}</p>` : ''}
        ${item.technologies && item.technologies.length > 0 ? `
          <div class="technologies">
            <strong>Technologies:</strong> ${item.technologies.join(', ')}
          </div>
        ` : ''}
        ${item.startDate || item.endDate ? `
          <div class="project-dates">
            ${item.startDate || ''} ${item.startDate && item.endDate ? '-' : ''} ${item.endDate || ''}
          </div>
        ` : ''}
      </div>
    `).join('')
  }

  private static renderGenericItems(items: any[]): string {
    return items.map(item => {
      if (typeof item === 'string') {
        return `<div class="generic-item">${item}</div>`
      }
      
      return `
        <div class="generic-item">
          ${Object.entries(item).map(([key, value]) => 
            `<div class="item-field"><strong>${key}:</strong> ${value}</div>`
          ).join('')}
        </div>
      `
    }).join('')
  }

  private static generateCSS(templateConfig: TemplateConfig): string {
    const { colorScheme, fontSize, spacing } = templateConfig
    
    const colors = this.getColorScheme(colorScheme)
    const fontSizes = this.getFontSizes(fontSize)
    const spacingValues = this.getSpacing(spacing)

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: ${fontSizes.base};
        line-height: 1.6;
        color: ${colors.text};
        background: white;
      }

      .resume-container {
        max-width: 8.5in;
        margin: 0 auto;
        padding: ${spacingValues.page};
        background: white;
      }

      .resume-header {
        text-align: center;
        margin-bottom: ${spacingValues.section};
        padding-bottom: ${spacingValues.element};
        border-bottom: 2px solid ${colors.accent};
      }

      .name {
        font-size: ${fontSizes.h1};
        font-weight: bold;
        color: ${colors.primary};
        margin-bottom: ${spacingValues.small};
      }

      .contact-info {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: ${spacingValues.small};
      }

      .contact-item {
        font-size: ${fontSizes.small};
        color: ${colors.secondary};
      }

      .contact-item:not(:last-child)::after {
        content: ' • ';
        margin-left: ${spacingValues.small};
      }

      .resume-section {
        margin-bottom: ${spacingValues.section};
      }

      .section-title {
        font-size: ${fontSizes.h2};
        font-weight: bold;
        color: ${colors.primary};
        margin-bottom: ${spacingValues.element};
        padding-bottom: ${spacingValues.small};
        border-bottom: 1px solid ${colors.border};
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .section-content {
        margin-left: ${spacingValues.indent};
      }

      .experience-item,
      .education-item,
      .project-item {
        margin-bottom: ${spacingValues.element};
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: ${spacingValues.small};
        flex-wrap: wrap;
      }

      .job-title,
      .degree,
      .project-name {
        font-size: ${fontSizes.h3};
        font-weight: bold;
        color: ${colors.primary};
      }

      .company,
      .school {
        font-weight: 600;
        color: ${colors.secondary};
      }

      .location {
        font-style: italic;
        color: ${colors.muted};
        font-size: ${fontSizes.small};
      }

      .date-range,
      .graduation-date {
        font-size: ${fontSizes.small};
        color: ${colors.muted};
        font-weight: 500;
      }

      .description-list {
        margin: ${spacingValues.small} 0;
        padding-left: ${spacingValues.indent};
      }

      .description-list li {
        margin-bottom: ${spacingValues.tiny};
      }

      .skills-category {
        margin-bottom: ${spacingValues.element};
      }

      .category-name {
        font-size: ${fontSizes.h4};
        font-weight: bold;
        color: ${colors.primary};
        margin-bottom: ${spacingValues.small};
      }

      .skills-list {
        display: flex;
        flex-wrap: wrap;
        gap: ${spacingValues.small};
      }

      .skill-item {
        background: ${colors.background};
        padding: ${spacingValues.tiny} ${spacingValues.small};
        border-radius: 4px;
        font-size: ${fontSizes.small};
        border: 1px solid ${colors.border};
      }

      .project-link,
      .github-link {
        color: ${colors.accent};
        text-decoration: none;
        font-size: ${fontSizes.small};
        margin-left: ${spacingValues.small};
      }

      .project-link:hover,
      .github-link:hover {
        text-decoration: underline;
      }

      .project-description {
        margin: ${spacingValues.small} 0;
        color: ${colors.text};
      }

      .technologies {
        font-size: ${fontSizes.small};
        color: ${colors.secondary};
        margin-top: ${spacingValues.small};
      }

      .project-dates {
        font-size: ${fontSizes.small};
        color: ${colors.muted};
        margin-top: ${spacingValues.small};
      }

      .gpa,
      .honors {
        font-size: ${fontSizes.small};
        color: ${colors.secondary};
        margin-top: ${spacingValues.small};
      }

      .generic-item {
        margin-bottom: ${spacingValues.element};
      }

      .item-field {
        margin-bottom: ${spacingValues.small};
      }

      @media print {
        body {
          font-size: 11pt;
        }
        
        .resume-container {
          padding: 0.5in;
        }
        
        .resume-section {
          break-inside: avoid;
        }
        
        .experience-item,
        .education-item,
        .project-item {
          break-inside: avoid;
        }
      }
    `
  }

  private static getColorScheme(scheme: string) {
    const schemes = {
      blue: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#60a5fa',
        text: '#1f2937',
        muted: '#6b7280',
        border: '#e5e7eb',
        background: '#f3f4f6'
      },
      green: {
        primary: '#166534',
        secondary: '#16a34a',
        accent: '#4ade80',
        text: '#1f2937',
        muted: '#6b7280',
        border: '#e5e7eb',
        background: '#f0fdf4'
      },
      purple: {
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        accent: '#a78bfa',
        text: '#1f2937',
        muted: '#6b7280',
        border: '#e5e7eb',
        background: '#faf5ff'
      },
      gray: {
        primary: '#374151',
        secondary: '#4b5563',
        accent: '#6b7280',
        text: '#1f2937',
        muted: '#6b7280',
        border: '#e5e7eb',
        background: '#f9fafb'
      },
      black: {
        primary: '#000000',
        secondary: '#1f2937',
        accent: '#374151',
        text: '#1f2937',
        muted: '#6b7280',
        border: '#e5e7eb',
        background: '#f9fafb'
      }
    }
    
    return schemes[scheme as keyof typeof schemes] || schemes.blue
  }

  private static getFontSizes(size: string) {
    const sizes = {
      small: {
        base: '10pt',
        small: '9pt',
        h1: '18pt',
        h2: '14pt',
        h3: '12pt',
        h4: '11pt'
      },
      medium: {
        base: '11pt',
        small: '10pt',
        h1: '20pt',
        h2: '16pt',
        h3: '13pt',
        h4: '12pt'
      },
      large: {
        base: '12pt',
        small: '11pt',
        h1: '22pt',
        h2: '18pt',
        h3: '14pt',
        h4: '13pt'
      }
    }
    
    return sizes[size as keyof typeof sizes] || sizes.medium
  }

  private static getSpacing(spacing: string) {
    const spacings = {
      compact: {
        page: '0.5in',
        section: '16pt',
        element: '8pt',
        small: '4pt',
        tiny: '2pt',
        indent: '16pt'
      },
      normal: {
        page: '0.75in',
        section: '20pt',
        element: '12pt',
        small: '6pt',
        tiny: '3pt',
        indent: '20pt'
      },
      relaxed: {
        page: '1in',
        section: '24pt',
        element: '16pt',
        small: '8pt',
        tiny: '4pt',
        indent: '24pt'
      }
    }
    
    return spacings[spacing as keyof typeof spacings] || spacings.normal
  }

  private static generateMetadata(resumeData: ResumeData) {
    return {
      title: `${resumeData.personalInfo.fullName} - Resume`,
      author: resumeData.personalInfo.fullName,
      subject: 'Professional Resume',
      creator: 'Resume Builder AI'
    }
  }
}