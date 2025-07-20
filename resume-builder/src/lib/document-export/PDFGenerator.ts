import puppeteer from 'puppeteer'
import { DocumentGeneratorOptions, ExportResult, ExportProgress } from './types'
import { TemplateRenderer } from './TemplateRenderer'

export class PDFGenerator {
  /**
   * Generates a PDF document from resume data
   */
  static async generate(options: DocumentGeneratorOptions): Promise<ExportResult> {
    const { resumeData, templateConfig, options: exportOptions, onProgress } = options
    
    try {
      // Report progress
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing document generation...'
      })

      // Render template to HTML
      const renderedTemplate = await TemplateRenderer.render(resumeData, templateConfig)
      
      onProgress?.({
        stage: 'rendering',
        progress: 30,
        message: 'Rendering template...'
      })

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })

      const page = await browser.newPage()
      
      onProgress?.({
        stage: 'generating',
        progress: 50,
        message: 'Generating PDF...'
      })

      // Set content
      await page.setContent(renderedTemplate.html, {
        waitUntil: 'networkidle0'
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      })

      await browser.close()

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'PDF generated successfully'
      })

      const filename = exportOptions.filename || 
        `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`

      return {
        success: true,
        data: Buffer.from(pdfBuffer),
        filename,
        mimeType: 'application/pdf',
        size: pdfBuffer.length
      }

    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      return {
        success: false,
        filename: exportOptions.filename || 'resume.pdf',
        mimeType: 'application/pdf',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Generates a high-quality PDF with advanced options
   */
  static async generateHighQuality(options: DocumentGeneratorOptions): Promise<ExportResult> {
    const { resumeData, templateConfig, options: exportOptions, onProgress } = options
    
    try {
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing high-quality PDF generation...'
      })

      const renderedTemplate = await TemplateRenderer.render(resumeData, templateConfig)
      
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      })

      const page = await browser.newPage()
      
      // Set higher DPI for better quality
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      })

      onProgress?.({
        stage: 'rendering',
        progress: 40,
        message: 'Rendering high-quality template...'
      })

      await page.setContent(renderedTemplate.html, {
        waitUntil: 'networkidle0'
      })

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready')

      onProgress?.({
        stage: 'generating',
        progress: 70,
        message: 'Generating high-quality PDF...'
      })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        tagged: true, // For accessibility
        outline: true // Generate PDF outline
      })

      await browser.close()

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'High-quality PDF generated successfully'
      })

      const filename = exportOptions.filename || 
        `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume_HQ.pdf`

      return {
        success: true,
        data: Buffer.from(pdfBuffer),
        filename,
        mimeType: 'application/pdf',
        size: pdfBuffer.length
      }

    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `High-quality PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })

      return {
        success: false,
        filename: exportOptions.filename || 'resume_hq.pdf',
        mimeType: 'application/pdf',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}