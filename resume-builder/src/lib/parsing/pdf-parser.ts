import pdfParse from 'pdf-parse'
import { ParsedResumeData, ParseError } from '@/types/parsing'

export class PDFParser {
  async parse(buffer: Buffer): Promise<{ text: string; metadata?: any }> {
    try {
      const data = await pdfParse(buffer)
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version
        }
      }
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async extractStructuredData(buffer: Buffer): Promise<ParsedResumeData> {
    const { text, metadata } = await this.parse(buffer)
    
    // Basic text cleaning
    const cleanedText = this.cleanText(text)
    
    // Extract sections using pattern matching
    const sections = this.extractSections(cleanedText)
    
    // Extract personal information
    const personalInfo = this.extractPersonalInfo(cleanedText)
    
    return {
      personalInfo,
      sections,
      rawText: text,
      confidence: this.calculateConfidence(sections, personalInfo)
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  private extractPersonalInfo(text: string) {
    const personalInfo: any = {}
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
    if (emailMatch) {
      personalInfo.email = emailMatch[0]
    }
    
    // Extract phone number
    const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/)
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[0]
    }
    
    // Extract LinkedIn
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/profile\/view\?id=)([A-Za-z0-9-]+)/i)
    if (linkedinMatch) {
      personalInfo.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`
    }
    
    // Extract GitHub
    const githubMatch = text.match(/(?:github\.com\/)([A-Za-z0-9-]+)/i)
    if (githubMatch) {
      personalInfo.github = `https://github.com/${githubMatch[1]}`
    }
    
    // Extract name (first line that's not contact info)
    const lines = text.split('\n').filter(line => line.trim())
    for (const line of lines) {
      if (line.length > 2 && line.length < 50 && 
          !line.includes('@') && 
          !line.match(/\d{3}/) && 
          !line.toLowerCase().includes('resume') &&
          !line.toLowerCase().includes('cv')) {
        personalInfo.fullName = line.trim()
        break
      }
    }
    
    return personalInfo
  }

  private extractSections(text: string) {
    const sections = []
    const sectionPatterns = {
      experience: /(?:work\s+)?experience|employment|professional\s+experience|career\s+history/i,
      education: /education|academic|qualifications|degrees?/i,
      skills: /skills|technical\s+skills|competencies|technologies|proficiencies/i,
      projects: /projects?|portfolio|work\s+samples/i,
      certifications: /certifications?|certificates?|licenses?/i
    }
    
    const lines = text.split('\n')
    let currentSection = null
    let currentContent = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Check if this line is a section header
      let foundSection = null
      for (const [sectionType, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(line)) {
          foundSection = sectionType
          break
        }
      }
      
      if (foundSection) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          sections.push({
            type: currentSection as any,
            title: this.formatSectionTitle(currentSection),
            content: this.parseContent(currentSection, currentContent),
            confidence: 0.8,
            rawContent: currentContent.join('\n')
          })
        }
        
        // Start new section
        currentSection = foundSection
        currentContent = []
      } else if (currentSection) {
        currentContent.push(line)
      }
    }
    
    // Add final section
    if (currentSection && currentContent.length > 0) {
      sections.push({
        type: currentSection as any,
        title: this.formatSectionTitle(currentSection),
        content: this.parseContent(currentSection, currentContent),
        confidence: 0.8,
        rawContent: currentContent.join('\n')
      })
    }
    
    return sections
  }

  private formatSectionTitle(sectionType: string): string {
    const titleMap: Record<string, string> = {
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      projects: 'Projects',
      certifications: 'Certifications'
    }
    return titleMap[sectionType] || sectionType.charAt(0).toUpperCase() + sectionType.slice(1)
  }

  private parseContent(sectionType: string, content: string[]) {
    switch (sectionType) {
      case 'experience':
        return this.parseExperience(content)
      case 'education':
        return this.parseEducation(content)
      case 'skills':
        return this.parseSkills(content)
      case 'projects':
        return this.parseProjects(content)
      default:
        return content.map(line => ({ content: line }))
    }
  }

  private parseExperience(content: string[]) {
    const experiences = []
    let currentExp: any = {}
    
    for (const line of content) {
      // Check if this looks like a job title/company line
      if (line.match(/^[A-Z][^.]*(?:at|@|\|)\s*[A-Z]/)) {
        if (Object.keys(currentExp).length > 0) {
          experiences.push(currentExp)
        }
        
        const parts = line.split(/\s+(?:at|@|\|)\s+/)
        currentExp = {
          title: parts[0]?.trim(),
          company: parts[1]?.trim()
        }
      } else if (line.match(/\d{4}|\d{1,2}\/\d{4}/)) {
        // Date line
        const dates = line.match(/(\d{1,2}\/\d{4}|\w+\s+\d{4}|\d{4})/g)
        if (dates && dates.length >= 1) {
          currentExp.startDate = dates[0]
          if (dates.length > 1) {
            currentExp.endDate = dates[1]
          }
        }
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        // Bullet point
        if (!currentExp.description) {
          currentExp.description = []
        }
        currentExp.description.push(line.replace(/^[•\-*]\s*/, ''))
      }
    }
    
    if (Object.keys(currentExp).length > 0) {
      experiences.push(currentExp)
    }
    
    return experiences
  }

  private parseEducation(content: string[]) {
    const education = []
    let currentEdu: any = {}
    
    for (const line of content) {
      if (line.match(/bachelor|master|phd|doctorate|associate|diploma|certificate/i)) {
        if (Object.keys(currentEdu).length > 0) {
          education.push(currentEdu)
        }
        currentEdu = { degree: line.trim() }
      } else if (line.match(/university|college|school|institute/i)) {
        currentEdu.school = line.trim()
      } else if (line.match(/\d{4}/)) {
        currentEdu.graduationDate = line.trim()
      } else if (line.match(/gpa|grade/i)) {
        currentEdu.gpa = line.trim()
      }
    }
    
    if (Object.keys(currentEdu).length > 0) {
      education.push(currentEdu)
    }
    
    return education
  }

  private parseSkills(content: string[]) {
    const skills = []
    let currentCategory = 'Technical Skills'
    let skillsList = []
    
    for (const line of content) {
      if (line.includes(':') && !line.includes(',')) {
        // This might be a category
        if (skillsList.length > 0) {
          skills.push({
            category: currentCategory,
            skills: skillsList
          })
        }
        currentCategory = line.replace(':', '').trim()
        skillsList = []
      } else {
        // Parse skills from line
        const lineSkills = line.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 0)
        skillsList.push(...lineSkills)
      }
    }
    
    if (skillsList.length > 0) {
      skills.push({
        category: currentCategory,
        skills: skillsList
      })
    }
    
    return skills
  }

  private parseProjects(content: string[]) {
    const projects = []
    let currentProject: any = {}
    
    for (const line of content) {
      if (line.match(/^[A-Z][^.]*(?:\s-\s|:)/)) {
        if (Object.keys(currentProject).length > 0) {
          projects.push(currentProject)
        }
        
        const parts = line.split(/\s-\s|:/)
        currentProject = {
          name: parts[0]?.trim(),
          description: parts[1]?.trim()
        }
      } else if (line.match(/github|git|repo/i)) {
        currentProject.github = line.trim()
      } else if (line.match(/http|www/)) {
        currentProject.url = line.trim()
      } else if (line.includes('Technologies:') || line.includes('Tech:')) {
        const techPart = line.split(':')[1]
        if (techPart) {
          currentProject.technologies = techPart.split(',').map(t => t.trim())
        }
      }
    }
    
    if (Object.keys(currentProject).length > 0) {
      projects.push(currentProject)
    }
    
    return projects
  }

  private calculateConfidence(sections: any[], personalInfo: any): number {
    let score = 0
    let maxScore = 0
    
    // Personal info scoring
    maxScore += 5
    if (personalInfo.fullName) score += 1
    if (personalInfo.email) score += 1
    if (personalInfo.phone) score += 1
    if (personalInfo.linkedin) score += 1
    if (personalInfo.github) score += 1
    
    // Sections scoring
    maxScore += sections.length * 2
    sections.forEach(section => {
      if (section.content && section.content.length > 0) {
        score += 2
      }
    })
    
    return maxScore > 0 ? Math.min(score / maxScore, 1) : 0
  }
}