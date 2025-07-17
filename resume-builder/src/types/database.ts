import { z } from 'zod'

// Personal Information Schema
export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
})

// Experience Item Schema
export const ExperienceItemSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  location: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.array(z.string()).optional(),
})

// Education Item Schema
export const EducationItemSchema = z.object({
  degree: z.string().min(1, 'Degree is required'),
  school: z.string().min(1, 'School name is required'),
  location: z.string().optional(),
  graduationDate: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.array(z.string()).optional(),
})

// Skills Item Schema
export const SkillsItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  skills: z.array(z.string().min(1)).min(1, 'At least one skill is required'),
})

// Project Item Schema
export const ProjectItemSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  url: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Resume Section Schema
export const ResumeSectionSchema = z.object({
  type: z.enum(['experience', 'education', 'skills', 'projects', 'certifications', 'custom']),
  title: z.string().min(1, 'Section title is required'),
  items: z.array(z.union([
    ExperienceItemSchema,
    EducationItemSchema,
    SkillsItemSchema,
    ProjectItemSchema,
    z.record(z.any()), // For custom sections
  ])),
  order: z.number().optional(),
  visible: z.boolean().default(true),
})

// Template Configuration Schema
export const TemplateConfigSchema = z.object({
  layout: z.enum(['modern', 'classic', 'minimal', 'creative']).default('modern'),
  colorScheme: z.enum(['blue', 'green', 'purple', 'gray', 'black']).default('blue'),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  spacing: z.enum(['compact', 'normal', 'relaxed']).default('normal'),
  showPhoto: z.boolean().default(false),
  photoUrl: z.string().url().optional().or(z.literal('')),
})

// Resume Data Schema
export const ResumeDataSchema = z.object({
  personalInfo: PersonalInfoSchema,
  sections: z.array(ResumeSectionSchema),
})

// User Context Profile Schema
export const UserProfileSchema = z.object({
  industry: z.string().optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  targetRoles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  careerGoals: z.array(z.string()).default([]),
})

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  writingStyle: z.enum(['formal', 'casual', 'technical']).default('formal'),
  contentLength: z.enum(['concise', 'detailed']).default('detailed'),
  focusAreas: z.array(z.string()).default([]),
})

// User Interaction Schema
export const UserInteractionSchema = z.object({
  type: z.enum(['suggestion_accepted', 'suggestion_rejected', 'content_generated', 'analysis_requested']),
  timestamp: z.string().datetime(),
  data: z.record(z.any()).optional(),
})

// User Context Schema
export const UserContextSchema = z.object({
  profile: UserProfileSchema.optional(),
  preferences: UserPreferencesSchema.optional(),
  history: z.object({
    interactions: z.array(UserInteractionSchema).default([]),
    feedbackPatterns: z.array(z.record(z.any())).default([]),
    improvementAreas: z.array(z.string()).default([]),
  }).optional(),
})

// Resume Analysis Schema
export const ResumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  breakdown: z.object({
    content: z.number().min(0).max(100),
    formatting: z.number().min(0).max(100),
    atsCompatibility: z.number().min(0).max(100),
    keywords: z.number().min(0).max(100),
  }),
  suggestions: z.array(z.object({
    type: z.enum(['content', 'formatting', 'keywords', 'structure']),
    priority: z.enum(['low', 'medium', 'high']),
    message: z.string(),
    section: z.string().optional(),
  })),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
})

// TypeScript types derived from schemas
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>
export type EducationItem = z.infer<typeof EducationItemSchema>
export type SkillsItem = z.infer<typeof SkillsItemSchema>
export type ProjectItem = z.infer<typeof ProjectItemSchema>
export type ResumeSection = z.infer<typeof ResumeSectionSchema>
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>
export type ResumeData = z.infer<typeof ResumeDataSchema>
export type UserProfile = z.infer<typeof UserProfileSchema>
export type UserPreferences = z.infer<typeof UserPreferencesSchema>
export type UserInteraction = z.infer<typeof UserInteractionSchema>
export type UserContext = z.infer<typeof UserContextSchema>
export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>

// Database model types (matching Prisma schema)
export interface User {
  id: string
  email: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Resume {
  id: string
  userId: string
  title: string
  data: ResumeData
  templateConfig: TemplateConfig
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface UserContextModel {
  id: string
  userId: string
  contextData: UserContext
  updatedAt: Date
}

export interface ResumeAnalysisModel {
  id: string
  resumeId: string
  score: number
  analysisData: ResumeAnalysis
  createdAt: Date
}