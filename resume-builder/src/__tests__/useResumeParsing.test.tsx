import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResumeParsing, useParseValidation } from '@/hooks/useResumeParsing'

// Mock fetch
global.fetch = vi.fn()

describe('useResumeParsing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse a resume successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
        sections: []
      },
      stats: { confidence: 0.8, sectionsFound: 1, errorsCount: 0, warningsCount: 0, completeness: 0.7 }
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useResumeParsing())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)

    const mockFile = new File(['mock content'], 'resume.pdf', { type: 'application/pdf' })

    let parseResult: any
    await act(async () => {
      parseResult = await result.current.parseResume(mockFile)
    })

    expect(parseResult.success).toBe(true)
    expect(parseResult.data).toBeDefined()
    expect(fetch).toHaveBeenCalledWith('/api/documents/parse', {
      method: 'POST',
      body: expect.any(FormData)
    })
  })

  it('should handle parsing errors', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid file type' })
    })

    const { result } = renderHook(() => useResumeParsing())

    const mockFile = new File(['mock content'], 'resume.txt', { type: 'text/plain' })

    await act(async () => {
      try {
        await result.current.parseResume(mockFile)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Invalid file type')
      }
    })

    expect(result.current.error).toBe('Invalid file type')
  })

  it('should validate file size client-side', async () => {
    const { result } = renderHook(() => useResumeParsing())

    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })

    await act(async () => {
      try {
        await result.current.parseResume(largeFile)
      } catch (error) {
        expect((error as Error).message).toBe('File size exceeds 10MB limit')
      }
    })
  })

  it('should validate file type client-side', async () => {
    const { result } = renderHook(() => useResumeParsing())

    const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' })

    await act(async () => {
      try {
        await result.current.parseResume(invalidFile)
      } catch (error) {
        expect((error as Error).message).toBe('Unsupported file type: text/plain')
      }
    })
  })

  it('should parse multiple files in batch', async () => {
    const mockResponse = {
      success: true,
      results: [
        { success: true, data: { personalInfo: { fullName: 'John Doe', email: 'john@example.com' }, sections: [] } },
        { success: true, data: { personalInfo: { fullName: 'Jane Doe', email: 'jane@example.com' }, sections: [] } }
      ]
    }

    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useResumeParsing())

    const mockFiles = [
      new File(['content1'], 'resume1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'resume2.pdf', { type: 'application/pdf' })
    ]

    let batchResult: any
    await act(async () => {
      batchResult = await result.current.parseBatch(mockFiles)
    })

    expect(batchResult).toHaveLength(2)
    expect(batchResult[0].success).toBe(true)
    expect(batchResult[1].success).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/documents/parse/batch', {
      method: 'POST',
      body: expect.any(FormData)
    })
  })

  it('should handle batch size limit', async () => {
    const { result } = renderHook(() => useResumeParsing())

    // Create 6 files (exceeds limit of 5)
    const tooManyFiles = Array.from({ length: 6 }, (_, i) =>
      new File([`content${i}`], `resume${i}.pdf`, { type: 'application/pdf' })
    )

    await act(async () => {
      try {
        await result.current.parseBatch(tooManyFiles)
      } catch (error) {
        expect((error as Error).message).toBe('Batch size exceeds limit of 5 files')
      }
    })
  })

  it('should track loading state and progress', async () => {
    ;(fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: {}, stats: {} })
      }), 100))
    )

    const { result } = renderHook(() => useResumeParsing())

    const mockFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.parseResume(mockFile)
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.progress).toBeGreaterThan(0)

    // Wait for completion
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(result.current.isLoading).toBe(false)
  })
})

describe('useParseValidation', () => {
  it('should validate file correctly', () => {
    const { result } = renderHook(() => useParseValidation())

    const validFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' })
    const validation = result.current.validateFile(validFile)

    expect(validation.isValid).toBe(true)
    expect(validation.error).toBeUndefined()
  })

  it('should reject oversized files', () => {
    const { result } = renderHook(() => useParseValidation())

    // Mock a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
    const validation = result.current.validateFile(largeFile)

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('File size exceeds 10MB limit')
  })

  it('should reject unsupported file types', () => {
    const { result } = renderHook(() => useParseValidation())

    const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' })
    const validation = result.current.validateFile(invalidFile)

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('Unsupported file type: text/plain')
  })

  it('should validate batch of files', () => {
    const { result } = renderHook(() => useParseValidation())

    const validFiles = [
      new File(['content1'], 'resume1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'resume2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    ]

    const validation = result.current.validateBatch(validFiles)

    expect(validation.isValid).toBe(true)
    expect(validation.error).toBeUndefined()
  })

  it('should reject empty batch', () => {
    const { result } = renderHook(() => useParseValidation())

    const validation = result.current.validateBatch([])

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('No files provided')
  })

  it('should reject oversized batch', () => {
    const { result } = renderHook(() => useParseValidation())

    const tooManyFiles = Array.from({ length: 6 }, (_, i) =>
      new File([`content${i}`], `resume${i}.pdf`, { type: 'application/pdf' })
    )

    const validation = result.current.validateBatch(tooManyFiles)

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('Batch size exceeds limit of 5 files')
  })

  it('should return supported file types', () => {
    const { result } = renderHook(() => useParseValidation())

    const types = result.current.getSupportedFileTypes()

    expect(types).toContain('application/pdf')
    expect(types).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(types).toContain('application/msword')
  })

  it('should describe file types', () => {
    const { result } = renderHook(() => useParseValidation())

    expect(result.current.getFileTypeDescription('application/pdf')).toBe('PDF Document')
    expect(result.current.getFileTypeDescription('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('Word Document (DOCX)')
    expect(result.current.getFileTypeDescription('application/msword')).toBe('Word Document (DOC)')
    expect(result.current.getFileTypeDescription('unknown/type')).toBe('Unknown file type')
  })
})