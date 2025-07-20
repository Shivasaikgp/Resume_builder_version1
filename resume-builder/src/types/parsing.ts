import { z } from 'zod'
import { ResumeData } from './database'

// Parsing result interfaces
export interface ParsedResumeData {
  personalInfo: {
    fullName?: string
    email?: string
    phone?: string
    location?: string
    linkedin?: string
    github?: string
    website?: string
  }
  sections: ParsedSection[]
  rawText: string
  confidence: number
}

export interface ParsedSection {
  type: 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'custom'
  title: string
  content: any[]
  confidence: number
  rawContent: string
}

export interface ParsedExperience {
  title?: string
  company?: string
  location?: string
  startDate?: string
  endDate?: string
  current?: boolean
  description?: string[]
}

export interface ParsedEducation {
  degree?: string
  school?: string
  location?: string
  graduationDate?: string
  gpa?: string
  honors?: string[]
}

export interface ParsedSkills {
  category?: string
  skills: string[]
}

export interface ParsedProject {
  name?: string
  description?: string
  technologies?: string[]
  url?: string
  github?: string
  startDate?: string
  endDate?: string
}

// Parsing validation schemas
export const ParsedPersonalInfoSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal(''))
})

export const ParsedSectionSchema = z.object({
  type: z.enum(['experience', 'education', 'skills', 'projects', 'certifications', 'custom']),
  title: z.string(),
  content: z.array(z.any()),
  confidence: z.number().min(0).max(1),
  rawContent: z.string()
})

export const ParsedResumeDataSchema = z.object({
  personalInfo: ParsedPersonalInfoSchema,
  sections: z.array(ParsedSectionSchema),
  rawText: z.string(),
  confidence: z.number().min(0).max(1)
})

// File upload interfaces
export interface FileUpload {
  filename: string
  mimetype: string
  buffer: Buffer
  size: number
}

export interface ParseRequest {
  file: FileUpload
  options?: ParseOptions
}

export interface ParseOptions {
  strictValidation?: boolean
  includeRawText?: boolean
  confidenceThreshold?: number
  sectionMapping?: Record<string, string>
}

export interface ParseResponse {
  success: boolean
  data?: ResumeData
  parsed?: ParsedResumeData
  errors?: ParseError[]
  warnings?: string[]
}

export interface ParseError {
  type: 'validation' | 'parsing' | 'format' | 'content'
  message: string
  section?: string
  field?: string
  severity: 'low' | 'medium' | 'high'
}

// Validation result interfaces
export interface ValidationResult {
  isValid: boolean
  errors: ParseError[]
  warnings: string[]
  confidence: number
}

export interface ContentMapping {
  originalText: string
  mappedValue: any
  confidence: number
  section: string
  field: string
}

// Export types
export type ParsedPersonalInfo = z.infer<typeof ParsedPersonalInfoSchema>