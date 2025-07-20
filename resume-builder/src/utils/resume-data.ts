import { z } from 'zod'
import {
  ResumeData,
  ResumeSection,
  PersonalInfo,
  ExperienceItem,
  EducationItem,
  SkillsItem,
  ProjectItem,
  TemplateConfig,
  UserContext,
  ResumeAnalysis,
} from '../types'
import {
  ResumeDataSchema,
  PersonalInfoSchema,
  ResumeSectionSchema,
  TemplateConfigSchema,
  UserContextSchema,
  ResumeAnalysisSchema,
} from '../types/database'

// Utility functions for resume data manipulation

/**
 * Creates a new empty resume with default structure
 */
export function createEmptyResume(): ResumeData {
  return {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
    },
    sections: [
      {
        type: 'experience',
        title: 'Professional Experience',
        items: [],
        order: 1,
        visible: true,
      },
      {
        type: 'education',
        title: 'Education',
        items: [],
        order: 2,
        visible: true,
      },
      {
        type: 'skills',
        title: 'Skills',
        items: [],
        order: 3,
        visible: true,
      },
    ],
  }
}

/**
 * Creates a valid empty resume for testing purposes
 */
export function createValidEmptyResume(): ResumeData {
  return {
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
    },
    sections: [
      {
        type: 'experience',
        title: 'Professional Experience',
        items: [],
        order: 1,
        visible: true,
      },
      {
        type: 'education',
        title: 'Education',
        items: [],
        order: 2,
        visible: true,
      },
      {
        type: 'skills',
        title: 'Skills',
        items: [],
        order: 3,
        visible: true,
      },
    ],
  }
}

/**
 * Creates a default template configuration
 */
export function createDefaultTemplateConfig(): TemplateConfig {
  return {
    layout: 'modern',
    colorScheme: 'blue',
    fontSize: 'medium',
    spacing: 'normal',
    showPhoto: false,
    photoUrl: '',
  }
}

/**
 * Validates resume data against schema
 */
export function validateResumeData(data: unknown): {
  success: boolean
  data?: ResumeData
  errors?: string[]
} {
  const result = ResumeDataSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return {
    success: false,
    errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
  }
}

/**
 * Validates personal info data
 */
export function validatePersonalInfo(data: unknown): {
  success: boolean
  data?: PersonalInfo
  errors?: string[]
} {
  const result = PersonalInfoSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return {
    success: false,
    errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
  }
}

/**
 * Validates resume section data
 */
export function validateResumeSection(data: unknown): {
  success: boolean
  data?: ResumeSection
  errors?: string[]
} {
  const result = ResumeSectionSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return {
    success: false,
    errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
  }
}

/**
 * Adds a new section to resume data
 */
export function addResumeSection(
  resumeData: ResumeData,
  section: Omit<ResumeSection, 'order'>
): ResumeData {
  const maxOrder = Math.max(...resumeData.sections.map(s => s.order || 0), 0)
  
  return {
    ...resumeData,
    sections: [
      ...resumeData.sections,
      {
        ...section,
        order: maxOrder + 1,
      },
    ],
  }
}

/**
 * Updates a section in resume data
 */
export function updateResumeSection(
  resumeData: ResumeData,
  sectionIndex: number,
  updatedSection: Partial<ResumeSection>
): ResumeData {
  if (sectionIndex < 0 || sectionIndex >= resumeData.sections.length) {
    throw new Error('Invalid section index')
  }
  
  const updatedSections = [...resumeData.sections]
  updatedSections[sectionIndex] = {
    ...updatedSections[sectionIndex],
    ...updatedSection,
  }
  
  return {
    ...resumeData,
    sections: updatedSections,
  }
}

/**
 * Removes a section from resume data
 */
export function removeResumeSection(
  resumeData: ResumeData,
  sectionIndex: number
): ResumeData {
  if (sectionIndex < 0 || sectionIndex >= resumeData.sections.length) {
    throw new Error('Invalid section index')
  }
  
  return {
    ...resumeData,
    sections: resumeData.sections.filter((_, index) => index !== sectionIndex),
  }
}

