import { describe, it, expect } from 'vitest'
import {
  PersonalInfoSchema,
  ExperienceItemSchema,
  EducationItemSchema,
  SkillsItemSchema,
  ProjectItemSchema,
  ResumeSectionSchema,
  TemplateConfigSchema,
  ResumeDataSchema,
  UserContextSchema,
  ResumeAnalysisSchema,
} from '../database'

describe('Database Schema Validation', () => {
  describe('PersonalInfoSchema', () => {
    it('should validate valid personal info', () => {
      const validData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe',
      }

      const result = PersonalInfoSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        fullName: 'John Doe',
        email: 'invalid-email',
      }

      const result = PersonalInfoSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should require full name', () => {
      const invalidData = {
        email: 'john@example.com',
      }

      const result = PersonalInfoSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('ExperienceItemSchema', () => {
    it('should validate valid experience item', () => {
      const validData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: '2022-01',
        endDate: '2023-12',
        description: [
          'Developed web applications',
          'Led team of 3 developers',
        ],
      }

      const result = ExperienceItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require title and company', () => {
      const invalidData = {
        location: 'San Francisco, CA',
        startDate: '2022-01',
      }

      const result = ExperienceItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('EducationItemSchema', () => {
    it('should validate valid education item', () => {
      const validData = {
        degree: 'Bachelor of Science in Computer Science',
        school: 'University of California, Berkeley',
        location: 'Berkeley, CA',
        graduationDate: '2020',
        gpa: '3.8',
      }

      const result = EducationItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require degree and school', () => {
      const invalidData = {
        location: 'Berkeley, CA',
        graduationDate: '2020',
      }

      const result = EducationItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('SkillsItemSchema', () => {
    it('should validate valid skills item', () => {
      const validData = {
        category: 'Programming Languages',
        skills: ['JavaScript', 'TypeScript', 'Python'],
      }

      const result = SkillsItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require at least one skill', () => {
      const invalidData = {
        category: 'Programming Languages',
        skills: [],
      }

      const result = SkillsItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('ProjectItemSchema', () => {
    it('should validate valid project item', () => {
      const validData = {
        name: 'Resume Builder',
        description: 'AI-powered resume builder application',
        technologies: ['React', 'Next.js', 'TypeScript'],
        url: 'https://resume-builder.com',
        github: 'https://github.com/user/resume-builder',
      }

      const result = ProjectItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require project name', () => {
      const invalidData = {
        description: 'AI-powered resume builder application',
        technologies: ['React', 'Next.js'],
      }

      const result = ProjectItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('ResumeSectionSchema', () => {
    it('should validate valid resume section', () => {
      const validData = {
        type: 'experience',
        title: 'Professional Experience',
        items: [
          {
            title: 'Software Engineer',
            company: 'Tech Corp',
            startDate: '2022-01',
          },
        ],
      }

      const result = ResumeSectionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate section types', () => {
      const invalidData = {
        type: 'invalid-type',
        title: 'Invalid Section',
        items: [],
      }

      const result = ResumeSectionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('TemplateConfigSchema', () => {
    it('should validate valid template config', () => {
      const validData = {
        layout: 'modern',
        colorScheme: 'blue',
        fontSize: 'medium',
        spacing: 'normal',
        showPhoto: false,
      }

      const result = TemplateConfigSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default values', () => {
      const minimalData = {}

      const result = TemplateConfigSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.layout).toBe('modern')
        expect(result.data.colorScheme).toBe('blue')
        expect(result.data.fontSize).toBe('medium')
        expect(result.data.spacing).toBe('normal')
        expect(result.data.showPhoto).toBe(false)
      }
    })
  })

  describe('ResumeDataSchema', () => {
    it('should validate complete resume data', () => {
      const validData = {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        sections: [
          {
            type: 'experience',
            title: 'Professional Experience',
            items: [
              {
                title: 'Software Engineer',
                company: 'Tech Corp',
                startDate: '2022-01',
              },
            ],
          },
        ],
      }

      const result = ResumeDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('UserContextSchema', () => {
    it('should validate valid user context', () => {
      const validData = {
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
        history: {
          interactions: [],
          feedbackPatterns: [],
          improvementAreas: [],
        },
      }

      const result = UserContextSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should handle empty context', () => {
      const emptyData = {}

      const result = UserContextSchema.safeParse(emptyData)
      expect(result.success).toBe(true)
    })
  })

  describe('ResumeAnalysisSchema', () => {
    it('should validate valid resume analysis', () => {
      const validData = {
        overallScore: 85,
        breakdown: {
          content: 88,
          formatting: 82,
          atsCompatibility: 85,
          keywords: 80,
        },
        suggestions: [
          {
            type: 'content',
            priority: 'medium',
            message: 'Add more quantifiable achievements',
            section: 'experience',
          },
        ],
        strengths: ['Strong technical skills'],
        improvements: ['Add more metrics'],
      }

      const result = ResumeAnalysisSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate score ranges', () => {
      const invalidData = {
        overallScore: 150, // Invalid: > 100
        breakdown: {
          content: 88,
          formatting: 82,
          atsCompatibility: 85,
          keywords: 80,
        },
        suggestions: [],
        strengths: [],
        improvements: [],
      }

      const result = ResumeAnalysisSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})