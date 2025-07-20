import { describe, it, expect } from 'vitest'
import {
  createEmptyResume,
  createValidEmptyResume,
  createDefaultTemplateConfig,
  validateResumeData,
  validatePersonalInfo,
  validateResumeSection,
  addResumeSection,
  updateResumeSection,
  removeResumeSection,
  reorderResumeSections,
  addItemToSection,
  updateItemInSection,
  removeItemFromSection,
  serializeResumeData,
  deserializeResumeData,
  serializeTemplateConfig,
  deserializeTemplateConfig,
  serializeUserContext,
  deserializeUserContext,
  cloneResumeData,
  mergeResumeData,
  calculateCompletenessScore,
  getSectionByType,
  getSectionsByType,
  hasContent,
} from '../resume-data'
import type {
  ResumeData,
  PersonalInfo,
  ResumeSection,
  ExperienceItem,
  TemplateConfig,
  UserContext,
} from '../../types'

describe('Resume Data Utilities', () => {
  describe('createEmptyResume', () => {
    it('should create a valid empty resume structure', () => {
      const resume = createEmptyResume()
      
      expect(resume.personalInfo).toBeDefined()
      expect(resume.personalInfo.fullName).toBe('')
      expect(resume.personalInfo.email).toBe('')
      expect(resume.sections).toHaveLength(3)
      expect(resume.sections[0].type).toBe('experience')
      expect(resume.sections[1].type).toBe('education')
      expect(resume.sections[2].type).toBe('skills')
    })

    it('should create sections with proper order', () => {
      const resume = createEmptyResume()
      
      expect(resume.sections[0].order).toBe(1)
      expect(resume.sections[1].order).toBe(2)
      expect(resume.sections[2].order).toBe(3)
    })
  })

  describe('createDefaultTemplateConfig', () => {
    it('should create a valid default template config', () => {
      const config = createDefaultTemplateConfig()
      
      expect(config.layout).toBe('modern')
      expect(config.colorScheme).toBe('blue')
      expect(config.fontSize).toBe('medium')
      expect(config.spacing).toBe('normal')
      expect(config.showPhoto).toBe(false)
    })
  })

  describe('validateResumeData', () => {
    it('should validate correct resume data', () => {
      const validResume = createValidEmptyResume()
      const result = validateResumeData(validResume)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.errors).toBeUndefined()
    })

    it('should reject invalid resume data', () => {
      const invalidResume = {
        personalInfo: {
          fullName: '',
          email: 'invalid-email', // Invalid email
        },
        sections: [],
      }
      
      const result = validateResumeData(invalidResume)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should handle missing required fields', () => {
      const incompleteResume = {
        personalInfo: {
          // Missing fullName and email
        },
        sections: [],
      }
      
      const result = validateResumeData(incompleteResume)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('validatePersonalInfo', () => {
    it('should validate correct personal info', () => {
      const validPersonalInfo: PersonalInfo = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
        website: 'https://johndoe.com',
      }
      
      const result = validatePersonalInfo(validPersonalInfo)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validPersonalInfo)
    })

    it('should reject invalid email', () => {
      const invalidPersonalInfo = {
        fullName: 'John Doe',
        email: 'not-an-email',
      }
      
      const result = validatePersonalInfo(invalidPersonalInfo)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('validateResumeSection', () => {
    it('should validate correct resume section', () => {
      const validSection: ResumeSection = {
        type: 'experience',
        title: 'Professional Experience',
        items: [],
        order: 1,
        visible: true,
      }
      
      const result = validateResumeSection(validSection)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validSection)
    })

    it('should reject invalid section type', () => {
      const invalidSection = {
        type: 'invalid-type',
        title: 'Invalid Section',
        items: [],
      }
      
      const result = validateResumeSection(invalidSection)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('addResumeSection', () => {
    it('should add a new section with correct order', () => {
      const resume = createEmptyResume()
      const newSection: Omit<ResumeSection, 'order'> = {
        type: 'projects',
        title: 'Projects',
        items: [],
        visible: true,
      }
      
      const updatedResume = addResumeSection(resume, newSection)
      
      expect(updatedResume.sections).toHaveLength(4)
      expect(updatedResume.sections[3].type).toBe('projects')
      expect(updatedResume.sections[3].order).toBe(4)
    })
  })

  describe('updateResumeSection', () => {
    it('should update an existing section', () => {
      const resume = createEmptyResume()
      const updatedSection = { title: 'Work Experience' }
      
      const updatedResume = updateResumeSection(resume, 0, updatedSection)
      
      expect(updatedResume.sections[0].title).toBe('Work Experience')
      expect(updatedResume.sections[0].type).toBe('experience') // Should preserve other properties
    })

    it('should throw error for invalid index', () => {
      const resume = createEmptyResume()
      
      expect(() => updateResumeSection(resume, 10, {})).toThrow('Invalid section index')
    })
  })

  describe('removeResumeSection', () => {
    it('should remove a section', () => {
      const resume = createEmptyResume()
      const updatedResume = removeResumeSection(resume, 1) // Remove education section
      
      expect(updatedResume.sections).toHaveLength(2)
      expect(updatedResume.sections.find(s => s.type === 'education')).toBeUndefined()
    })

    it('should throw error for invalid index', () => {
      const resume = createEmptyResume()
      
      expect(() => removeResumeSection(resume, 10)).toThrow('Invalid section index')
    })
  })

  describe('reorderResumeSections', () => {
    it('should reorder sections correctly', () => {
      const resume = createEmptyResume()
      const newOrder = [2, 0, 1] // skills, experience, education
      
      const reorderedResume = reorderResumeSections(resume, newOrder)
      
      expect(reorderedResume.sections[0].type).toBe('skills')
      expect(reorderedResume.sections[1].type).toBe('experience')
      expect(reorderedResume.sections[2].type).toBe('education')
      expect(reorderedResume.sections[0].order).toBe(1)
      expect(reorderedResume.sections[1].order).toBe(2)
      expect(reorderedResume.sections[2].order).toBe(3)
    })

    it('should throw error for invalid order array', () => {
      const resume = createEmptyResume()
      
      expect(() => reorderResumeSections(resume, [0, 1])).toThrow('New order array must match sections length')
      expect(() => reorderResumeSections(resume, [0, 1, 10])).toThrow('Invalid section index in new order')
    })
  })

  describe('addItemToSection', () => {
    it('should add an item to a section', () => {
      const resume = createEmptyResume()
      const experienceItem: ExperienceItem = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: '2022-01',
        endDate: '2023-12',
        description: ['Developed web applications'],
      }
      
      const updatedResume = addItemToSection(resume, 0, experienceItem)
      
      expect(updatedResume.sections[0].items).toHaveLength(1)
      expect(updatedResume.sections[0].items[0]).toEqual(experienceItem)
    })

    it('should throw error for invalid section index', () => {
      const resume = createEmptyResume()
      const item = { title: 'Test', company: 'Test Corp', startDate: '2022-01' }
      
      expect(() => addItemToSection(resume, 10, item)).toThrow('Invalid section index')
    })
  })

  describe('updateItemInSection', () => {
    it('should update an item in a section', () => {
      const resume = createEmptyResume()
      const experienceItem: ExperienceItem = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2022-01',
      }
      
      let updatedResume = addItemToSection(resume, 0, experienceItem)
      updatedResume = updateItemInSection(updatedResume, 0, 0, { title: 'Senior Software Engineer' })
      
      expect(updatedResume.sections[0].items[0].title).toBe('Senior Software Engineer')
      expect(updatedResume.sections[0].items[0].company).toBe('Tech Corp') // Should preserve other properties
    })

    it('should throw error for invalid indices', () => {
      const resume = createEmptyResume()
      
      expect(() => updateItemInSection(resume, 10, 0, {})).toThrow('Invalid section index')
      expect(() => updateItemInSection(resume, 0, 10, {})).toThrow('Invalid item index')
    })
  })

  describe('removeItemFromSection', () => {
    it('should remove an item from a section', () => {
      const resume = createEmptyResume()
      const experienceItem: ExperienceItem = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2022-01',
      }
      
      let updatedResume = addItemToSection(resume, 0, experienceItem)
      updatedResume = removeItemFromSection(updatedResume, 0, 0)
      
      expect(updatedResume.sections[0].items).toHaveLength(0)
    })

    it('should throw error for invalid indices', () => {
      const resume = createEmptyResume()
      
      expect(() => removeItemFromSection(resume, 10, 0)).toThrow('Invalid section index')
      expect(() => removeItemFromSection(resume, 0, 10)).toThrow('Invalid item index')
    })
  })

  describe('serialization and deserialization', () => {
    describe('serializeResumeData and deserializeResumeData', () => {
      it('should serialize and deserialize resume data correctly', () => {
        const resume = createEmptyResume()
        resume.personalInfo.fullName = 'John Doe'
        resume.personalInfo.email = 'john@example.com'
        
        const serialized = serializeResumeData(resume)
        const deserialized = deserializeResumeData(serialized)
        
        expect(deserialized).toEqual(resume)
      })

      it('should throw error for invalid resume data during serialization', () => {
        const invalidResume = {
          personalInfo: { email: 'invalid-email' },
          sections: [],
        } as any
        
        expect(() => serializeResumeData(invalidResume)).toThrow('Invalid resume data')
      })

      it('should throw error for invalid JSON during deserialization', () => {
        expect(() => deserializeResumeData('invalid json')).toThrow('Invalid JSON format')
      })
    })

    describe('serializeTemplateConfig and deserializeTemplateConfig', () => {
      it('should serialize and deserialize template config correctly', () => {
        const config = createDefaultTemplateConfig()
        
        const serialized = serializeTemplateConfig(config)
        const deserialized = deserializeTemplateConfig(serialized)
        
        expect(deserialized).toEqual(config)
      })
    })

    describe('serializeUserContext and deserializeUserContext', () => {
      it('should serialize and deserialize user context correctly', () => {
        const context: UserContext = {
          profile: {
            industry: 'Technology',
            experienceLevel: 'mid',
            targetRoles: ['Software Engineer'],
            skills: ['JavaScript', 'React'],
            careerGoals: ['Lead technical projects'],
          },
          preferences: {
            writingStyle: 'formal',
            contentLength: 'detailed',
            focusAreas: ['technical skills'],
          },
        }
        
        const serialized = serializeUserContext(context)
        const deserialized = deserializeUserContext(serialized)
        
        expect(deserialized).toEqual(context)
      })
    })
  })

  describe('cloneResumeData', () => {
    it('should create a deep clone of resume data', () => {
      const resume = createValidEmptyResume()
      resume.personalInfo.fullName = 'Jane Doe'
      
      const cloned = cloneResumeData(resume)
      
      expect(cloned).toEqual(resume)
      expect(cloned).not.toBe(resume) // Different object reference
      expect(cloned.personalInfo).not.toBe(resume.personalInfo) // Deep clone
    })
  })

  describe('mergeResumeData', () => {
    it('should merge resume data correctly', () => {
      const base = createEmptyResume()
      base.personalInfo.fullName = 'John Doe'
      base.personalInfo.email = 'john@example.com'
      
      const override = {
        personalInfo: {
          fullName: 'Jane Doe',
          phone: '+1 (555) 123-4567',
        },
      }
      
      const merged = mergeResumeData(base, override)
      
      expect(merged.personalInfo.fullName).toBe('Jane Doe') // Overridden
      expect(merged.personalInfo.email).toBe('john@example.com') // Preserved
      expect(merged.personalInfo.phone).toBe('+1 (555) 123-4567') // Added
    })

    it('should throw error for invalid merged data', () => {
      const base = createEmptyResume()
      const override = {
        personalInfo: {
          email: 'invalid-email',
        },
      }
      
      expect(() => mergeResumeData(base, override)).toThrow('Invalid merged resume data')
    })
  })

  describe('calculateCompletenessScore', () => {
    it('should calculate 0% for empty resume', () => {
      const resume = createEmptyResume()
      const score = calculateCompletenessScore(resume)
      
      expect(score).toBe(0)
    })

    it('should calculate partial score for partially filled resume', () => {
      const resume = createEmptyResume()
      resume.personalInfo.fullName = 'John Doe'
      resume.personalInfo.email = 'john@example.com'
      
      const score = calculateCompletenessScore(resume)
      
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThan(100)
    })

    it('should calculate higher score for more complete resume', () => {
      const resume = createEmptyResume()
      resume.personalInfo.fullName = 'John Doe'
      resume.personalInfo.email = 'john@example.com'
      resume.personalInfo.phone = '+1 (555) 123-4567'
      resume.personalInfo.location = 'San Francisco, CA'
      
      // Add some section content
      resume.sections[0].items = [{
        title: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2022-01',
      }]
      
      const score = calculateCompletenessScore(resume)
      
      expect(score).toBeGreaterThan(50)
    })
  })

  describe('getSectionByType', () => {
    it('should find section by type', () => {
      const resume = createEmptyResume()
      const experienceSection = getSectionByType(resume, 'experience')
      
      expect(experienceSection).toBeDefined()
      expect(experienceSection!.type).toBe('experience')
    })

    it('should return undefined for non-existent type', () => {
      const resume = createEmptyResume()
      const projectsSection = getSectionByType(resume, 'projects')
      
      expect(projectsSection).toBeUndefined()
    })
  })

  describe('getSectionsByType', () => {
    it('should find all sections by type', () => {
      const resume = createEmptyResume()
      const experienceSections = getSectionsByType(resume, 'experience')
      
      expect(experienceSections).toHaveLength(1)
      expect(experienceSections[0].type).toBe('experience')
    })

    it('should return empty array for non-existent type', () => {
      const resume = createEmptyResume()
      const projectsSections = getSectionsByType(resume, 'projects')
      
      expect(projectsSections).toHaveLength(0)
    })
  })

  describe('hasContent', () => {
    it('should return false for empty resume', () => {
      const resume = createEmptyResume()
      
      expect(hasContent(resume)).toBe(false)
    })

    it('should return true for resume with personal info', () => {
      const resume = createEmptyResume()
      resume.personalInfo.fullName = 'John Doe'
      
      expect(hasContent(resume)).toBe(true)
    })

    it('should return true for resume with section content', () => {
      const resume = createEmptyResume()
      resume.sections[0].items = [{
        title: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2022-01',
      }]
      
      expect(hasContent(resume)).toBe(true)
    })
  })
})