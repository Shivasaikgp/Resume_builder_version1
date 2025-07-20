import { ResumeData, ResumeDataSchema } from '@/types/database'
import { ParseError, ValidationResult } from '@/types/parsing'

export class ResumeValidator {
  validateResumeData(data: ResumeData): ValidationResult {
    const errors: ParseError[] = []
    const warnings: string[] = []

    try {
      // Use Zod schema validation
      const result = ResumeDataSchema.safeParse(data)
      
      if (!result.success) {
        result.error.issues.forEach(issue => {
          errors.push({
            type: 'validation',
            message: issue.message,
            field: issue.path.join('.'),
            severity: this.getSeverityFromIssue(issue)
          })
        })
      }

      // Additional custom validations
      this.validatePersonalInfo(data.personalInfo, errors, warnings)
      this.validateSections(data.sections, errors, warnings)

      const confidence = this.calculateValidationConfidence(data, errors, warnings)

      return {
        isValid: errors.filter(e => e.severity === 'high').length === 0,
        errors,
        warnings,
        confidence
      }
    } catch (error) {
      errors.push({
        type: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      })

      return {
        isValid: false,
        errors,
        warnings,
        confidence: 0
      }
    }
  }

  private getSeverityFromIssue(issue: any): 'low' | 'medium' | 'high' {
    // Map Zod issue codes to severity levels
    const highSeverityIssues = ['invalid_type', 'too_small', 'too_big']
    const mediumSeverityIssues = ['invalid_string', 'invalid_date']
    
    if (highSeverityIssues.includes(issue.code)) {
      return 'high'
    } else if (mediumSeverityIssues.includes(issue.code)) {
      return 'medium'
    }
    
    return 'low'
  }

  private validatePersonalInfo(personalInfo: any, errors: ParseError[], warnings: string[]) {
    // Check for required fields
    if (!personalInfo.fullName || personalInfo.fullName.trim().length === 0) {
      errors.push({
        type: 'validation',
        message: 'Full name is required',
        section: 'personalInfo',
        field: 'fullName',
        severity: 'high'
      })
    }

    if (!personalInfo.email || personalInfo.email.trim().length === 0) {
      errors.push({
        type: 'validation',
        message: 'Email is required',
        section: 'personalInfo',
        field: 'email',
        severity: 'high'
      })
    }

    // Validate email format
    if (personalInfo.email && !this.isValidEmail(personalInfo.email)) {
      errors.push({
        type: 'validation',
        message: 'Invalid email format',
        section: 'personalInfo',
        field: 'email',
        severity: 'high'
      })
    }

    // Validate URLs
    if (personalInfo.linkedin && !this.isValidUrl(personalInfo.linkedin)) {
      errors.push({
        type: 'validation',
        message: 'Invalid LinkedIn URL format',
        section: 'personalInfo',
        field: 'linkedin',
        severity: 'medium'
      })
    }

    if (personalInfo.github && !this.isValidUrl(personalInfo.github)) {
      errors.push({
        type: 'validation',
        message: 'Invalid GitHub URL format',
        section: 'personalInfo',
        field: 'github',
        severity: 'medium'
      })
    }

    if (personalInfo.website && !this.isValidUrl(personalInfo.website)) {
      errors.push({
        type: 'validation',
        message: 'Invalid website URL format',
        section: 'personalInfo',
        field: 'website',
        severity: 'medium'
      })
    }

    // Warnings for missing optional but recommended fields
    if (!personalInfo.phone) {
      warnings.push('Phone number is recommended for better contact options')
    }

    if (!personalInfo.location) {
      warnings.push('Location information is recommended for job matching')
    }
  }

  private validateSections(sections: any[], errors: ParseError[], warnings: string[]) {
    if (!sections || sections.length === 0) {
      errors.push({
        type: 'validation',
        message: 'Resume must have at least one section',
        section: 'sections',
        severity: 'high'
      })
      return
    }

    // Check for essential sections
    const sectionTypes = sections.map(s => s.type)
    const essentialSections = ['experience', 'education']
    
    essentialSections.forEach(essentialType => {
      if (!sectionTypes.includes(essentialType)) {
        warnings.push(`Missing recommended section: ${essentialType}`)
      }
    })

    // Validate each section
    sections.forEach((section, index) => {
      this.validateSection(section, index, errors, warnings)
    })
  }

  private validateSection(section: any, index: number, errors: ParseError[], warnings: string[]) {
    const sectionId = `section_${index}`

    // Check required fields
    if (!section.type) {
      errors.push({
        type: 'validation',
        message: `Section ${index + 1} missing type`,
        section: sectionId,
        field: 'type',
        severity: 'high'
      })
    }

    if (!section.title || section.title.trim().length === 0) {
      errors.push({
        type: 'validation',
        message: `Section ${index + 1} missing title`,
        section: sectionId,
        field: 'title',
        severity: 'high'
      })
    }

    if (!section.items || section.items.length === 0) {
      warnings.push(`Section "${section.title}" has no items`)
      return
    }

    // Validate section items based on type
    switch (section.type) {
      case 'experience':
        this.validateExperienceItems(section.items, sectionId, errors, warnings)
        break
      case 'education':
        this.validateEducationItems(section.items, sectionId, errors, warnings)
        break
      case 'skills':
        this.validateSkillsItems(section.items, sectionId, errors, warnings)
        break
      case 'projects':
        this.validateProjectItems(section.items, sectionId, errors, warnings)
        break
    }
  }

