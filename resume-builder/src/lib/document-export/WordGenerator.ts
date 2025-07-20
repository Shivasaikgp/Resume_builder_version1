import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, Table, TableRow, TableCell } from 'docx'
import { DocumentGeneratorOptions, ExportResult, ExportProgress } from './types'
import { ResumeData } from '@/types'

export class WordGenerator {
  /**
   * Generates a Word document from resume data
   */
  static async generate(options: DocumentGeneratorOptions): Promise<ExportResult> {
    const { resumeData, templateConfig, options: exportOptions, onProgress } = options
    
    try {
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing Word document generation...'
      })

      const doc = new Document({
        creator: 'Resume Builder AI',
        title: `${resumeData.personalInfo.fullName} - Resume`,
        description: 'Professional Resume',
        sections: [{
          properties: {},
          children: await this.generateDocumentContent(resumeData, templateConfig, onProgress)
        }]
      })

      onProgress?.({
        stage: 'generating',
        progress: 80,
        message: 'Generating Word document...'
      })

      const buffer = await Packer.toBuffer(doc)

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Word document generated successfully'
      })

      const filename = exportOptions.filename || 
        `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.docx`

      return {
        success: true,
        data: buffer,
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: buffer.length
      }

    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Word document generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      return {
        success: false,
        filename: exportOptions.filename || 'resume.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private static async generateDocumentContent(
    resumeData: ResumeData,
    templateConfig: any,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Paragraph[]> {
    const content: Paragraph[] = []

    onProgress?.({
      stage: 'rendering',
      progress: 20,
      message: 'Rendering header section...'
    })

    // Header section
    content.push(...this.createHeader(resumeData.personalInfo))

    onProgress?.({
      stage: 'rendering',
      progress: 40,
      message: 'Rendering resume sections...'
    })

    // Resume sections
    const sortedSections = resumeData.sections
      .filter(section => section.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    for (const section of sortedSections) {
      content.push(...this.createSection(section))
    }

    onProgress?.({
      stage: 'rendering',
      progress: 60,
      message: 'Finalizing document structure...'
    })

    return content
  }

  private static createHeader(personalInfo: ResumeData['personalInfo']): Paragraph[] {
    const header: Paragraph[] = []

    // Name
    header.push(new Paragraph({
      children: [
        new TextRun({
          text: personalInfo.fullName,
          bold: true,
          size: 32,
          color: '1e40af'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }))

    // Contact information
    const contactItems = [
      personalInfo.email,
      personalInfo.phone,
      personalInfo.location,
      personalInfo.linkedin && `LinkedIn: ${personalInfo.linkedin}`,
      personalInfo.github && `GitHub: ${personalInfo.github}`,
      personalInfo.website && `Website: ${personalInfo.website}`
    ].filter(Boolean)

    if (contactItems.length > 0) {
      header.push(new Paragraph({
        children: [
          new TextRun({
            text: contactItems.join(' • '),
            size: 20,
            color: '6b7280'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }))
    }

    // Separator line
    header.push(new Paragraph({
      children: [new TextRun({ text: '' })],
      border: {
        bottom: {
          color: '1e40af',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6
        }
      },
      spacing: { after: 300 }
    }))

    return header
  }

  private static createSection(section: ResumeData['sections'][0]): Paragraph[] {
    const sectionContent: Paragraph[] = []

    // Section title
    sectionContent.push(new Paragraph({
      children: [
        new TextRun({
          text: section.title.toUpperCase(),
          bold: true,
          size: 24,
          color: '1e40af'
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }))

    // Section items
    switch (section.type) {
      case 'experience':
        sectionContent.push(...this.createExperienceItems(section.items as any[]))
        break
      case 'education':
        sectionContent.push(...this.createEducationItems(section.items as any[]))
        break
      case 'skills':
        sectionContent.push(...this.createSkillsItems(section.items as any[]))
        break
      case 'projects':
        sectionContent.push(...this.createProjectItems(section.items as any[]))
        break
      default:
        sectionContent.push(...this.createGenericItems(section.items))
    }

    return sectionContent
  }

  private static createExperienceItems(items: any[]): Paragraph[] {
    const content: Paragraph[] = []

    for (const item of items) {
      // Job title and company
      content.push(new Paragraph({
        children: [
          new TextRun({
            text: item.title,
            bold: true,
            size: 22,
            color: '1f2937'
          }),
          new TextRun({
            text: ` at ${item.company}`,
            size: 22,
            color: '4b5563'
          }),
          ...(item.location ? [
            new TextRun({
              text: ` • ${item.location}`,
              size: 20,
              color: '6b7280',
              italics: true
            })
          ] : [])
        ],
        spacing: { before: 200, after: 100 }
      }))

      // Date range
      const dateRange = `${item.startDate} - ${item.current ? 'Present' : item.endDate || 'Present'}`
      content.push(new Paragraph({
        children: [
          new TextRun({
            text: dateRange,
            size: 20,
            color: '6b7280',
            italics: true
          })
        ],
        spacing: { after: 150 }
      }))

      // Description
      if (item.description && item.description.length > 0) {
        for (const desc of item.description) {
          content.push(new Paragraph({
            children: [
              new TextRun({
                text: `• ${desc}`,
                size: 20,
                color: '1f2937'
              })
            ],
            indent: { left: 360 },
            spacing: { after: 100 }
          }))
        }
      }

      content.push(new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: 200 }
      }))
    }

    return content
  }

  private static createEducationItems(items: any[]): Paragraph[] {
    const content: Paragraph[] = []

    for (const item of items) {
      // Degree and school
      content.push(new Paragraph({
        children: [
          new TextRun({
            text: item.degree,
            bold: true,
            size: 22,
            color: '1f2937'
          }),
          new TextRun({
            text: ` - ${item.school}`,
            size: 22,
            color: '4b5563'
          }),
          ...(item.location ? [
            new TextRun({
              text: ` • ${item.location}`,
              size: 20,
              color: '6b7280',
              italics: true
            })
          ] : [])
        ],
        spacing: { before: 200, after: 100 }
      }))

      // Additional details
      const details: string[] = []
      if (item.graduationDate) details.push(`Graduated: ${item.graduationDate}`)
      if (item.gpa) details.push(`GPA: ${item.gpa}`)
      if (item.honors && item.honors.length > 0) details.push(`Honors: ${item.honors.join(', ')}`)

      if (details.length > 0) {
        content.push(new Paragraph({
          children: [
            new TextRun({
              text: details.join(' • '),
              size: 20,
              color: '6b7280'
            })
          ],
          spacing: { after: 200 }
        }))
      }
    }

    return content
  }

  private static createSkillsItems(items: any[]): Paragraph[] {
    const content: Paragraph[] = []

    for (const item of items) {
      content.push(new Paragraph({
        children: [
          new TextRun({
            text: `${item.category}: `,
            bold: true,
            size: 20,
            color: '1f2937'
          }),
          new TextRun({
            text: item.skills.join(', '),
            size: 20,
            color: '4b5563'
          })
        ],
        spacing: { before: 100, after: 150 }
      }))
    }

    return content
  }

  private static createProjectItems(items: any[]): Paragraph[] {
    const content: Paragraph[] = []

    for (const item of items) {
      // Project name and links
      const nameChildren: TextRun[] = [
        new TextRun({
          text: item.name,
          bold: true,
          size: 22,
          color: '1f2937'
        })
      ]

      if (item.url) {
        nameChildren.push(new TextRun({
          text: ` (${item.url})`,
          size: 20,
          color: '1e40af'
        }))
      }

      if (item.github) {
        nameChildren.push(new TextRun({
          text: ` • GitHub: ${item.github}`,
          size: 20,
          color: '1e40af'
        }))
      }

      content.push(new Paragraph({
        children: nameChildren,
        spacing: { before: 200, after: 100 }
      }))

      // Description
      if (item.description) {
        content.push(new Paragraph({
          children: [
            new TextRun({
              text: item.description,
              size: 20,
              color: '1f2937'
            })
          ],
          spacing: { after: 100 }
        }))
      }

      // Technologies and dates
      const details: string[] = []
      if (item.technologies && item.technologies.length > 0) {
        details.push(`Technologies: ${item.technologies.join(', ')}`)
      }
      if (item.startDate || item.endDate) {
        const dateRange = `${item.startDate || ''} ${item.startDate && item.endDate ? '-' : ''} ${item.endDate || ''}`
        details.push(`Duration: ${dateRange.trim()}`)
      }

      if (details.length > 0) {
        content.push(new Paragraph({
          children: [
            new TextRun({
              text: details.join(' • '),
              size: 20,
              color: '6b7280'
            })
          ],
          spacing: { after: 200 }
        }))
      }
    }

    return content
  }

  private static createGenericItems(items: any[]): Paragraph[] {
    const content: Paragraph[] = []

    for (const item of items) {
      if (typeof item === 'string') {
        content.push(new Paragraph({
          children: [
            new TextRun({
              text: `• ${item}`,
              size: 20,
              color: '1f2937'
            })
          ],
          indent: { left: 360 },
          spacing: { after: 100 }
        }))
      } else {
        // Handle object items
        const entries = Object.entries(item)
        for (const [key, value] of entries) {
          content.push(new Paragraph({
            children: [
              new TextRun({
                text: `${key}: `,
                bold: true,
                size: 20,
                color: '1f2937'
              }),
              new TextRun({
                text: String(value),
                size: 20,
                color: '4b5563'
              })
            ],
            spacing: { after: 100 }
          }))
        }
      }
    }

    return content
  }
}