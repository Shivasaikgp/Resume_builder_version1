// Demo script to show parsing functionality
import { ResumeParser } from './resume-parser'
import { FileUpload } from '@/types/parsing'

export async function demoResumeParsing() {
  console.log('Resume Parsing Demo')
  console.log('==================')
  
  // Create a mock PDF file upload
  const mockPDFContent = `
John Doe
john.doe@example.com
(555) 123-4567
New York, NY
linkedin.com/in/johndoe
github.com/johndoe

EXPERIENCE

Software Engineer at Tech Corp
January 2020 - Present
• Developed and maintained web applications using React and Node.js
• Led a team of 5 developers on multiple projects
• Improved application performance by 40%

Junior Developer at StartupCo
June 2018 - December 2019
• Built responsive web interfaces using HTML, CSS, and JavaScript
• Collaborated with designers and product managers
• Participated in code reviews and agile development processes

EDUCATION

Bachelor of Science in Computer Science
University of Technology
Graduated: May 2018
GPA: 3.8/4.0

SKILLS

Programming Languages: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Django
Databases: PostgreSQL, MongoDB, Redis
Tools: Git, Docker, AWS, Jenkins

PROJECTS

E-commerce Platform
• Built a full-stack e-commerce application using React and Node.js
• Implemented payment processing with Stripe API
• Technologies: React, Node.js, PostgreSQL, Stripe
• GitHub: github.com/johndoe/ecommerce-platform

Task Management App
• Developed a collaborative task management application
• Features include real-time updates and team collaboration
• Technologies: React, Socket.io, MongoDB
• Live Demo: taskapp.johndoe.com
`

  const mockFileUpload: FileUpload = {
    filename: 'john-doe-resume.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from(mockPDFContent),
    size: mockPDFContent.length
  }

  try {
    const parser = new ResumeParser()
    
    console.log('Parsing resume...')
    const result = await parser.parseResume({ file: mockFileUpload })
    
    console.log('\nParsing Result:')
    console.log('Success:', result.success)
    
    if (result.success && result.data) {
      console.log('\nPersonal Information:')
      console.log('- Name:', result.data.personalInfo.fullName)
      console.log('- Email:', result.data.personalInfo.email)
      console.log('- Phone:', result.data.personalInfo.phone)
      console.log('- Location:', result.data.personalInfo.location)
      console.log('- LinkedIn:', result.data.personalInfo.linkedin)
      console.log('- GitHub:', result.data.personalInfo.github)
      
      console.log('\nSections Found:')
      result.data.sections.forEach((section, index) => {
        console.log(`${index + 1}. ${section.title} (${section.type}) - ${section.items.length} items`)
      })
      
      // Show experience details
      const experienceSection = result.data.sections.find(s => s.type === 'experience')
      if (experienceSection) {
        console.log('\nExperience Details:')
        experienceSection.items.forEach((exp: any, index) => {
          console.log(`  ${index + 1}. ${exp.title} at ${exp.company}`)
          console.log(`     Duration: ${exp.startDate} - ${exp.endDate || 'Present'}`)
          if (exp.description && exp.description.length > 0) {
            console.log(`     Responsibilities: ${exp.description.length} bullet points`)
          }
        })
      }
      
      // Show skills
      const skillsSection = result.data.sections.find(s => s.type === 'skills')
      if (skillsSection) {
        console.log('\nSkills:')
        skillsSection.items.forEach((skillGroup: any) => {
          console.log(`  ${skillGroup.category}: ${skillGroup.skills.join(', ')}`)
        })
      }
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:')
      result.errors.forEach(error => {
        console.log(`- ${error.message} (${error.severity})`)
      })
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\nWarnings:')
      result.warnings.forEach(warning => {
        console.log(`- ${warning}`)
      })
    }
    
    // Show parsing statistics
    const stats = parser.getParsingStats(result)
    console.log('\nParsing Statistics:')
    console.log('- Confidence:', (stats.confidence * 100).toFixed(1) + '%')
    console.log('- Sections Found:', stats.sectionsFound)
    console.log('- Errors Count:', stats.errorsCount)
    console.log('- Warnings Count:', stats.warningsCount)
    console.log('- Completeness:', (stats.completeness * 100).toFixed(1) + '%')
    
  } catch (error) {
    console.error('Demo failed:', error)
  }
}

// Export supported file types info
export function showSupportedFormats() {
  console.log('\nSupported File Formats:')
  console.log('- PDF (.pdf)')
  console.log('- Word Document (.docx)')
  console.log('- Word Document Legacy (.doc)')
  console.log('\nFile Size Limit: 10MB')
  console.log('Batch Limit: 5 files')
}

// Show API endpoints
export function showAPIEndpoints() {
  console.log('\nAPI Endpoints:')
  console.log('- POST /api/documents/parse - Parse single resume')
  console.log('- POST /api/documents/parse/batch - Parse multiple resumes')
  console.log('- GET /api/documents/parse - Get API information')
  console.log('- GET /api/documents/parse/batch - Get batch API information')
}