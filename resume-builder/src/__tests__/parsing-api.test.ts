import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as parsePost, GET as parseGet } from '@/app/api/documents/parse/route'
import { POST as batchPost, GET as batchGet } from '@/app/api/documents/parse/batch/route'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}))

// Mock the parsing functionality
vi.mock('@/lib/parsing/resume-parser', () => ({
  ResumeParser: vi.fn().mockImplementation(() => ({
    parseResume: vi.fn().mockResolvedValue({
      success: true,
      data: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john.doe@example.com'
        },
        sections: [
          {
            type: 'experience',
            title: 'Work Experience',
            items: [],
            visible: true
          }
        ]
      },
      errors: [],
      warnings: []
    }),
    parseMultipleResumes: vi.fn().mockResolvedValue([
      {
        success: true,
        data: {
          personalInfo: {
            fullName: 'John Doe',
            email: 'john.doe@example.com'
          },
          sections: []
        }
      }
    ]),
    getParsingStats: vi.fn().mockReturnValue({
      confidence: 0.85,
      sectionsFound: 1,
      errorsCount: 0,
      warningsCount: 0,
      completeness: 0.8
    })
  })),
  getSupportedFileTypes: vi.fn().mockReturnValue([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  isSupportedFileType: vi.fn().mockReturnValue(true),
  getDefaultParseOptions: vi.fn().mockReturnValue({
    strictValidation: false,
    includeRawText: false,
    confidenceThreshold: 0.3
  })
}))

describe('/api/documents/parse', () => {
  describe('POST', () => {
    it('should parse a resume file successfully', async () => {
      const formData = new FormData()
      const mockFile = new File(['mock pdf content'], 'resume.pdf', { type: 'application/pdf' })
      formData.append('file', mockFile)

      const request = new NextRequest('http://localhost:3000/api/documents/parse', {
        method: 'POST',
        body: formData
      })

      const response = await parsePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.stats).toBeDefined()
      expect(data.metadata).toBeDefined()
      expect(data.metadata.filename).toBe('resume.pdf')
    })

    it('should return error for missing file', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/documents/parse', {
        method: 'POST',
        body: formData
      })

      const response = await parsePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should handle parse options', async () => {
      const formData = new FormData()
      const mockFile = new File(['mock pdf content'], 'resume.pdf', { type: 'application/pdf' })
      formData.append('file', mockFile)
      formData.append('options', JSON.stringify({
        strictValidation: true,
        includeRawText: true
      }))

      const request = new NextRequest('http://localhost:3000/api/documents/parse', {
        method: 'POST',
        body: formData
      })

      const response = await parsePost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return error for invalid options format', async () => {
      const formData = new FormData()
      const mockFile = new File(['mock pdf content'], 'resume.pdf', { type: 'application/pdf' })
      formData.append('file', mockFile)
      formData.append('options', 'invalid json')

      const request = new NextRequest('http://localhost:3000/api/documents/parse', {
        method: 'POST',
        body: formData
      })

      const response = await parsePost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid options format')
    })
  })

  describe('GET', () => {
    it('should return API information', async () => {
      const response = await parseGet()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.supportedFileTypes).toBeDefined()
      expect(data.maxFileSize).toBe('10MB')
      expect(data.defaultOptions).toBeDefined()
      expect(data.endpoints).toBeDefined()
    })
  })
})

describe('/api/documents/parse/batch', () => {
  describe('POST', () => {
    it('should parse multiple resume files successfully', async () => {
      const formData = new FormData()
      const mockFile1 = new File(['mock pdf content 1'], 'resume1.pdf', { type: 'application/pdf' })
      const mockFile2 = new File(['mock pdf content 2'], 'resume2.pdf', { type: 'application/pdf' })
      formData.append('file0', mockFile1)
      formData.append('file1', mockFile2)

      const request = new NextRequest('http://localhost:3000/api/documents/parse/batch', {
        method: 'POST',
        body: formData
      })

      const response = await batchPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results).toHaveLength(2)
      expect(data.batchStats).toBeDefined()
      expect(data.batchStats.totalFiles).toBe(2)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.batchId).toBeDefined()
    })

    it('should return error for no files', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost:3000/api/documents/parse/batch', {
        method: 'POST',
        body: formData
      })

      const response = await batchPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No files provided')
    })

    it('should return error for too many files', async () => {
      const formData = new FormData()
      // Add 6 files (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        const mockFile = new File([`mock content ${i}`], `resume${i}.pdf`, { type: 'application/pdf' })
        formData.append(`file${i}`, mockFile)
      }

      const request = new NextRequest('http://localhost:3000/api/documents/parse/batch', {
        method: 'POST',
        body: formData
      })

      const response = await batchPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Batch size exceeds limit')
    })
  })

  describe('GET', () => {
    it('should return batch API information', async () => {
      const response = await batchGet()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.maxBatchSize).toBe(5)
      expect(data.maxFileSize).toBe('10MB')
      expect(data.supportedFileTypes).toBeDefined()
      expect(data.defaultOptions).toBeDefined()
      expect(data.endpoint).toBe('/api/documents/parse/batch')
    })
  })
})

describe('Authentication', () => {
  it('should require authentication for parsing', async () => {
    // Mock unauthenticated session
    vi.doMock('next-auth', () => ({
      getServerSession: vi.fn().mockResolvedValue(null)
    }))

    const formData = new FormData()
    const mockFile = new File(['mock pdf content'], 'resume.pdf', { type: 'application/pdf' })
    formData.append('file', mockFile)

    const request = new NextRequest('http://localhost:3000/api/documents/parse', {
      method: 'POST',
      body: formData
    })

    const response = await parsePost(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})