  private validateExperienceItems(items: any[], sectionId: string, errors: ParseError[], warnings: string[]) {
    items.forEach((item, index) => {
      const itemId = `${sectionId}_item_${index}`

      if (!item.title || item.title.trim().length === 0) {
        errors.push({
          type: 'validation',
          message: `Experience item ${index + 1} missing job title`,
          section: itemId,
          field: 'title',
          severity: 'medium'
        })
      }

      if (!item.company || item.company.trim().length === 0) {
        errors.push({
          type: 'validation',
          message: `Experience item ${index + 1} missing company name`,
          section: itemId,
          field: 'company',
          severity: 'medium'
        })
      }

      if (!item.startDate || item.startDate.trim().length === 0) {
        warnings.push(`Experience item ${index + 1} missing start date`)
      }

      if (!item.description || item.description.length === 0) {
        warnings.push(`Experience item ${index + 1} has no job description`)
      } else if (item.description.length < 2) {
        warnings.push(`Experience item ${index + 1} has very brief description`)
      }
    })
  }

  private validateEducationItems(items: any[], sectionId: string, errors: ParseError[], warnings: string[]) {
    items.forEach((item, index) => {
      const itemId = `${sectionId}_item_${index}`

      if (!item.degree || item.degree.trim().length === 0) {
        errors.push({
          type: 'validation',
          message: `Education item ${index + 1} missing degree`,
          section: itemId,
          field: 'degree',
          severity: 'medium'
        })
      }

      if (!item.school || item.school.trim().length === 0) {
        errors.push({
          type: 'validation',
          message: `Education item ${index + 1} missing school name`,
          section: itemId,
          field: 'school',
          severity: 'medium'
        })
      }

      if (!item.graduationDate) {
        warnings.push(`Education item ${index + 1} missing graduation date`)
      }
    })
  }

  private validateSkillsItems(items: any[], sectionId: string, errors: ParseError[], warnings: string[]) {
    items.forEach((item, index) => {
      const itemId = `${sectionId}_item_${index}`

      if (!item.category || item.category.trim().length === 0) {
        warnings.push(`Skills item ${index + 1} missing category`)
      }

      if (!item.skills || item.skills.length === 0) {
        errors.push({
          type: 'validation',
          message: `Skills item ${index + 1} has no skills listed`,
          section: itemId,
          field: 'skills',
          severity: 'medium'
        })
      } else if (item.skills.length < 3) {
        warnings.push(`Skills item ${index + 1} has very few skills listed`)
      }
    })
  }

  private validateProjectItems(items: any[], sectionId: string, errors: ParseError[], warnings: string[]) {
    items.forEach((item, index) => {
      const itemId = `${sectionId}_item_${index}`

      if (!item.name || item.name.trim().length === 0) {
        errors.push({
          type: 'validation',
          message: `Project item ${index + 1} missing name`,
          section: itemId,
          field: 'name',
          severity: 'medium'
        })
      }

      if (!item.description || item.description.trim().length === 0) {
        warnings.push(`Project item ${index + 1} missing description`)
      }

      if (item.url && !this.isValidUrl(item.url)) {
        errors.push({
          type: 'validation',
          message: `Project item ${index + 1} has invalid URL`,
          section: itemId,
          field: 'url',
          severity: 'low'
        })
      }

      if (item.github && !this.isValidUrl(item.github)) {
        errors.push({
          type: 'validation',
          message: `Project item ${index + 1} has invalid GitHub URL`,
          section: itemId,
          field: 'github',
          severity: 'low'
        })
      }
    })
  }

  private calculateValidationConfidence(data: ResumeData, errors: ParseError[], warnings: string[]): number {
    let score = 1.0

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'high':
          score -= 0.3
          break
        case 'medium':
          score -= 0.1
          break
        case 'low':
          score -= 0.05
          break
      }
    })

    // Deduct smaller amounts for warnings
    score -= warnings.length * 0.02

    // Bonus points for completeness
    if (data.personalInfo.phone) score += 0.05
    if (data.personalInfo.location) score += 0.05
    if (data.personalInfo.linkedin) score += 0.05
    if (data.personalInfo.github) score += 0.05

    // Bonus for having multiple sections
    if (data.sections.length >= 3) score += 0.1
    if (data.sections.length >= 4) score += 0.05

    return Math.max(0, Math.min(1, score))
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