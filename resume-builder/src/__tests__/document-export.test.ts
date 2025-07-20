import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DocumentExportService } from '@/lib/document-export'
import { TemplateRenderer } from '@/lib/document-export/TemplateRenderer'
import { PDFGenerator } from '@/lib/document-export/PDFGenerator'
import { WordGenerator } from '@/lib/document-export/WordGenerator'
import { ResumeData, TemplateConfig } from '@/types'

// Mock the generators
vi.mock('@/lib/document-export/PDFGenerator')
vi.mock('@/lib/document-export/WordGenerator')
vi.mock('@/lib/document-export/TemplateRenderer')

const mockResumeData: ResumeData = {
  personalInfo: {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    location: 'New York, NY',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    website: 'https://johndoe.dev'
  },
  sections: [
    {
      type: 'experience',
      title: 'Professional Experience',
      items: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          startDate: '2022-01',
          endDate: '2024-01',
          current: false,
          description: [
            'Led development of microservices architecture',
            'Mentored junior developers',
            'Improved system performance by 40%'
          ]
        }
      ],
      order: 1,
      visible: true
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        {
          degree: 'Bachelor of Science in Computer Science',
          school: 'University of Technology',
          location: 'Boston, MA',
          graduationDate: '2020-05',
          gpa: '3.8',
          honors: ['Magna Cum Laude', 'Dean\'s List']
        }
      ],
      order: 2,
      visible: true
    },
    {
      type: 'skills',
      title: 'Technical Skills',
      items: [
        {
          category: 'Programming Languages',
          skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
        },
        {
          category: 'Frameworks',
          skills: ['React', 'Node.js', 'Express', 'Django']
        }
      ],
      order: 3,
      visible: true
    }
  ]
}

const mockTemplateConfig: TemplateConfig = {
  layout: 'modern',
  colorScheme: 'blue',
  fontSize: 'medium',
  spacing: 'normal',
  showPhoto: false
}

