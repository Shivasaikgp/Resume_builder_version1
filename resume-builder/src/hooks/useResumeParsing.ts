import { useState, useCallback } from 'react'
import { ParseResponse, ParseOptions } from '@/types/parsing'
import { ResumeData } from '@/types/database'

interface UseResumeParsingReturn {
  parseResume: (file: File, options?: ParseOptions) => Promise<ParseResponse>
  parseBatch: (files: File[], options?: ParseOptions) => Promise<ParseResponse[]>
  isLoading: boolean
  error: string | null
  progress: number
}

interface BatchParseResponse {
  success: boolean
  results: ParseResponse[]
  batchStats: {
    totalFiles: number
    successfulParses: number
    failedParses: number
    averageConfidence: number
    totalErrors: number
    totalWarnings: number
  }
  metadata: {
    batchId: string
    processedAt: string
    userId: string
  }
}

export function useResumeParsing(): UseResumeParsingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const parseResume = useCallback(async (file: File, options?: ParseOptions): Promise<ParseResponse> => {
    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      // Validate file client-side
      if (!file) {
        throw new Error('No file provided')
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit')
      }

      // Check file type
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]

      if (!supportedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`)
      }

      setProgress(25)

      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      
      if (options) {
        formData.append('options', JSON.stringify(options))
      }

      setProgress(50)

      // Make API request
      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        body: formData
      })

      setProgress(75)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result: ParseResponse = await response.json()
      setProgress(100)

      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
      setTimeout(() => setProgress(0), 1000) // Reset progress after delay
    }
  }, [])

  const parseBatch = useCallback(async (files: File[], options?: ParseOptions): Promise<ParseResponse[]> => {
    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      // Validate files
      if (!files || files.length === 0) {
        throw new Error('No files provided')
      }

      if (files.length > 5) {
        throw new Error('Batch size exceeds limit of 5 files')
      }

      // Validate each file
      const maxSize = 10 * 1024 * 1024
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]

      for (const file of files) {
        if (file.size > maxSize) {
          throw new Error(`File ${file.name} exceeds 10MB limit`)
        }

        if (!supportedTypes.includes(file.type)) {
          throw new Error(`Unsupported file type: ${file.name} (${file.type})`)
        }
      }

      setProgress(20)

      // Prepare form data
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })

      if (options) {
        formData.append('options', JSON.stringify(options))
      }

      setProgress(40)

      // Make API request
      const response = await fetch('/api/documents/parse/batch', {
        method: 'POST',
        body: formData
      })

      setProgress(70)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result: BatchParseResponse = await response.json()
      setProgress(100)

      return result.results

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
      setTimeout(() => setProgress(0), 1000) // Reset progress after delay
    }
  }, [])

  return {
    parseResume,
    parseBatch,
    isLoading,
    error,
    progress
  }
}

// Utility hook for parsing validation
export function useParseValidation() {
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' }
    }

    // Check file type
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]

    if (!supportedTypes.includes(file.type)) {
      return { isValid: false, error: `Unsupported file type: ${file.type}` }
    }

    return { isValid: true }
  }, [])

  const validateBatch = useCallback((files: File[]): { isValid: boolean; error?: string } => {
    if (files.length === 0) {
      return { isValid: false, error: 'No files provided' }
    }

    if (files.length > 5) {
      return { isValid: false, error: 'Batch size exceeds limit of 5 files' }
    }

    for (const file of files) {
      const validation = validateFile(file)
      if (!validation.isValid) {
        return { isValid: false, error: `${file.name}: ${validation.error}` }
      }
    }

    return { isValid: true }
  }, [validateFile])

  const getSupportedFileTypes = useCallback(() => [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ], [])

  const getFileTypeDescription = useCallback((mimetype: string): string => {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF Document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document (DOCX)',
      'application/msword': 'Word Document (DOC)'
    }
    return typeMap[mimetype] || 'Unknown file type'
  }, [])

  return {
    validateFile,
    validateBatch,
    getSupportedFileTypes,
    getFileTypeDescription
  }
}