'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useResumeParsing, useParseValidation } from '@/hooks/useResumeParsing'
import { ParseResponse, ParseOptions } from '@/types/parsing'
import { ResumeData } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Upload, FileText, AlertCircle, CheckCircle, X, Eye, Download } from 'lucide-react'

interface ResumeImporterProps {
  onImportSuccess?: (resumeData: ResumeData, parseResponse: ParseResponse) => void
  onImportError?: (error: string) => void
  className?: string
}

export function ResumeImporter({ onImportSuccess, onImportError, className }: ResumeImporterProps) {
  const { parseResume, parseBatch, isLoading, error, progress } = useResumeParsing()
  const { validateFile, validateBatch, getSupportedFileTypes, getFileTypeDescription } = useParseValidation()
  
  const [files, setFiles] = useState<File[]>([])
  const [parseResults, setParseResults] = useState<ParseResponse[]>([])
  const [parseOptions, setParseOptions] = useState<ParseOptions>({
    strictValidation: false,
    includeRawText: false,
    confidenceThreshold: 0.3,
    sectionMapping: {}
  })
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files
    const validation = validateBatch(acceptedFiles)
    if (!validation.isValid) {
      onImportError?.(validation.error!)
      return
    }

    setFiles(acceptedFiles)
    setParseResults([])
  }, [validateBatch, onImportError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const handleSingleParse = async (file: File) => {
    try {
      const result = await parseResume(file, parseOptions)
      setParseResults([result])
      
      if (result.success && result.data) {
        onImportSuccess?.(result.data, result)
      } else {
        onImportError?.(result.errors?.[0]?.message || 'Parsing failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      onImportError?.(errorMessage)
    }
  }

  const handleBatchParse = async () => {
    try {
      const results = await parseBatch(files, parseOptions)
      setParseResults(results)
      
      const successfulResults = results.filter(r => r.success && r.data)
      if (successfulResults.length > 0) {
        // For batch import, we'll use the first successful result
        const firstSuccess = successfulResults[0]
        onImportSuccess?.(firstSuccess.data!, firstSuccess)
      } else {
        onImportError?.('No resumes were successfully parsed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      onImportError?.(errorMessage)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
    setParseResults([])
  }

  const clearAll = () => {
    setFiles([])
    setParseResults([])
  }

  const renderFileList = () => (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {getFileTypeDescription(file.type)} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFile(index)}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )

  const renderParseResults = () => (
    <div className="space-y-4">
      {parseResults.map((result, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {files[index]?.name || `Result ${index + 1}`}
              </CardTitle>
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-3">
                {result.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Confidence</p>
                      <p>{(result.stats.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="font-medium">Sections</p>
                      <p>{result.stats.sectionsFound}</p>
                    </div>
                    <div>
                      <p className="font-medium">Errors</p>
                      <p>{result.stats.errorsCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Completeness</p>
                      <p>{(result.stats.completeness * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                )}
                
                {result.data && (
                  <div className="space-y-2">
                    <p className="font-medium">Extracted Information:</p>
                    <div className="text-sm space-y-1">
                      <p><strong>Name:</strong> {result.data.personalInfo.fullName}</p>
                      <p><strong>Email:</strong> {result.data.personalInfo.email}</p>
                      <p><strong>Sections:</strong> {result.data.sections.map(s => s.title).join(', ')}</p>
                    </div>
                  </div>
                )}
                
                {result.warnings && result.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Warnings:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {result.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {result.errors?.map((error, i) => (
                  <Alert key={i} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderAdvancedOptions = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="strictValidation"
          checked={parseOptions.strictValidation}
          onCheckedChange={(checked) =>
            setParseOptions(prev => ({ ...prev, strictValidation: checked as boolean }))
          }
        />
        <Label htmlFor="strictValidation">Strict validation</Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeRawText"
          checked={parseOptions.includeRawText}
          onCheckedChange={(checked) =>
            setParseOptions(prev => ({ ...prev, includeRawText: checked as boolean }))
          }
        />
        <Label htmlFor="includeRawText">Include raw text in results</Label>
      </div>
      
      <div className="space-y-2">
        <Label>Confidence Threshold: {parseOptions.confidenceThreshold}</Label>
        <Slider
          value={[parseOptions.confidenceThreshold || 0.3]}
          onValueChange={([value]) =>
            setParseOptions(prev => ({ ...prev, confidenceThreshold: value }))
          }
          max={1}
          min={0}
          step={0.1}
          className="w-full"
        />
      </div>
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Import Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-blue-600">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop resume files here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports PDF, DOC, DOCX • Max 5 files • 10MB each
                    </p>
                  </div>
                )}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-4">
                  {renderFileList()}
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={clearAll} disabled={isLoading}>
                      Clear All
                    </Button>
                    <div className="space-x-2">
                      {files.length === 1 ? (
                        <Button onClick={() => handleSingleParse(files[0])} disabled={isLoading}>
                          Parse Resume
                        </Button>
                      ) : (
                        <Button onClick={handleBatchParse} disabled={isLoading}>
                          Parse All ({files.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="options" className="space-y-4">
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                </Button>
                
                {showAdvancedOptions && renderAdvancedOptions()}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Parse Results */}
      {parseResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parse Results</CardTitle>
          </CardHeader>
          <CardContent>
            {renderParseResults()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}