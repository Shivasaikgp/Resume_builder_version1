import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDocumentExport } from '@/hooks/useDocumentExport'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock URL.createObjectURL and related APIs
const mockCreateObjectURL = vi.fn(() => 'mock-blob-url')
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
})

// Mock document methods
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockCreateElement = vi.fn(() => ({
  href: '',
  download: '',
  click: mockClick
}))

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
})

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
})

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
})

describe('useDocumentExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchCapabilities', () => {
    it('should fetch export capabilities successfully', async () => {
      const mockCapabilities = {
        supportedFormats: ['pdf', 'docx'],
        features: {
          highQualityPDF: true,
          batchExport: true,
          progressTracking: true
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCapabilities
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const capabilities = await result.current.fetchCapabilities()
        expect(capabilities).toEqual(mockCapabilities)
      })

      expect(result.current.capabilities).toEqual(mockCapabilities)
      expect(result.current.canExportPDF).toBe(true)
      expect(result.current.canExportWord).toBe(true)
      expect(result.current.supportsBatchExport).toBe(true)
    })

    it('should handle fetch capabilities error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const capabilities = await result.current.fetchCapabilities()
        expect(capabilities).toBeNull()
      })

      expect(result.current.capabilities).toBeNull()
    })
  })

  describe('exportDocument', () => {
    it('should export PDF successfully', async () => {
      const mockBlob = new Blob(['mock-pdf-data'], { type: 'application/pdf' })
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: {
          get: (name: string) => {
            if (name === 'content-disposition') {
              return 'attachment; filename="John_Doe_Resume.pdf"'
            }
            return null
          }
        }
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportDocument('550e8400-e29b-41d4-a716-446655440000', {
          format: 'pdf',
          quality: 'high'
        })
        expect(success).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/documents/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'pdf',
          quality: 'high'
        })
      })

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-blob-url')

      expect(result.current.exportState.stage).toBe('Export completed')
      expect(result.current.exportState.progress).toBe(100)
      expect(result.current.exportState.error).toBeNull()
    })

    it('should handle export error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Export failed' })
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportDocument('550e8400-e29b-41d4-a716-446655440000', {
          format: 'pdf'
        })
        expect(success).toBe(false)
      })

      expect(result.current.exportState.error).toBe('Export failed')
      expect(result.current.hasError).toBe(true)
    })

    it('should update export state during process', async () => {
      const mockBlob = new Blob(['mock-data'])
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: {
          get: () => null
        }
      })

      const { result } = renderHook(() => useDocumentExport())

      act(() => {
        result.current.exportDocument('550e8400-e29b-41d4-a716-446655440000', { format: 'pdf' })
      })

      // Check initial state
      expect(result.current.isExporting).toBe(true)
      expect(result.current.exportState.stage).toBe('Preparing export...')
      expect(result.current.exportState.progress).toBe(0)

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false)
      })
    })
  })

  describe('exportMultipleFormats', () => {
    it('should export multiple formats successfully', async () => {
      const mockResponse = {
        success: true,
        results: {
          pdf: {
            success: true,
            filename: 'resume.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            data: btoa('mock-pdf-data')
          },
          docx: {
            success: true,
            filename: 'resume.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 2048,
            data: btoa('mock-docx-data')
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportMultipleFormats('550e8400-e29b-41d4-a716-446655440000', {
          formats: ['pdf', 'docx'],
          quality: 'medium'
        })
        expect(success).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/documents/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          formats: ['pdf', 'docx'],
          quality: 'medium'
        })
      })

      // Should create download links for both formats
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2)
      expect(mockClick).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in batch export', async () => {
      const mockResponse = {
        success: true,
        results: {
          pdf: {
            success: true,
            filename: 'resume.pdf',
            mimeType: 'application/pdf',
            data: btoa('mock-pdf-data')
          },
          docx: {
            success: false,
            error: 'Word generation failed'
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportMultipleFormats('550e8400-e29b-41d4-a716-446655440000', {
          formats: ['pdf', 'docx']
        })
        expect(success).toBe(true) // Should be true because at least one succeeded
      })

      // Should only create one download link (for PDF)
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
      expect(mockClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('convenience methods', () => {
    it('should export PDF with exportPDF method', async () => {
      const mockBlob = new Blob(['mock-pdf-data'])
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: { get: () => null }
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportPDF('550e8400-e29b-41d4-a716-446655440000', 'custom.pdf', 'high')
        expect(success).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/documents/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'pdf',
          filename: 'custom.pdf',
          quality: 'high'
        })
      })
    })

    it('should export Word with exportWord method', async () => {
      const mockBlob = new Blob(['mock-docx-data'])
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: { get: () => null }
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportWord('550e8400-e29b-41d4-a716-446655440000', 'custom.docx')
        expect(success).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/documents/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          format: 'docx',
          filename: 'custom.docx'
        })
      })
    })

    it('should export both formats with exportBoth method', async () => {
      const mockResponse = {
        success: true,
        results: {
          pdf: {
            success: true,
            filename: 'resume.pdf',
            mimeType: 'application/pdf',
            data: btoa('mock-pdf-data')
          },
          docx: {
            success: true,
            filename: 'resume.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: btoa('mock-docx-data')
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const { result } = renderHook(() => useDocumentExport())

      await act(async () => {
        const success = await result.current.exportBoth('550e8400-e29b-41d4-a716-446655440000', 'high')
        expect(success).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/documents/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: '550e8400-e29b-41d4-a716-446655440000',
          formats: ['pdf', 'docx'],
          quality: 'high'
        })
      })
    })
  })

  describe('resetExportState', () => {
    it('should reset export state', async () => {
      const { result } = renderHook(() => useDocumentExport())

      // Set some error state
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Test error' })
      })

      await act(async () => {
        await result.current.exportPDF('550e8400-e29b-41d4-a716-446655440000')
      })

      expect(result.current.hasError).toBe(true)

      // Reset state
      act(() => {
        result.current.resetExportState()
      })

      expect(result.current.exportState.error).toBeNull()
      expect(result.current.exportState.progress).toBe(0)
      expect(result.current.exportState.stage).toBe('')
      expect(result.current.hasError).toBe(false)
    })
  })
})