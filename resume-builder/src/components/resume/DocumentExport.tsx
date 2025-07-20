'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDocumentExport } from '@/hooks/useDocumentExport'
import { Download, FileText, File, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface DocumentExportProps {
  resumeId: string
  resumeTitle?: string
  className?: string
}

export function DocumentExport({ resumeId, resumeTitle, className }: DocumentExportProps) {
  const {
    exportState,
    capabilities,
    fetchCapabilities,
    exportPDF,
    exportWord,
    exportBoth,
    resetExportState,
    isExporting,
    hasError,
    canExportPDF,
    canExportWord,
    supportsBatchExport
  } = useDocumentExport()

  const [selectedQuality, setSelectedQuality] = useState<'low' | 'medium' | 'high'>('medium')

  useEffect(() => {
    fetchCapabilities()
  }, [fetchCapabilities])

  const handleExportPDF = async () => {
    const filename = resumeTitle ? 
      `${resumeTitle.replace(/\s+/g, '_')}_Resume.pdf` : 
      undefined
    
    await exportPDF(resumeId, filename, selectedQuality)
  }

  const handleExportWord = async () => {
    const filename = resumeTitle ? 
      `${resumeTitle.replace(/\s+/g, '_')}_Resume.docx` : 
      undefined
    
    await exportWord(resumeId, filename)
  }

  const handleExportBoth = async () => {
    await exportBoth(resumeId, selectedQuality)
  }

  if (!capabilities) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading export options...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Export Resume</h3>
        </div>

        {/* Quality Selection for PDF */}
        {canExportPDF && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">PDF Quality</label>
            <div className="flex space-x-2">
              {(['low', 'medium', 'high'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => setSelectedQuality(quality)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedQuality === quality
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Export Status */}
        {isExporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">{exportState.stage}</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportState.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!isExporting && exportState.progress === 100 && !hasError && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">{exportState.stage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900">Export Failed</div>
                <div className="text-sm text-red-700">{exportState.error}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetExportState}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {canExportPDF && (
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <FileText className="h-4 w-4" />
              <span>Export PDF</span>
            </Button>
          )}

          {canExportWord && (
            <Button
              onClick={handleExportWord}
              disabled={isExporting}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <File className="h-4 w-4" />
              <span>Export Word</span>
            </Button>
          )}
        </div>

        {/* Batch Export */}
        {supportsBatchExport && canExportPDF && canExportWord && (
          <div className="pt-2 border-t">
            <Button
              onClick={handleExportBoth}
              disabled={isExporting}
              className="w-full flex items-center justify-center space-x-2"
              variant="default"
            >
              <Download className="h-4 w-4" />
              <span>Export Both Formats</span>
            </Button>
          </div>
        )}

        {/* Supported Formats Info */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <div>Supported formats: {capabilities.supportedFormats.join(', ').toUpperCase()}</div>
          {capabilities.features.highQualityPDF && (
            <div>• High-quality PDF generation available</div>
          )}
          {capabilities.features.batchExport && (
            <div>• Batch export supported</div>
          )}
        </div>
      </div>
    </Card>
  )
}