/**
 * Reorders sections in resume data
 */
export function reorderResumeSections(
  resumeData: ResumeData,
  newOrder: number[]
): ResumeData {
  if (newOrder.length !== resumeData.sections.length) {
    throw new Error('New order array must match sections length')
  }
  
  const reorderedSections = newOrder.map(index => {
    if (index < 0 || index >= resumeData.sections.length) {
      throw new Error('Invalid section index in new order')
    }
    return resumeData.sections[index]
  })
  
  // Update order property
  const sectionsWithOrder = reorderedSections.map((section, index) => ({
    ...section,
    order: index + 1,
  }))
  
  return {
    ...resumeData,
    sections: sectionsWithOrder,
  }
}

/**
 * Adds an item to a specific section
 */
export function addItemToSection<T extends ExperienceItem | EducationItem | SkillsItem | ProjectItem>(
  resumeData: ResumeData,
  sectionIndex: number,
  item: T
): ResumeData {
  if (sectionIndex < 0 || sectionIndex >= resumeData.sections.length) {
    throw new Error('Invalid section index')
  }
  
  const updatedSections = [...resumeData.sections]
  const section = updatedSections[sectionIndex]
  
  updatedSections[sectionIndex] = {
    ...section,
    items: [...section.items, item],
  }
  
  return {
    ...resumeData,
    sections: updatedSections,
  }
}

/**
 * Updates an item in a specific section
 */
export function updateItemInSection<T extends ExperienceItem | EducationItem | SkillsItem | ProjectItem>(
  resumeData: ResumeData,
  sectionIndex: number,
  itemIndex: number,
  updatedItem: Partial<T>
): ResumeData {
  if (sectionIndex < 0 || sectionIndex >= resumeData.sections.length) {
    throw new Error('Invalid section index')
  }
  
  const section = resumeData.sections[sectionIndex]
  if (itemIndex < 0 || itemIndex >= section.items.length) {
    throw new Error('Invalid item index')
  }
  
  const updatedSections = [...resumeData.sections]
  const updatedItems = [...section.items]
  updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updatedItem }
  
  updatedSections[sectionIndex] = {
    ...section,
    items: updatedItems,
  }
  
  return {
    ...resumeData,
    sections: updatedSections,
  }
}

/**
 * Removes an item from a specific section
 */
export function removeItemFromSection(
  resumeData: ResumeData,
  sectionIndex: number,
  itemIndex: number
): ResumeData {
  if (sectionIndex < 0 || sectionIndex >= resumeData.sections.length) {
    throw new Error('Invalid section index')
  }
  
  const section = resumeData.sections[sectionIndex]
  if (itemIndex < 0 || itemIndex >= section.items.length) {
    throw new Error('Invalid item index')
  }
  
  const updatedSections = [...resumeData.sections]
  const updatedItems = section.items.filter((_, index) => index !== itemIndex)
  
  updatedSections[sectionIndex] = {
    ...section,
    items: updatedItems,
  }
  
  return {
    ...resumeData,
    sections: updatedSections,
  }
}

/**
 * Serializes resume data to JSON string
 */
