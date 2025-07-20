import { PDFParser } from './pdf-parser'
import { WordParser } from './word-parser'
import { ParsedResumeData, FileUpload, ParseError } from '@/types/parsing'

export class ContentExtractor {
  private pdfParser: PDFParser
  private wordParser: WordParser

  constructor() {
    this.pdfParser = new PDFParser()
    this.wordParser = new WordParser()
  }

  async extractContent(file: FileUpload): Promise<ParsedResumeData> {
    try {
      // Validate file
      this.validateFile(file)

      // Extract content based on file type
      let parsedData: ParsedResumeData

      if (file.mimetype === 'application/pdf') {
        parsedData = await this.pdfParser.extractStructuredData(file.buffer)
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        parsedData = await this.wordParser.extractStructuredData(file.buffer)
      } else {
        throw new Error(`Unsupported file type: ${file.mimetype}`)
      }

      // Post-process the data
      return this.postProcessData(parsedData)
    } catch (error) {
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private validateFile(file: FileUpload): void {
    const errors: ParseError[] = []

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push({
        type: 'validation',
        message: 'File size exceeds 10MB limit',
        severity: 'high'
      })
    }

    // Check file type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]

    if (!supportedTypes.includes(file.mimetype)) {
      errors.push({
        type: 'format',
        message: `Unsupported file type: ${file.mimetype}. Supported types: PDF, DOCX, DOC`,
        severity: 'high'
      })
    }

    // Check filename
    if (!file.filename || file.filename.length === 0) {
      errors.push({
        type: 'validation',
        message: 'Filename is required',
        severity: 'medium'
      })
    }

    if (errors.length > 0) {
      throw new Error(`File validation failed: ${errors.map(e => e.message).join(', ')}`)
    }
  }

  private postProcessData(data: ParsedResumeData): ParsedResumeData {
    // Clean and normalize personal info
    if (data.personalInfo.email) {
      data.personalInfo.email = data.personalInfo.email.toLowerCase().trim()
    }

    if (data.personalInfo.phone) {
      data.personalInfo.phone = this.normalizePhoneNumber(data.personalInfo.phone)
    }

    if (data.personalInfo.fullName) {
      data.personalInfo.fullName = this.normalizeFullName(data.personalInfo.fullName)
    }

    // Normalize URLs
    if (data.personalInfo.linkedin) {
      data.personalInfo.linkedin = this.normalizeLinkedInUrl(data.personalInfo.linkedin)
    }

    if (data.personalInfo.github) {
      data.personalInfo.github = this.normalizeGitHubUrl(data.personalInfo.github)
    }

    if (data.personalInfo.website) {
      data.personalInfo.website = this.normalizeWebsiteUrl(data.personalInfo.website)
    }

    // Clean sections
    data.sections = data.sections.map(section => ({
      ...section,
      content: this.cleanSectionContent(section.type, section.content)
    }))

    return data
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Format US phone numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    
    return phone.trim()
  }

  private normalizeFullName(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
      .trim()
  }

  private normalizeLinkedInUrl(url: string): string {
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    
    // Ensure it's a proper LinkedIn URL
    if (url.includes('linkedin.com/in/')) {
      return url
    } else if (url.includes('linkedin.com/')) {
      // Try to fix common LinkedIn URL formats
      const match = url.match(/linkedin\.com\/(?:pub\/|profile\/view\?id=)?([A-Za-z0-9-]+)/)
      if (match) {
        return `https://linkedin.com/in/${match[1]}`
      }
    }
    
    return url
  }

  private normalizeGitHubUrl(url: string): string {
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    
    // Ensure it's a proper GitHub URL
    if (url.includes('github.com/')) {
      return url
    }
    
    return url
  }

  private normalizeWebsiteUrl(url: string): string {
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    
    return url
  }

  private cleanSectionContent(sectionType: string, content: any[]): any[] {
    switch (sectionType) {
      case 'experience':
        return content.map(exp => ({
          ...exp,
          title: exp.title?.trim(),
          company: exp.company?.trim(),
          location: exp.location?.trim(),
          description: exp.description?.map((desc: string) => desc.trim()).filter((desc: string) => desc.length > 0)
        }))
      
      case 'education':
        return content.map(edu => ({
          ...edu,
          degree: edu.degree?.trim(),
          school: edu.school?.trim(),
          location: edu.location?.trim(),
          graduationDate: edu.graduationDate?.trim()
        }))
      
      case 'skills':
        return content.map(skill => ({
          ...skill,
          category: skill.category?.trim(),
          skills: skill.skills?.map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        }))
      
      case 'projects':
        return content.map(project => ({
          ...project,
          name: project.name?.trim(),
          description: project.description?.trim(),
          technologies: project.technologies?.map((tech: string) => tech.trim()).filter((tech: string) => tech.length > 0)
        }))
      
      default:
        return content
    }
  }

  // Utility method to get supported file types
  static getSupportedFileTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
  }

  // Utility method to check if file type is supported
  static isSupportedFileType(mimetype: string): boolean {
    return this.getSupportedFileTypes().includes(mimetype)
  }
}