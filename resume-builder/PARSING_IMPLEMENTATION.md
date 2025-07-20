# Resume Parsing and Import Implementation

## Overview

This implementation adds comprehensive resume parsing and import capabilities to the resume builder application, fulfilling requirement 1.5 from the specifications. The system can parse PDF and Word documents, extract structured content, and intelligently map it to the application's resume data structure.

## Features Implemented

### 1. PDF and Word Document Parsing
- **PDF Parser**: Uses `pdf-parse` library to extract text from PDF files
- **Word Parser**: Uses `mammoth` library to extract text and HTML from DOCX/DOC files
- **Content Extraction**: Intelligent text processing and cleaning
- **Metadata Extraction**: File information and parsing statistics

### 2. Content Extraction and Restructuring Logic
- **Personal Information Extraction**: 
  - Name, email, phone number
  - LinkedIn, GitHub, and website URLs
  - Location information
- **Section Detection**: Automatic identification of resume sections
  - Experience/Work History
  - Education
  - Skills
  - Projects
  - Certifications
  - Custom sections
- **Content Parsing**: Section-specific parsing logic
  - Job titles, companies, dates, descriptions
  - Degrees, schools, graduation dates
  - Skill categories and lists
  - Project names, descriptions, technologies

### 3. Intelligent Content Mapping
- **Data Structure Mapping**: Converts parsed content to application's resume schema
- **Validation and Normalization**: Cleans and validates extracted data
- **Confidence Scoring**: Assigns confidence scores to parsed content
- **Error Handling**: Comprehensive error detection and reporting

### 4. Import Validation and Error Handling
- **File Validation**: Size limits (10MB), supported formats
- **Content Validation**: Required fields, data format validation
- **Error Classification**: Parsing, validation, and content errors
- **Warning System**: Non-critical issues and recommendations

### 5. Comprehensive Testing
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **React Hook Tests**: Frontend integration testing
- **Error Scenario Testing**: Edge cases and failure modes

## Architecture

### Core Components

```
src/lib/parsing/
├── index.ts                 # Main exports
├── resume-parser.ts         # Main parsing orchestrator
├── pdf-parser.ts           # PDF-specific parsing logic
├── word-parser.ts          # Word document parsing logic
├── content-extractor.ts    # File processing coordinator
├── content-mapper.ts       # Data structure mapping
├── validation.ts           # Content validation
└── demo.ts                 # Demonstration script
```

### API Endpoints

```
src/app/api/documents/parse/
├── route.ts                # Single file parsing endpoint
└── batch/
    └── route.ts           # Batch file parsing endpoint
```

### React Integration

```
src/hooks/useResumeParsing.ts      # React hook for parsing
src/components/resume/ResumeImporter.tsx  # UI component
```

### Type Definitions

```
src/types/parsing.ts        # Parsing-specific types
```

## Usage Examples

### API Usage

```typescript
// Single file parsing
const formData = new FormData()
formData.append('file', resumeFile)
formData.append('options', JSON.stringify({
  strictValidation: false,
  includeRawText: true,
  confidenceThreshold: 0.3
}))

const response = await fetch('/api/documents/parse', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

### React Hook Usage

```typescript
const { parseResume, isLoading, error } = useResumeParsing()

const handleFileUpload = async (file: File) => {
  try {
    const result = await parseResume(file, {
      strictValidation: false,
      confidenceThreshold: 0.5
    })
    
    if (result.success) {
      // Use parsed resume data
      console.log(result.data)
    }
  } catch (error) {
    console.error('Parsing failed:', error)
  }
}
```

### Component Usage

```tsx
<ResumeImporter
  onImportSuccess={(resumeData, parseResponse) => {
    // Handle successful import
    setResumeData(resumeData)
  }}
  onImportError={(error) => {
    // Handle import error
    setError(error)
  }}
/>
```

## Supported File Formats

- **PDF**: `.pdf` files up to 10MB
- **Word Document**: `.docx` files up to 10MB  
- **Word Document Legacy**: `.doc` files up to 10MB

## Parsing Capabilities

### Personal Information
- Full name extraction from document header
- Email address detection with validation
- Phone number parsing with normalization
- Social media profile URLs (LinkedIn, GitHub)
- Website URLs
- Location/address information

### Experience Section
- Job titles and company names
- Employment dates (start/end, current positions)
- Job descriptions and bullet points
- Location information

### Education Section
- Degree types and names
- School/university names
- Graduation dates
- GPA information
- Honors and achievements

### Skills Section
- Skill categorization
- Technical skills lists
- Programming languages
- Tools and technologies

### Projects Section
- Project names and descriptions
- Technologies used
- Project URLs and repositories
- Project dates

## Configuration Options

```typescript
interface ParseOptions {
  strictValidation?: boolean      // Enforce strict validation
  includeRawText?: boolean       // Include original text in response
  confidenceThreshold?: number   // Minimum confidence score (0-1)
  sectionMapping?: Record<string, string>  // Custom section mapping
}
```

## Error Handling

### Error Types
- **Validation Errors**: Invalid file format, size limits
- **Parsing Errors**: Content extraction failures
- **Format Errors**: Unsupported file types
- **Content Errors**: Missing required information

### Error Severity Levels
- **High**: Critical errors that prevent parsing
- **Medium**: Important issues that affect quality
- **Low**: Minor issues with minimal impact

## Performance Considerations

- **File Size Limits**: 10MB per file to prevent memory issues
- **Batch Processing**: Maximum 5 files per batch request
- **Streaming**: Progress tracking for large file processing
- **Caching**: Parsed results can be cached for performance

## Security Features

- **File Type Validation**: Only allowed MIME types accepted
- **Size Limits**: Prevents DoS attacks via large files
- **Content Sanitization**: Cleans extracted text content
- **Authentication**: Requires user authentication for API access

## Testing Coverage

- **Unit Tests**: 16 tests covering core parsing logic
- **Integration Tests**: API endpoint testing
- **React Tests**: Hook and component testing
- **Error Scenarios**: Edge cases and failure modes

## Future Enhancements

1. **OCR Support**: Parse scanned PDF documents
2. **Additional Formats**: Support for RTF, TXT files
3. **AI Enhancement**: Use LLM for better content extraction
4. **Template Recognition**: Detect and handle specific resume templates
5. **Multi-language Support**: Parse resumes in different languages
6. **Real-time Processing**: WebSocket-based progress updates

## Dependencies Added

```json
{
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0",
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.11",
  "react-dropzone": "^14.2.3"
}
```

## API Documentation

### POST /api/documents/parse
Parse a single resume file.

**Request:**
- `file`: Resume file (PDF, DOCX, DOC)
- `options`: JSON string with parsing options

**Response:**
```json
{
  "success": true,
  "data": { /* ResumeData */ },
  "stats": { /* ParsingStats */ },
  "errors": [],
  "warnings": [],
  "metadata": { /* FileMetadata */ }
}
```

### POST /api/documents/parse/batch
Parse multiple resume files.

**Request:**
- `file0`, `file1`, etc.: Resume files
- `options`: JSON string with parsing options

**Response:**
```json
{
  "success": true,
  "results": [ /* Array of ParseResponse */ ],
  "batchStats": { /* BatchStatistics */ },
  "metadata": { /* BatchMetadata */ }
}
```

This implementation provides a robust, scalable solution for resume parsing and import that integrates seamlessly with the existing resume builder application.