export function serializeResumeData(resumeData: ResumeData): string {
  try {
    // Validate before serializing
    const validation = validateResumeData(resumeData)
    if (!validation.success) {
      throw new Error(`Invalid resume data: ${validation.errors?.join(', ')}`)
    }
    
    return JSON.stringify(resumeData, null, 2)
  } catch (error) {
    throw new Error(`Failed to serialize resume data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Deserializes resume data from JSON string
 */
export function deserializeResumeData(jsonString: string): ResumeData {
  try {
    const parsed = JSON.parse(jsonString)
    const validation = validateResumeData(parsed)
    
    if (!validation.success) {
      throw new Error(`Invalid resume data format: ${validation.errors?.join(', ')}`)
    }
    
    return validation.data!
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Serializes template config to JSON string
 */
export function serializeTemplateConfig(config: TemplateConfig): string {
  try {
    const validation = TemplateConfigSchema.safeParse(config)
    if (!validation.success) {
      throw new Error(`Invalid template config: ${validation.error.issues.map(i => i.message).join(', ')}`)
    }
    
    return JSON.stringify(config, null, 2)
  } catch (error) {
    throw new Error(`Failed to serialize template config: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Deserializes template config from JSON string
 */
export function deserializeTemplateConfig(jsonString: string): TemplateConfig {
  try {
    const parsed = JSON.parse(jsonString)
    const validation = TemplateConfigSchema.safeParse(parsed)
    
    if (!validation.success) {
      throw new Error(`Invalid template config format: ${validation.error.issues.map(i => i.message).join(', ')}`)
    }
    
    return validation.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Serializes user context to JSON string
 */
export function serializeUserContext(context: UserContext): string {
  try {
    const validation = UserContextSchema.safeParse(context)
    if (!validation.success) {
      throw new Error(`Invalid user context: ${validation.error.issues.map(i => i.message).join(', ')}`)
    }
    
    return JSON.stringify(context, null, 2)
  } catch (error) {
    throw new Error(`Failed to serialize user context: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Deserializes user context from JSON string
 */
export function deserializeUserContext(jsonString: string): UserContext {
  try {
    const parsed = JSON.parse(jsonString)
    const validation = UserContextSchema.safeParse(parsed)
    
    if (!validation.success) {
      throw new Error(`Invalid user context format: ${validation.error.issues.map(i => i.message).join(', ')}`)
    }
    
    return validation.data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Deep clones resume data
 */
export function cloneResumeData(resumeData: ResumeData): ResumeData {
  return deserializeResumeData(serializeResumeData(resumeData))
}

/**
 * Merges two resume data objects, with the second taking precedence
 */
export function mergeResumeData(base: ResumeData, override: Partial<ResumeData>): ResumeData {
  const merged = {
    ...base,
    ...override,
    personalInfo: {
      ...base.personalInfo,
      ...(override.personalInfo || {}),
    },
    sections: override.sections || base.sections,
  }
  
  const validation = validateResumeData(merged)
  if (!validation.success) {
    throw new Error(`Invalid merged resume data: ${validation.errors?.join(', ')}`)
  }
  
  return validation.data!
}

/**
 * Calculates resume completeness score (0-100)
 */
export function calculateCompletenessScore(resumeData: ResumeData): number {
  let totalFields = 0
  let completedFields = 0
  
  // Personal info scoring
  const personalInfoFields = ['fullName', 'email', 'phone', 'location'] as const
  personalInfoFields.forEach(field => {
    totalFields++
    if (resumeData.personalInfo[field] && resumeData.personalInfo[field].trim() !== '') {
      completedFields++
    }
  })
  
  // Optional personal info fields (half weight)
  const optionalFields = ['linkedin', 'github', 'website'] as const
  optionalFields.forEach(field => {
    totalFields += 0.5
    if (resumeData.personalInfo[field] && resumeData.personalInfo[field]!.trim() !== '') {
      completedFields += 0.5
    }
  })
  
  // Sections scoring - only count sections that have content
  resumeData.sections.forEach(section => {
    if (section.visible) {
      totalFields += 1 // Only count having items, not title
      if (section.items && section.items.length > 0) {
        completedFields++
      }
    }
  })
  
  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
}

/**
 * Gets section by type
 */
export function getSectionByType(
  resumeData: ResumeData,
  type: ResumeSection['type']
): ResumeSection | undefined {
  return resumeData.sections.find(section => section.type === type)
}

/**
 * Gets all sections of a specific type
 */
export function getSectionsByType(
  resumeData: ResumeData,
  type: ResumeSection['type']
): ResumeSection[] {
  return resumeData.sections.filter(section => section.type === type)
}

/**
 * Checks if resume has any content
 */
export function hasContent(resumeData: ResumeData): boolean {
  // Check personal info
  const hasPersonalInfo = Object.values(resumeData.personalInfo).some(
    value => value && value.trim() !== ''
  )
  
  // Check sections
  const hasSectionContent = resumeData.sections.some(
    section => section.items && section.items.length > 0
  )
  
  return hasPersonalInfo || hasSectionContent
}