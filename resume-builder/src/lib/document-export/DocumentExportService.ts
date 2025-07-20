import { ResumeData, TemplateConfig } from '@/types'
import { PDFGenerator } from './PDFGenerator'
import { WordGenerator } from './WordGenerator'
import { ExportOptions, ExportResult, ExportProgress, DocumentFormat } from './types'

export class DocumentExportService {
  /**
   * Main export method that handles both PDF and Word generation
   */
  static async exportDocument(
    resumeData: ResumeData,
    templateConfig: TemplateConfig,
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      // Validate inputs
      this.validateInputs(resumeData, templateConfig, options)

      onProgress?.({
        stage: 'preparing',
        progress: 5,
        message: 'Starting document export...'
      })

      const generatorOptions = {
        resumeData,
        templateConfig,
        options,
        onProgress
      }

      // Route to appropriate generator
      switch (options.format) {
        case 'pdf':
          return await this.generatePDF(generatorOptions, options.quality)
        case 'docx':
          return await WordGenerator.generate(generatorOptions)
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }

    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      return {
        success: false,
        filename: options.filename || `resume.${options.format}`,
        mimeType: this.getMimeType(options.format),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Batch export - generate multiple formats at once
   */
  static async exportMultipleFormats(
    resumeData: ResumeData,
    templateConfig: TemplateConfig,
    formats: DocumentFormat[],
    baseOptions: Omit<ExportOptions, 'format'>,
    onProgress?: (format: DocumentFormat, progress: ExportProgress) => void
  ): Promise<Record<DocumentFormat, ExportResult>> {
    const results: Record<string, ExportResult> = {}

    for (const format of formats) {
      const options: ExportOptions = {
        ...baseOptions,
        format,
        filename: baseOptions.filename?.replace(/\.[^.]+$/, `.${format}`) || 
                 `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.${format}`
      }

      const progressCallback = onProgress ? 
        (progress: ExportProgress) => onProgress(format, progress) : 
        undefined

      results[format] = await this.exportDocument(
        resumeData,
        templateConfig,
        options,
        progressCallback
      )
    }

    return results as Record<DocumentFormat, ExportResult>
  }

  /**
   * Generate PDF with quality options
   */
  private static async generatePDF(
    generatorOptions: any,
    quality?: 'low' | 'medium' | 'high'
  ): Promise<ExportResult> {
    switch (quality) {
      case 'high':
        return await PDFGenerator.generateHighQuality(generatorOptions)
      case 'low':
      case 'medium':
      default:
        return await PDFGenerator.generate(generatorOptions)
    }
  }

  /**
   * Validate export inputs
   */
  private static validateInputs(
    resumeData: ResumeData,
    templateConfig: TemplateConfig,
    options: ExportOptions
  ): void {
    if (!resumeData) {
      throw new Error('Resume data is required')
    }

    if (!resumeData.personalInfo?.fullName) {
      throw new Error('Personal information with full name is required')
    }

    if (!templateConfig) {
      throw new Error('Template configuration is required')
    }

    if (!options.format) {
      throw new Error('Export format is required')
    }

    if (!['pdf', 'docx'].includes(options.format)) {
      throw new Error(`Unsupported format: ${options.format}`)
    }

    // Validate filename if provided
    if (options.filename && !/^[a-zA-Z0-9._-]+$/.test(options.filename)) {
      throw new Error('Invalid filename. Use only letters, numbers, dots, underscores, and hyphens.')
    }
  }

  /**
   * Get MIME type for format
   */
  private static getMimeType(format: DocumentFormat): string {
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    return mimeTypes[format] || 'application/octet-stream'
  }

  /**
   * Generate a safe filename from resume data
   */
  static generateFilename(
    resumeData: ResumeData,
    format: DocumentFormat,
    suffix?: string
  ): string {
    const baseName = resumeData.personalInfo.fullName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50) // Limit length

    const suffixPart = suffix ? `_${suffix}` : ''
    return `${baseName}${suffixPart}_Resume.${format}`
  }

  /**
   * Estimate export time based on resume complexity
   */
  static estimateExportTime(resumeData: ResumeData, format: DocumentFormat): number {
    const baseTime = format === 'pdf' ? 3000 : 1500 // Base time in ms
    const sectionCount = resumeData.sections.length
    const itemCount = resumeData.sections.reduce((total, section) => total + section.items.length, 0)
    
    // Add time based on complexity
    const complexityTime = (sectionCount * 200) + (itemCount * 100)
    
    return baseTime + complexityTime
  }

  /**
   * Check if export is supported in current environment
   */
  static isExportSupported(format: DocumentFormat): boolean {
    try {
      switch (format) {
        case 'pdf':
          // Check if Puppeteer can be used
          return typeof window === 'undefined' // Server-side only
        case 'docx':
          // Word generation works in both environments
          return true
        default:
          return false
      }
    } catch {
      return false
    }
  }

  /**
   * Get export capabilities for current environment
   */
  static getExportCapabilities(): {
    supportedFormats: DocumentFormat[]
    features: {
      highQualityPDF: boolean
      batchExport: boolean
      progressTracking: boolean
    }
  } {
    const isServerSide = typeof window === 'undefined'
    
    return {
      supportedFormats: isServerSide ? ['pdf', 'docx'] : ['docx'],
      features: {
        highQualityPDF: isServerSide,
        batchExport: true,
        progressTracking: true
      }
    }
  }
}