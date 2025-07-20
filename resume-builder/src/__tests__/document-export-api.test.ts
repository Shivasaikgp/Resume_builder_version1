import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as exportPOST, GET as exportGET } from '@/app/api/documents/export/route'
import { POST as batchExportPOST } from '@/app/api/documents/batch-export/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { DocumentExportService } from '@/lib/document-export'

// Mock dependencies
vi.mock('next-auth')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    resume: {
      findFirst: vi.fn()
    }
  }
}))
vi.mock('@/lib/document-export')

const mockSession = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
    name: 'Test User'
  }
}

const mockResume = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  title: 'Software Engineer Resume',
  data: {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123'
    },
    sections: []
  },
  templateConfig: {
    layout: 'modern',
    colorScheme: 'blue',
    fontSize: 'medium',
    spacing: 'normal',
    showPhoto: false
  }
}

describe('/api/documents/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST', () => {
    it('should export PDF successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(mockResume)
      
      const mockExportResult = {
        success: true,
        data: Buffer.from('mock-pdf-data'),
        filename: 'John_Doe_Resume.pdf',
        mimeType: 'application/pdf',
        size: 1024
      }
      
      vi.mocked(DocumentExportService.exportDocument).mockResolvedValue(mockExportResult)

      const request = new NextRequest('http://localhost/api/documents/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'pdf',
          quality: 'medium'
        })
      })

      const response = await exportPOST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toContain('John_Doe_Resume.pdf')
      
      expect(DocumentExportService.exportDocument).toHaveBeenCalledWith(
        mockResume.data,
        mockResume.templateConfig,
        {
          format: 'pdf',
          quality: 'medium',
          includeMetadata: true
        }
      )
    })

    it('should export Word document successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(mockResume)
      
      const mockExportResult = {
        success: true,
        data: Buffer.from('mock-docx-data'),
        filename: 'John_Doe_Resume.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048
      }
      
      vi.mocked(DocumentExportService.exportDocument).mockResolvedValue(mockExportResult)

      const request = new NextRequest('http://localhost/api/documents/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'docx',
          filename: 'custom_resume.docx'
        })
      })

      const response = await exportPOST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(response.headers.get('Content-Disposition')).toContain('John_Doe_Resume.docx')
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/documents/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'pdf'
        })
      })

      const response = await exportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 404 when resume not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/documents/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440002',
          format: 'pdf'
        })
      })

      const response = await exportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Resume not found')
    })

    it('should return 400 for invalid request data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/documents/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: 'invalid-uuid',
          format: 'invalid-format'
        })
      })

      const response = await exportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 500 when export fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(mockResume)
      
      const mockExportResult = {
        success: false,
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        error: 'PDF generation failed'
      }
      
      vi.mocked(DocumentExportService.exportDocument).mockResolvedValue(mockExportResult)

      const request = new NextRequest('http://localhost/api/documents/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'pdf'
        })
      })

      const response = await exportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('PDF generation failed')
    })
  })

  describe('GET', () => {
    it('should return export capabilities', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      
      const mockCapabilities = {
        supportedFormats: ['pdf', 'docx'],
        features: {
          highQualityPDF: true,
          batchExport: true,
          progressTracking: true
        }
      }
      
      vi.mocked(DocumentExportService.getExportCapabilities).mockReturnValue(mockCapabilities)

      const request = new NextRequest('http://localhost/api/documents/export')
      const response = await exportGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.capabilities).toEqual(mockCapabilities)
      expect(data.supportedFormats).toEqual(['pdf', 'docx'])
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/documents/export')
      const response = await exportGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })
})

describe('/api/documents/batch-export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should batch export multiple formats successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(mockResume)
      
      const mockBatchResults = {
        pdf: {
          success: true,
          data: Buffer.from('mock-pdf-data'),
          filename: 'John_Doe_Resume.pdf',
          mimeType: 'application/pdf',
          size: 1024
        },
        docx: {
          success: true,
          data: Buffer.from('mock-docx-data'),
          filename: 'John_Doe_Resume.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 2048
        }
      }
      
      vi.mocked(DocumentExportService.exportMultipleFormats).mockResolvedValue(mockBatchResults)

      const request = new NextRequest('http://localhost/api/documents/batch-export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          formats: ['pdf', 'docx'],
          quality: 'high'
        })
      })

      const response = await batchExportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results.pdf.success).toBe(true)
      expect(data.results.docx.success).toBe(true)
      expect(data.results.pdf.data).toBeDefined()
      expect(data.results.docx.data).toBeDefined()
      expect(data.resumeTitle).toBe('Software Engineer Resume')
    })

    it('should handle partial failures in batch export', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(mockResume)
      
      const mockBatchResults = {
        pdf: {
          success: true,
          data: Buffer.from('mock-pdf-data'),
          filename: 'John_Doe_Resume.pdf',
          mimeType: 'application/pdf',
          size: 1024
        },
        docx: {
          success: false,
          filename: 'John_Doe_Resume.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          error: 'Word generation failed'
        }
      }
      
      vi.mocked(DocumentExportService.exportMultipleFormats).mockResolvedValue(mockBatchResults)

      const request = new NextRequest('http://localhost/api/documents/batch-export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          formats: ['pdf', 'docx']
        })
      })

      const response = await batchExportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results.pdf.success).toBe(true)
      expect(data.results.docx.success).toBe(false)
      expect(data.results.docx.error).toBe('Word generation failed')
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/documents/batch-export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          formats: ['pdf', 'docx']
        })
      })

      const response = await batchExportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 400 for invalid request data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost/api/documents/batch-export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: 'invalid-uuid',
          formats: []
        })
      })

      const response = await batchExportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should return 404 when resume not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.resume.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/documents/batch-export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440002',
          formats: ['pdf']
        })
      })

      const response = await batchExportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Resume not found')
    })
  })
})