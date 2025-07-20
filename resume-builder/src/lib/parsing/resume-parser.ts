import { ContentExtractor } from './content-extractor'
import { ContentMapper } from './content-mapper'
import { ResumeValidator } from './validation'
import { FileUpload, ParseRequest, ParseResponse, ParseOptions } from '@/types/parsing'
import { ResumeData } from '@/types/database'

export class ResumeParser {
  private contentExtractor: ContentExtractor
  private contentMapper: ContentMapper
  private validator: ResumeValidator

  constructor() {
    this.contentExtractor = new ContentExtractor()
    this.contentMapper = new ContentMapper()
    this.validator = new ResumeValidator()
  }

  async parseResume(request: ParseRequest): Promise<ParseResponse> {
    try {
      const { file, options = {} } = request

      // Step 1: Extract content from file
      const parsedData = await this.contentExtractor.extractContent(file)

      // Check confidence threshold
      if (options.confidenceThreshold && parsedData.confidence < options.confidenceThreshold) {
        return {
          success: false,
          errors: [{
            type: 'parsing',
            message: `Parsing confidence (${parsedData.confidence.toFixed(2)}) below threshold (${options.confidenceThreshold})`,
            severity: 'high'
          }],
          warnings: ['Consider uploading a clearer document or different format']
        }
      }

      // Step 2: Map to resume data structure
      const mappingResult = await this.contentMapper.mapToResumeData(parsedData)

      // Step 3: Validate the mapped data
      const validationResult = this.validator.validateResumeData(mappingResult.resumeData)

      // Check if validation passed for strict mode
      if (options.strictValidation && !validationResult.isValid) {
        return {
          success: false,
          parsed: parsedData,
          errors: [...mappingResult.errors, ...validationResult.errors],
          warnings: [...mappingResult.warnings, ...validationResult.warnings]
        }
      }

      // Step 4: Apply any custom section mapping
      let finalResumeData = mappingResult.resumeData
      if (options.sectionMapping) {
        finalResumeData = this.applySectionMapping(finalResumeData, options.sectionMapping)
      }

      // Prepare response
      const response: ParseResponse = {
        success: true,
        data: finalResumeData,
        errors: [...mappingResult.errors, ...validationResult.errors],
        warnings: [...mappingResult.warnings, ...validationResult.warnings]
      }

      // Include raw parsed data if requested
      if (options.includeRawText) {
        response.parsed = parsedData
      }

      return response
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'parsing',
          message: `Resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'high'
        }]
      }
    }
  }

  async parseMultipleResumes(files: FileUpload[], options?: ParseOptions): Promise<ParseResponse[]> {
    const results: ParseResponse[] = []

    for (const file of files) {
      try {
        const result = await this.parseResume({ file, options })
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          errors: [{
            type: 'parsing',
            message: `Failed to parse ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'high'
          }]
        })
      }
    }

    return results
  }

  private applySectionMapping(resumeData: ResumeData, sectionMapping: Record<string, string>): ResumeData {
    const mappedSections = resumeData.sections.map(section => {
      const mappedType = sectionMapping[section.type]
      if (mappedType) {
        return {
          ...section,
          type: mappedType as any
        }
      }
      return section
    })

    return {
      ...resumeData,
      sections: mappedSections
    }
  }

  // Utility methods
  static getSupportedFileTypes(): string[] {
    return ContentExtractor.getSupportedFileTypes()
  }

  static isSupportedFileType(mimetype: string): boolean {
    return ContentExtractor.isSupportedFileType(mimetype)
  }

  static getDefaultParseOptions(): ParseOptions {
    return {
      strictValidation: false,
      includeRawText: false,
      confidenceThreshold: 0.3,
      sectionMapping: {}
    }
  }

  // Method to get parsing statistics
  getParsingStats(response: ParseResponse): {
    confidence: number
    sectionsFound: number
    errorsCount: number
    warningsCount: number
    completeness: number
  } {
    const stats = {
      confidence: 0,
      sectionsFound: 0,
      errorsCount: response.errors?.length || 0,
      warningsCount: response.warnings?.length || 0,
      completeness: 0
    }

    if (response.parsed) {
      stats.confidence = response.parsed.confidence
      stats.sectionsFound = response.parsed.sections.length
    }

    if (response.data) {
      // Calculate completeness based on filled fields
      let filledFields = 0
      let totalFields = 0

      // Personal info completeness
      const personalInfo = response.data.personalInfo
      const personalFields = ['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'website']
      personalFields.forEach(field => {
        totalFields++
        if (personalInfo[field as keyof typeof personalInfo]) {
          filledFields++
        }
      })

      // Sections completeness
      totalFields += response.data.sections.length
      filledFields += response.data.sections.filter(section => 
        section.items && section.items.length > 0
      ).length

      stats.completeness = totalFields > 0 ? filledFields / totalFields : 0
    }

    return stats
  }
}