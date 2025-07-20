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
    const files: File[] = []
    const optionsStr = formData.get('options') as string

    // Extract all files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Limit batch size
    const maxBatchSize = 5
    if (files.length > maxBatchSize) {
      return NextResponse.json(
        { error: `Batch size exceeds limit of ${maxBatchSize} files` },
        { status: 400 }
      )
    }

    // Validate all files
    const maxSize = 10 * 1024 * 1024 // 10MB per file
    for (const file of files) {
      if (!ResumeParser.isSupportedFileType(file.type)) {
        return NextResponse.json(
          { 
            error: `Unsupported file type: ${file.name} (${file.type})`,
            supportedTypes: ResumeParser.getSupportedFileTypes()
          },
          { status: 400 }
        )
      }

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        )
      }
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

    // Convert files to FileUpload objects
    const fileUploads: FileUpload[] = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        mimetype: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
        size: file.size
      }))
    )

    // Parse all resumes
    const parser = new ResumeParser()
    const results = await parser.parseMultipleResumes(fileUploads, options)

    // Calculate batch statistics
    const batchStats = {
      totalFiles: files.length,
      successfulParses: results.filter(r => r.success).length,
      failedParses: results.filter(r => !r.success).length,
      averageConfidence: results
        .filter(r => r.success && r.parsed)
        .reduce((sum, r) => sum + (r.parsed?.confidence || 0), 0) / 
        Math.max(1, results.filter(r => r.success && r.parsed).length),
      totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
      totalWarnings: results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0)
    }

    // Add individual stats to each result
    const resultsWithStats = results.map((result, index) => ({
      ...result,
      stats: parser.getParsingStats(result),
      metadata: {
        filename: files[index].name,
        fileSize: files[index].size,
        fileType: files[index].type,
        parsedAt: new Date().toISOString(),
        userId: session.user.id
      }
    }))

    return NextResponse.json({
      success: true,
      results: resultsWithStats,
      batchStats,
      metadata: {
        batchId: `batch_${Date.now()}`,
        processedAt: new Date().toISOString(),
        userId: session.user.id
      }
    })

  } catch (error) {
    console.error('Batch resume parsing error:', error)
    
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
    maxBatchSize: 5,
    maxFileSize: '10MB',
    supportedFileTypes: ResumeParser.getSupportedFileTypes(),
    defaultOptions: ResumeParser.getDefaultParseOptions(),
    endpoint: '/api/documents/parse/batch'
  })
}