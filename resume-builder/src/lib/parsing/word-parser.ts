import mammoth from 'mammoth'
import { ParsedResumeData } from '@/types/parsing'

export class WordParser {
  async parse(buffer: Buffer): Promise<{ text: string; html?: string }> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      const htmlResult = await mammoth.convertToHtml({ buffer })
      
      return {
        text: result.value,
        html: htmlResult.value
      }
    } catch (error) {
      throw new Error(`Word document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async extractStructuredData(buffer: Buffer): Promise<ParsedResumeData> {
    const { text, html } = await this.parse(buffer)
    
    // Clean the text
    const cleanedText = this.cleanText(text)
    
    // Extract sections using pattern matching
    const sections = this.extractSections(cleanedText, html)
    
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
      .replace(/\t/g, ' ')
      .trim()
  }

  private extractPersonalInfo(text: string) {
    const personalInfo: any = {}
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
    if (emailMatch) {
      personalInfo.email = emailMatch[0]
    }
    
    // Extract phone number (more comprehensive patterns for Word docs)
    const phonePatterns = [
      /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
      /(\+\d{1,3}[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/,
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/
    ]
    
    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern)
      if (phoneMatch) {
        personalInfo.phone = phoneMatch[0]
        break
      }
    }
    
    // Extract LinkedIn
    const linkedinPatterns = [
      /(?:linkedin\.com\/in\/|linkedin\.com\/profile\/view\?id=)([A-Za-z0-9-]+)/i,
      /linkedin\.com\/pub\/([A-Za-z0-9-]+)/i,
      /(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9-]+)/i
    ]
    
    for (const pattern of linkedinPatterns) {
      const linkedinMatch = text.match(pattern)
      if (linkedinMatch) {
        personalInfo.linkedin = linkedinMatch[0].startsWith('http') ? 
          linkedinMatch[0] : `https://${linkedinMatch[0]}`
        break
      }
    }
    
    // Extract GitHub
    const githubPatterns = [
      /(?:github\.com\/)([A-Za-z0-9-]+)/i,
      /(?:www\.)?github\.com\/([A-Za-z0-9-]+)/i
    ]
    
    for (const pattern of githubPatterns) {
      const githubMatch = text.match(pattern)
      if (githubMatch) {
        personalInfo.github = githubMatch[0].startsWith('http') ? 
          githubMatch[0] : `https://${githubMatch[0]}`
        break
      }
    }
    
    // Extract website
    const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g)
    if (websiteMatch) {
      // Filter out common social media and email domains
      const filteredWebsites = websiteMatch.filter(url => 
        !url.includes('linkedin.com') && 
        !url.includes('github.com') && 
        !url.includes('@') &&
        !url.includes('facebook.com') &&
        !url.includes('twitter.com') &&
        !url.includes('instagram.com')
      )
      if (filteredWebsites.length > 0) {
        personalInfo.website = filteredWebsites[0].startsWith('http') ? 
          filteredWebsites[0] : `https://${filteredWebsites[0]}`
      }
    }
    
    // Extract name (improved logic for Word docs)
    const lines = text.split('\n').filter(line => line.trim())
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim()
      if (this.isLikelyName(line)) {
        personalInfo.fullName = line
        break
      }
    }
    
    // Extract location (common patterns in resumes)
    const locationPatterns = [
      /([A-Za-z\s]+),\s*([A-Z]{2})\s*\d{5}/,  // City, State ZIP
      /([A-Za-z\s]+),\s*([A-Z]{2})/,          // City, State
      /([A-Za-z\s]+),\s*([A-Za-z\s]+)/       // City, Country
    ]
    
    for (const pattern of locationPatterns) {
      const locationMatch = text.match(pattern)
      if (locationMatch && !locationMatch[0].includes('@')) {
        personalInfo.location = locationMatch[0]
        break
      }
    }
    
    return personalInfo
  }

  private isLikelyName(line: string): boolean {
    // Check if line looks like a name
    return line.length > 2 && 
           line.length < 50 && 
           !line.includes('@') && 
           !line.match(/\d{3}/) && 
           !line.toLowerCase().includes('resume') &&
           !line.toLowerCase().includes('cv') &&
           !line.toLowerCase().includes('curriculum') &&
           !line.includes('http') &&
           !line.includes('www') &&
           /^[A-Z]/.test(line) &&
           line.split(' ').length <= 4 &&
           line.split(' ').every(word => /^[A-Za-z'-]+$/.test(word))
  }

  private extractSections(text: string, html?: string) {
    const sections = []
    const sectionPatterns = {
      experience: /(?:work\s+)?experience|employment|professional\s+experience|career\s+history|work\s+history/i,
      education: /education|academic|qualifications|degrees?|schooling/i,
      skills: /skills|technical\s+skills|competencies|technologies|proficiencies|expertise/i,
      projects: /projects?|portfolio|work\s+samples|personal\s+projects/i,
      certifications: /certifications?|certificates?|licenses?|credentials/i,
      summary: /summary|profile|objective|about|overview/i,
      achievements: /achievements?|accomplishments?|awards?|honors?/i
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
        if (pattern.test(line) && this.isLikelySectionHeader(line)) {
          foundSection = sectionType
          break
        }
      }
      
      if (foundSection) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          sections.push({
            type: this.mapSectionType(currentSection),
            title: this.formatSectionTitle(currentSection),
            content: this.parseContent(currentSection, currentContent),
            confidence: this.calculateSectionConfidence(currentSection, currentContent),
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
        type: this.mapSectionType(currentSection),
        title: this.formatSectionTitle(currentSection),
        content: this.parseContent(currentSection, currentContent),
        confidence: this.calculateSectionConfidence(currentSection, currentContent),
        rawContent: currentContent.join('\n')
      })
    }
    
    return sections
  }

  private isLikelySectionHeader(line: string): boolean {
    // Check if line looks like a section header
    return line.length < 50 &&
           !line.includes('@') &&
           !line.match(/\d{4}/) &&
           (line === line.toUpperCase() || 
            /^[A-Z][a-z\s]+$/.test(line) ||
            line.endsWith(':'))
  }

  private mapSectionType(sectionType: string): any {
    const typeMap: Record<string, string> = {
      summary: 'custom',
      achievements: 'custom'
    }
    return typeMap[sectionType] || sectionType
  }

  private formatSectionTitle(sectionType: string): string {
    const titleMap: Record<string, string> = {
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      projects: 'Projects',
      certifications: 'Certifications',
      summary: 'Professional Summary',
      achievements: 'Achievements'
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
      case 'certifications':
        return this.parseCertifications(content)
      default:
        return content.map(line => ({ content: line }))
    }
  }

  private parseExperience(content: string[]) {
    const experiences = []
    let currentExp: any = {}
    let inDescription = false
    
    for (const line of content) {
      // Check if this looks like a job title/company line
      if (this.isJobTitleLine(line)) {
        if (Object.keys(currentExp).length > 0) {
          experiences.push(currentExp)
        }
        
        const parsed = this.parseJobTitleLine(line)
        currentExp = parsed
        inDescription = false
      } else if (this.isDateLine(line)) {
        // Date line
        const dates = this.parseDateLine(line)
        Object.assign(currentExp, dates)
      } else if (this.isBulletPoint(line)) {
        // Bullet point
        if (!currentExp.description) {
          currentExp.description = []
        }
        currentExp.description.push(this.cleanBulletPoint(line))
        inDescription = true
      } else if (inDescription && line.length > 10) {
        // Continuation of description
        if (!currentExp.description) {
          currentExp.description = []
        }
        currentExp.description.push(line)
      }
    }
    
    if (Object.keys(currentExp).length > 0) {
      experiences.push(currentExp)
    }
    
    return experiences
  }

  private isJobTitleLine(line: string): boolean {
    return (line.includes(' at ') || line.includes(' @ ') || line.includes(' | ')) &&
           !line.match(/^\d/) &&
           line.length > 5 &&
           line.length < 100
  }

  private parseJobTitleLine(line: string) {
    const separators = [' at ', ' @ ', ' | ', ' - ']
    let title = ''
    let company = ''
    
    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep)
        title = parts[0]?.trim() || ''
        company = parts[1]?.trim() || ''
        break
      }
    }
    
    return { title, company }
  }

  private isDateLine(line: string): boolean {
    return /\d{4}|\d{1,2}\/\d{4}|\w+\s+\d{4}/.test(line) &&
           line.length < 50
  }

  private parseDateLine(line: string) {
    const dates = line.match(/(\d{1,2}\/\d{4}|\w+\s+\d{4}|\d{4})/g)
    const result: any = {}
    
    if (dates && dates.length >= 1) {
      result.startDate = dates[0]
      if (dates.length > 1) {
        result.endDate = dates[1]
      } else if (line.toLowerCase().includes('present') || line.toLowerCase().includes('current')) {
        result.current = true
      }
    }
    
    return result
  }

  private isBulletPoint(line: string): boolean {
    return /^[•\-*▪▫◦‣⁃]\s/.test(line) || 
           /^\d+\.\s/.test(line) ||
           (line.startsWith('- ') || line.startsWith('• '))
  }

  private cleanBulletPoint(line: string): string {
    return line.replace(/^[•\-*▪▫◦‣⁃]\s*/, '').replace(/^\d+\.\s*/, '').trim()
  }

  private parseEducation(content: string[]) {
    const education = []
    let currentEdu: any = {}
    
    for (const line of content) {
      if (this.isDegreeeLine(line)) {
        if (Object.keys(currentEdu).length > 0) {
          education.push(currentEdu)
        }
        currentEdu = { degree: line.trim() }
      } else if (this.isSchoolLine(line)) {
        currentEdu.school = line.trim()
      } else if (this.isDateLine(line)) {
        currentEdu.graduationDate = line.trim()
      } else if (line.toLowerCase().includes('gpa') || line.toLowerCase().includes('grade')) {
        currentEdu.gpa = line.trim()
      } else if (line.toLowerCase().includes('honor') || line.toLowerCase().includes('magna') || line.toLowerCase().includes('summa')) {
        if (!currentEdu.honors) {
          currentEdu.honors = []
        }
        currentEdu.honors.push(line.trim())
      }
    }
    
    if (Object.keys(currentEdu).length > 0) {
      education.push(currentEdu)
    }
    
    return education
  }

  private isDegreeeLine(line: string): boolean {
    return /bachelor|master|phd|doctorate|associate|diploma|certificate|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?/i.test(line)
  }

  private isSchoolLine(line: string): boolean {
    return /university|college|school|institute|academy/i.test(line)
  }

  private parseSkills(content: string[]) {
    const skills = []
    let currentCategory = 'Technical Skills'
    let skillsList: string[] = []
    
    for (const line of content) {
      if (line.includes(':') && !line.includes(',') && line.split(':')[0].length < 30) {
        // This might be a category
        if (skillsList.length > 0) {
          skills.push({
            category: currentCategory,
            skills: skillsList
          })
        }
        currentCategory = line.split(':')[0].trim()
        const afterColon = line.split(':')[1]?.trim()
        skillsList = afterColon ? afterColon.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 0) : []
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
      if (this.isProjectTitleLine(line)) {
        if (Object.keys(currentProject).length > 0) {
          projects.push(currentProject)
        }
        
        const parts = line.split(/\s-\s|:\s/)
        currentProject = {
          name: parts[0]?.trim(),
          description: parts[1]?.trim()
        }
      } else if (line.toLowerCase().includes('github') || line.toLowerCase().includes('git') || line.toLowerCase().includes('repo')) {
        const urlMatch = line.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          currentProject.github = urlMatch[0]
        }
      } else if (line.match(/https?:\/\//) && !line.toLowerCase().includes('github')) {
        currentProject.url = line.match(/https?:\/\/[^\s]+/)?.[0]
      } else if (line.toLowerCase().includes('technolog') || line.toLowerCase().includes('tech:') || line.toLowerCase().includes('built with')) {
        const techPart = line.split(/technolog[^:]*:|tech:|built with/i)[1]
        if (techPart) {
          currentProject.technologies = techPart.split(/[,;|]/).map(t => t.trim()).filter(t => t.length > 0)
        }
      } else if (this.isDateLine(line)) {
        const dates = this.parseDateLine(line)
        if (dates.startDate) currentProject.startDate = dates.startDate
        if (dates.endDate) currentProject.endDate = dates.endDate
      }
    }
    
    if (Object.keys(currentProject).length > 0) {
      projects.push(currentProject)
    }
    
    return projects
  }

  private isProjectTitleLine(line: string): boolean {
    return line.length > 3 && 
           line.length < 100 && 
           !line.startsWith('http') &&
           (line.includes(' - ') || line.includes(': ') || /^[A-Z][a-zA-Z\s]+$/.test(line))
  }

  private parseCertifications(content: string[]) {
    return content.map(line => ({
      name: line.trim(),
      issuer: '', // Could be enhanced to extract issuer
      date: '' // Could be enhanced to extract date
    }))
  }

  private calculateSectionConfidence(sectionType: string, content: string[]): number {
    let confidence = 0.5 // Base confidence
    
    if (content.length > 0) confidence += 0.2
    if (content.length > 3) confidence += 0.1
    
    // Section-specific confidence boosts
    switch (sectionType) {
      case 'experience':
        if (content.some(line => this.isJobTitleLine(line))) confidence += 0.2
        if (content.some(line => this.isDateLine(line))) confidence += 0.1
        break
      case 'education':
        if (content.some(line => this.isDegreeeLine(line))) confidence += 0.2
        if (content.some(line => this.isSchoolLine(line))) confidence += 0.1
        break
      case 'skills':
        if (content.some(line => line.includes(':'))) confidence += 0.1
        if (content.some(line => line.includes(','))) confidence += 0.1
        break
    }
    
    return Math.min(confidence, 1)
  }

  private calculateConfidence(sections: any[], personalInfo: any): number {
    let score = 0
    let maxScore = 0
    
    // Personal info scoring
    maxScore += 6
    if (personalInfo.fullName) score += 1
    if (personalInfo.email) score += 1
    if (personalInfo.phone) score += 1
    if (personalInfo.linkedin) score += 1
    if (personalInfo.github) score += 1
    if (personalInfo.location) score += 1
    
    // Sections scoring
    maxScore += sections.length * 2
    sections.forEach(section => {
      if (section.content && section.content.length > 0) {
        score += 1
      }
      if (section.confidence > 0.7) {
        score += 1
      }
    })
    
    return maxScore > 0 ? Math.min(score / maxScore, 1) : 0
  }
}