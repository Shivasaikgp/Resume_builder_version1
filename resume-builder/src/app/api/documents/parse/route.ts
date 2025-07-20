import { NextRequest, NextResponse } from 'next/server'
import { ResumeParser } from '@/lib/parsing/resume-parser'
import { FileUpload, ParseOptions } from '@/types/parsing'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optionsStr = formData.get('options') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ResumeParser.isSupportedFileType(file.type)) {
      return NextResponse.json(
        { 
          error: 'Unsupported file type',
          supportedTypes: ResumeParser.getSupportedFileTypes()
        },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Prepare file upload object
    const fileUpload: FileUpload = {
      filename: file.name,
      mimetype: file.type,
      buffer,
      size: file.size
    }

    // Parse options
    let options: ParseOptions = ResumeParser.getDefaultParseOptions()
    if (optionsStr) {
      try {
        const parsedOptions = JSON.parse(optionsStr)
        options = { ...options, ...parsedOptions }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid options format' },
          { status: 400 }
        )
      }
    }

    // Parse the resume
    const parser = new ResumeParser()
    const result = await parser.parseResume({ file: fileUpload, options })

    // Get parsing statistics
    const stats = parser.getParsingStats(result)

    // Return result with statistics
    return NextResponse.json({
      ...result,
      stats,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        parsedAt: new Date().toISOString(),
        userId: session.user.id
      }
    })

  } catch (error) {
    console.error('Resume parsing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    supportedFileTypes: ResumeParser.getSupportedFileTypes(),
    maxFileSize: '10MB',
    defaultOptions: ResumeParser.getDefaultParseOptions(),
    endpoints: {
      parse: '/api/documents/parse',
      batch: '/api/documents/parse/batch'
    }
  })
}