describe('DocumentExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('exportDocument', () => {
    it('should export PDF successfully', async () => {
      const mockPDFResult = {
        success: true,
        data: Buffer.from('mock-pdf-data'),
        filename: 'John_Doe_Resume.pdf',
        mimeType: 'application/pdf',
        size: 1024
      }

      vi.mocked(PDFGenerator.generate).mockResolvedValue(mockPDFResult)

      const result = await DocumentExportService.exportDocument(
        mockResumeData,
        mockTemplateConfig,
        { format: 'pdf' }
      )

      expect(result).toEqual(mockPDFResult)
      expect(PDFGenerator.generate).toHaveBeenCalledWith({
        resumeData: mockResumeData,
        templateConfig: mockTemplateConfig,
        options: { format: 'pdf' },
        onProgress: undefined
      })
    })

    it('should export Word document successfully', async () => {
      const mockWordResult = {
        success: true,
        data: Buffer.from('mock-docx-data'),
        filename: 'John_Doe_Resume.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048
      }

      vi.mocked(WordGenerator.generate).mockResolvedValue(mockWordResult)

      const result = await DocumentExportService.exportDocument(
        mockResumeData,
        mockTemplateConfig,
        { format: 'docx' }
      )

      expect(result).toEqual(mockWordResult)
      expect(WordGenerator.generate).toHaveBeenCalledWith({
        resumeData: mockResumeData,
        templateConfig: mockTemplateConfig,
        options: { format: 'docx' },
        onProgress: undefined
      })
    })

    it('should handle export errors gracefully', async () => {
      const mockError = new Error('Export failed')
      vi.mocked(PDFGenerator.generate).mockRejectedValue(mockError)

      const result = await DocumentExportService.exportDocument(
        mockResumeData,
        mockTemplateConfig,
        { format: 'pdf' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Export failed')
      expect(result.filename).toBe('resume.pdf')
    })

    it('should validate input data', async () => {
      const invalidResumeData = {
        ...mockResumeData,
        personalInfo: { ...mockResumeData.personalInfo, fullName: '' }
      }

      const result = await DocumentExportService.exportDocument(
        invalidResumeData,
        mockTemplateConfig,
        { format: 'pdf' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('full name is required')
    })

    it('should handle unsupported format', async () => {
      const result = await DocumentExportService.exportDocument(
        mockResumeData,
        mockTemplateConfig,
        { format: 'txt' as any }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported format')
    })

    it('should call progress callback', async () => {
      const mockProgressCallback = vi.fn()
      const mockPDFResult = {
        success: true,
        data: Buffer.from('mock-pdf-data'),
        filename: 'test.pdf',
        mimeType: 'application/pdf'
      }

      vi.mocked(PDFGenerator.generate).mockImplementation(async (options) => {
        options.onProgress?.({
          stage: 'generating',
          progress: 50,
          message: 'Generating PDF...'
        })
        return mockPDFResult
      })

      await DocumentExportService.exportDocument(
        mockResumeData,
        mockTemplateConfig,
        { format: 'pdf' },
        mockProgressCallback
      )

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'preparing',
        progress: 5,
        message: 'Starting document export...'
      })
    })
  })

  describe('exportMultipleFormats', () => {
    it('should export multiple formats successfully', async () => {
      const mockPDFResult = {
        success: true,
        data: Buffer.from('mock-pdf-data'),
        filename: 'John_Doe_Resume.pdf',
        mimeType: 'application/pdf'
      }

      const mockWordResult = {
        success: true,
        data: Buffer.from('mock-docx-data'),
        filename: 'John_Doe_Resume.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }

      vi.mocked(PDFGenerator.generate).mockResolvedValue(mockPDFResult)
      vi.mocked(WordGenerator.generate).mockResolvedValue(mockWordResult)

      const results = await DocumentExportService.exportMultipleFormats(
        mockResumeData,
        mockTemplateConfig,
        ['pdf', 'docx'],
        {}
      )

      expect(results.pdf).toEqual(mockPDFResult)
      expect(results.docx).toEqual(mockWordResult)
    })

    it('should handle partial failures in batch export', async () => {
      const mockPDFResult = {
        success: true,
        data: Buffer.from('mock-pdf-data'),
        filename: 'test.pdf',
        mimeType: 'application/pdf'
      }

      const mockWordError = {
        success: false,
        filename: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        error: 'Word generation failed'
      }

      vi.mocked(PDFGenerator.generate).mockResolvedValue(mockPDFResult)
      vi.mocked(WordGenerator.generate).mockResolvedValue(mockWordError)

      const results = await DocumentExportService.exportMultipleFormats(
        mockResumeData,
        mockTemplateConfig,
        ['pdf', 'docx'],
        {}
      )

      expect(results.pdf.success).toBe(true)
      expect(results.docx.success).toBe(false)
      expect(results.docx.error).toBe('Word generation failed')
    })
  })

  describe('utility methods', () => {
    it('should generate safe filename', () => {
      const filename = DocumentExportService.generateFilename(
        mockResumeData,
        'pdf',
        'v2'
      )

      expect(filename).toBe('John_Doe_v2_Resume.pdf')
    })

    it('should handle special characters in filename', () => {
      const resumeWithSpecialChars = {
        ...mockResumeData,
        personalInfo: {
          ...mockResumeData.personalInfo,
          fullName: 'José María O\'Connor-Smith'
        }
      }

      const filename = DocumentExportService.generateFilename(
        resumeWithSpecialChars,
        'docx'
      )

      expect(filename).toBe('Jos_Mara_OConnorSmith_Resume.docx')
    })

    it('should estimate export time', () => {
      const estimatedTime = DocumentExportService.estimateExportTime(
        mockResumeData,
        'pdf'
      )

      expect(estimatedTime).toBeGreaterThan(0)
      expect(typeof estimatedTime).toBe('number')
    })

    it('should check export support', () => {
      const pdfSupported = DocumentExportService.isExportSupported('pdf')
      const docxSupported = DocumentExportService.isExportSupported('docx')

      expect(typeof pdfSupported).toBe('boolean')
      expect(typeof docxSupported).toBe('boolean')
    })

    it('should get export capabilities', () => {
      const capabilities = DocumentExportService.getExportCapabilities()

      expect(capabilities).toHaveProperty('supportedFormats')
      expect(capabilities).toHaveProperty('features')
      expect(Array.isArray(capabilities.supportedFormats)).toBe(true)
      expect(typeof capabilities.features).toBe('object')
    })
  })
})

describe('TemplateRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render template successfully', async () => {
    const mockRenderedTemplate = {
      html: '<html><body>Mock HTML</body></html>',
      css: 'body { font-family: Arial; }',
      metadata: {
        title: 'John Doe - Resume',
        author: 'John Doe',
        subject: 'Professional Resume',
        creator: 'Resume Builder AI'
      }
    }

    vi.mocked(TemplateRenderer.render).mockResolvedValue(mockRenderedTemplate)

    const result = await TemplateRenderer.render(mockResumeData, mockTemplateConfig)

    expect(result).toEqual(mockRenderedTemplate)
    expect(result.html).toContain('Mock HTML')
    expect(result.css).toContain('Arial')
    expect(result.metadata.title).toBe('John Doe - Resume')
  })
})

describe('Input validation', () => {
  it('should validate resume data structure', () => {
    const invalidData = {
      personalInfo: null,
      sections: []
    }

    expect(() => {
      DocumentExportService['validateInputs'](
        invalidData as any,
        mockTemplateConfig,
        { format: 'pdf' }
      )
    }).toThrow()
  })

  it('should validate template config', () => {
    expect(() => {
      DocumentExportService['validateInputs'](
        mockResumeData,
        null as any,
        { format: 'pdf' }
      )
    }).toThrow('Template configuration is required')
  })

  it('should validate export options', () => {
    expect(() => {
      DocumentExportService['validateInputs'](
        mockResumeData,
        mockTemplateConfig,
        { format: null as any }
      )
    }).toThrow('Export format is required')
  })

  it('should validate filename format', () => {
    expect(() => {
      DocumentExportService['validateInputs'](
        mockResumeData,
        mockTemplateConfig,
        { format: 'pdf', filename: 'invalid/filename.pdf' }
      )
    }).toThrow('Invalid filename')
  })
})