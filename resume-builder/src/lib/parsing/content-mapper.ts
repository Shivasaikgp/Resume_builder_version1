import { ParsedResumeData, ContentMapping, ParseError } from '@/types/parsing'
import { ResumeData, PersonalInfo, ResumeSection, ExperienceItem, EducationItem, SkillsItem, ProjectItem } from '@/types/database'

export class ContentMapper {
  async mapToResumeData(parsedData: ParsedResumeData): Promise<{
    resumeData: ResumeData
    mappings: ContentMapping[]
    errors: ParseError[]
    warnings: string[]
  }> {
    const mappings: ContentMapping[] = []
    const errors: ParseError[] = []
    const warnings: string[] = []

    try {
      // Map personal information
      const personalInfo = this.mapPersonalInfo(parsedData.personalInfo, mappings, errors, warnings)

      // Map sections
      const sections = this.mapSections(parsedData.sections, mappings, errors, warnings)

      const resumeData: ResumeData = {
        personalInfo,
        sections
      }

      return {
        resumeData,
        mappings,
        errors,
        warnings
      }
    } catch (error) {
      errors.push({
        type: 'content',
        message: `Content mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      })

      // Return minimal valid structure
      return {
        resumeData: {
          personalInfo: {
            fullName: '',
            email: ''
          },
          sections: []
        },
        mappings,
        errors,
        warnings
      }
    }
  }

  private mapPersonalInfo(
    parsedInfo: any,
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): PersonalInfo {
    const personalInfo: PersonalInfo = {
      fullName: '',
      email: ''
    }

    // Map full name
    if (parsedInfo.fullName) {
      personalInfo.fullName = parsedInfo.fullName
      mappings.push({
        originalText: parsedInfo.fullName,
        mappedValue: parsedInfo.fullName,
        confidence: 0.9,
        section: 'personalInfo',
        field: 'fullName'
      })
    } else {
      errors.push({
        type: 'content',
        message: 'Full name not found in resume',
        section: 'personalInfo',
        field: 'fullName',
        severity: 'high'
      })
    }

    // Map email
    if (parsedInfo.email) {
      if (this.isValidEmail(parsedInfo.email)) {
        personalInfo.email = parsedInfo.email
        mappings.push({
          originalText: parsedInfo.email,
          mappedValue: parsedInfo.email,
          confidence: 0.95,
          section: 'personalInfo',
          field: 'email'
        })
      } else {
        errors.push({
          type: 'validation',
          message: `Invalid email format: ${parsedInfo.email}`,
          section: 'personalInfo',
          field: 'email',
          severity: 'medium'
        })
      }
    } else {
      errors.push({
        type: 'content',
        message: 'Email not found in resume',
        section: 'personalInfo',
        field: 'email',
        severity: 'high'
      })
    }

    // Map optional fields
    if (parsedInfo.phone) {
      personalInfo.phone = parsedInfo.phone
      mappings.push({
        originalText: parsedInfo.phone,
        mappedValue: parsedInfo.phone,
        confidence: 0.8,
        section: 'personalInfo',
        field: 'phone'
      })
    }

    if (parsedInfo.location) {
      personalInfo.location = parsedInfo.location
      mappings.push({
        originalText: parsedInfo.location,
        mappedValue: parsedInfo.location,
        confidence: 0.7,
        section: 'personalInfo',
        field: 'location'
      })
    }

    if (parsedInfo.linkedin) {
      if (this.isValidUrl(parsedInfo.linkedin)) {
        personalInfo.linkedin = parsedInfo.linkedin
        mappings.push({
          originalText: parsedInfo.linkedin,
          mappedValue: parsedInfo.linkedin,
          confidence: 0.9,
          section: 'personalInfo',
          field: 'linkedin'
        })
      } else {
        warnings.push(`Invalid LinkedIn URL format: ${parsedInfo.linkedin}`)
      }
    }

    if (parsedInfo.github) {
      if (this.isValidUrl(parsedInfo.github)) {
        personalInfo.github = parsedInfo.github
        mappings.push({
          originalText: parsedInfo.github,
          mappedValue: parsedInfo.github,
          confidence: 0.9,
          section: 'personalInfo',
          field: 'github'
        })
      } else {
        warnings.push(`Invalid GitHub URL format: ${parsedInfo.github}`)
      }
    }

    if (parsedInfo.website) {
      if (this.isValidUrl(parsedInfo.website)) {
        personalInfo.website = parsedInfo.website
        mappings.push({
          originalText: parsedInfo.website,
          mappedValue: parsedInfo.website,
          confidence: 0.8,
          section: 'personalInfo',
          field: 'website'
        })
      } else {
        warnings.push(`Invalid website URL format: ${parsedInfo.website}`)
      }
    }

    return personalInfo
  }

  private mapSections(
    parsedSections: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): ResumeSection[] {
    const sections: ResumeSection[] = []

    for (let i = 0; i < parsedSections.length; i++) {
      const parsedSection = parsedSections[i]
      
      try {
        const section = this.mapSection(parsedSection, mappings, errors, warnings)
        if (section) {
          section.order = i
          sections.push(section)
        }
      } catch (error) {
        errors.push({
          type: 'content',
          message: `Failed to map section "${parsedSection.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          section: parsedSection.title,
          severity: 'medium'
        })
      }
    }

