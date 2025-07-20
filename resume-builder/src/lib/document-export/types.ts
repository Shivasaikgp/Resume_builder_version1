import { ResumeData, TemplateConfig } from '@/types'

export type DocumentFormat = 'pdf' | 'docx'

export interface ExportOptions {
  format: DocumentFormat
  filename?: string
  quality?: 'low' | 'medium' | 'high'
  includeMetadata?: boolean
  watermark?: string
}

export interface ExportResult {
  success: boolean
  data?: Buffer
  filename: string
  mimeType: string
  size?: number
  error?: string
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'generating' | 'complete' | 'error'
  progress: number
  message: string
}

export interface DocumentGeneratorOptions {
  resumeData: ResumeData
  templateConfig: TemplateConfig
  options: ExportOptions
  onProgress?: (progress: ExportProgress) => void
}

export interface RenderedTemplate {
  html: string
  css: string
  metadata: {
    title: string
    author: string
    subject: string
    creator: string
  }
}