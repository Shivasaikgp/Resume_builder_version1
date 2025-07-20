import { useState, useCallback } from 'react'
import { DocumentFormat } from '@/lib/document-export/types'

interface ExportOptions {
  format: DocumentFormat
  filename?: string
  quality?: 'low' | 'medium' | 'high'
  includeMetadata?: boolean
}

interface BatchExportOptions {
  formats: DocumentFormat[]
  quality?: 'low' | 'medium' | 'high'
  includeMetadata?: boolean
}

interface ExportState {
  isExporting: boolean
  progress: number
  stage: string
  error: string | null
}

interface ExportCapabilities {
  supportedFormats: DocumentFormat[]
  features: {
    highQualityPDF: boolean
    batchExport: boolean
    progressTracking: boolean
  }
}

export function useDocumentExport() {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    stage: '',
    error: null
  })

  const [capabilities, setCapabilities] = useState<ExportCapabilities | null>(null)

  // Fetch export capabilities
  const fetchCapabilities = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/export')
      if (!response.ok) {
        throw new Error('Failed to fetch export capabilities')
      }
      const data = await response.json()
      setCapabilities(data)
      return data
    } catch (error) {
      console.error('Error fetching export capabilities:', error)
      return null
    }
  }, [])

  // Export single document
  const exportDocument = useCallback(async (
    resumeId: string,
    options: ExportOptions
  ): Promise<boolean> => {
    setExportState({
      isExporting: true,
      progress: 0,
      stage: 'Preparing export...',
      error: null
    })

    try {
      const response = await fetch('/api/documents/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId,
          ...options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get the blob data
      const blob = await response.blob()
      const filename = response.headers.get('content-disposition')
        ?.match(/filename="(.+)"/)?.[1] || 
        options.filename || 
        `resume.${options.format}`

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setExportState({
        isExporting: false,
        progress: 100,
        stage: 'Export completed',
        error: null
      })

      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      setExportState({
        isExporting: false,
        progress: 0,
        stage: '',
        error: errorMessage
      })
      return false
    }
  }, [])

  // Export multiple formats
  const exportMultipleFormats = useCallback(async (
    resumeId: string,
    options: BatchExportOptions
  ): Promise<boolean> => {
    setExportState({
      isExporting: true,
      progress: 0,
      stage: 'Preparing batch export...',
      error: null
    })

    try {
      const response = await fetch('/api/documents/batch-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId,
          ...options
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Batch export failed')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error('Batch export failed')
      }

      // Download each successful export
      let successCount = 0
      for (const [format, result] of Object.entries(data.results)) {
        if (result.success && result.data) {
          try {
            // Convert base64 to blob
            const binaryString = atob(result.data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: result.mimeType })

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = result.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            successCount++
          } catch (downloadError) {
            console.error(`Failed to download ${format}:`, downloadError)
          }
        }
      }

      setExportState({
        isExporting: false,
        progress: 100,
        stage: `Exported ${successCount} document(s)`,
        error: successCount === 0 ? 'No documents were successfully exported' : null
      })

      return successCount > 0

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch export failed'
      setExportState({
        isExporting: false,
        progress: 0,
        stage: '',
        error: errorMessage
      })
      return false
    }
  }, [])

  // Quick export PDF
  const exportPDF = useCallback(async (
    resumeId: string,
    filename?: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<boolean> => {
    return exportDocument(resumeId, {
      format: 'pdf',
      filename,
      quality
    })
  }, [exportDocument])

  // Quick export Word
  const exportWord = useCallback(async (
    resumeId: string,
    filename?: string
  ): Promise<boolean> => {
    return exportDocument(resumeId, {
      format: 'docx',
      filename
    })
  }, [exportDocument])

  // Export both PDF and Word
  const exportBoth = useCallback(async (
    resumeId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<boolean> => {
    return exportMultipleFormats(resumeId, {
      formats: ['pdf', 'docx'],
      quality
    })
  }, [exportMultipleFormats])

  // Reset export state
  const resetExportState = useCallback(() => {
    setExportState({
      isExporting: false,
      progress: 0,
      stage: '',
      error: null
    })
  }, [])

  return {
    // State
    exportState,
    capabilities,
    
    // Actions
    fetchCapabilities,
    exportDocument,
    exportMultipleFormats,
    exportPDF,
    exportWord,
    exportBoth,
    resetExportState,
    
    // Computed
    isExporting: exportState.isExporting,
    hasError: !!exportState.error,
    canExportPDF: capabilities?.supportedFormats.includes('pdf') ?? false,
    canExportWord: capabilities?.supportedFormats.includes('docx') ?? false,
    supportsBatchExport: capabilities?.features.batchExport ?? false
  }
}