    return sections
  }

  private mapSection(
    parsedSection: any,
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): ResumeSection | null {
    if (!parsedSection.content || parsedSection.content.length === 0) {
      warnings.push(`Section "${parsedSection.title}" has no content`)
      return null
    }

    const section: ResumeSection = {
      type: parsedSection.type,
      title: parsedSection.title,
      items: [],
      visible: true
    }

    switch (parsedSection.type) {
      case 'experience':
        section.items = this.mapExperienceItems(parsedSection.content, mappings, errors, warnings)
        break
      case 'education':
        section.items = this.mapEducationItems(parsedSection.content, mappings, errors, warnings)
        break
      case 'skills':
        section.items = this.mapSkillsItems(parsedSection.content, mappings, errors, warnings)
        break
      case 'projects':
        section.items = this.mapProjectItems(parsedSection.content, mappings, errors, warnings)
        break
      case 'certifications':
        section.items = this.mapCertificationItems(parsedSection.content, mappings, errors, warnings)
        break
      default:
        section.items = this.mapCustomItems(parsedSection.content, mappings, errors, warnings)
        break
    }

    return section
  }

  private mapExperienceItems(
    content: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): ExperienceItem[] {
    return content.map((item, index) => {
      const experience: ExperienceItem = {
        title: item.title || '',
        company: item.company || '',
        location: item.location,
        startDate: item.startDate || '',
        endDate: item.endDate,
        current: item.current || false,
        description: item.description || []
      }

      // Validate required fields
      if (!experience.title) {
        errors.push({
          type: 'validation',
          message: `Experience item ${index + 1} missing job title`,
          section: 'experience',
          field: 'title',
          severity: 'medium'
        })
      }

      if (!experience.company) {
        errors.push({
          type: 'validation',
          message: `Experience item ${index + 1} missing company name`,
          section: 'experience',
          field: 'company',
          severity: 'medium'
        })
      }

      if (!experience.startDate) {
        warnings.push(`Experience item ${index + 1} missing start date`)
      }

      // Add mappings
      if (item.title) {
        mappings.push({
          originalText: item.title,
          mappedValue: experience.title,
          confidence: 0.9,
          section: 'experience',
          field: 'title'
        })
      }

      return experience
    })
  }

  private mapEducationItems(
    content: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): EducationItem[] {
    return content.map((item, index) => {
      const education: EducationItem = {
        degree: item.degree || '',
        school: item.school || '',
        location: item.location,
        graduationDate: item.graduationDate,
        gpa: item.gpa,
        honors: item.honors
      }

      // Validate required fields
      if (!education.degree) {
        errors.push({
          type: 'validation',
          message: `Education item ${index + 1} missing degree`,
          section: 'education',
          field: 'degree',
          severity: 'medium'
        })
      }

      if (!education.school) {
        errors.push({
          type: 'validation',
          message: `Education item ${index + 1} missing school name`,
          section: 'education',
          field: 'school',
          severity: 'medium'
        })
      }

      // Add mappings
      if (item.degree) {
        mappings.push({
          originalText: item.degree,
          mappedValue: education.degree,
          confidence: 0.9,
          section: 'education',
          field: 'degree'
        })
      }

      return education
    })
  }

  private mapSkillsItems(
    content: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): SkillsItem[] {
    return content.map((item, index) => {
      const skills: SkillsItem = {
        category: item.category || 'Skills',
        skills: item.skills || []
      }

      // Validate
      if (!skills.skills || skills.skills.length === 0) {
        errors.push({
          type: 'validation',
          message: `Skills category ${index + 1} has no skills listed`,
          section: 'skills',
          field: 'skills',
          severity: 'medium'
        })
      }

      // Add mappings
      if (item.skills) {
        mappings.push({
          originalText: item.skills.join(', '),
          mappedValue: skills.skills,
          confidence: 0.8,
          section: 'skills',
          field: 'skills'
        })
      }

      return skills
    })
  }

  private mapProjectItems(
    content: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): ProjectItem[] {
    return content.map((item, index) => {
      const project: ProjectItem = {
        name: item.name || '',
        description: item.description,
        technologies: item.technologies,
        url: item.url,
        github: item.github,
        startDate: item.startDate,
        endDate: item.endDate
      }

      // Validate required fields
      if (!project.name) {
        errors.push({
          type: 'validation',
          message: `Project ${index + 1} missing name`,
          section: 'projects',
          field: 'name',
          severity: 'medium'
        })
      }

      // Validate URLs
      if (project.url && !this.isValidUrl(project.url)) {
        warnings.push(`Project ${index + 1} has invalid URL: ${project.url}`)
        project.url = ''
      }

      if (project.github && !this.isValidUrl(project.github)) {
        warnings.push(`Project ${index + 1} has invalid GitHub URL: ${project.github}`)
        project.github = ''
      }

      // Add mappings
      if (item.name) {
        mappings.push({
          originalText: item.name,
          mappedValue: project.name,
          confidence: 0.9,
          section: 'projects',
          field: 'name'
        })
      }

      return project
    })
  }

  private mapCertificationItems(
    content: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): any[] {
    return content.map((item, index) => {
      const certification = {
        name: item.name || item.content || '',
        issuer: item.issuer || '',
        date: item.date || '',
        url: item.url || ''
      }

      if (!certification.name) {
        errors.push({
          type: 'validation',
          message: `Certification ${index + 1} missing name`,
          section: 'certifications',
          field: 'name',
          severity: 'medium'
        })
      }

      return certification
    })
  }

  private mapCustomItems(
    content: any[],
    mappings: ContentMapping[],
    errors: ParseError[],
    warnings: string[]
  ): any[] {
    return content.map(item => {
      if (typeof item === 'string') {
        return { content: item }
      }
      return item
    })
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}