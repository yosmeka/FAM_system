'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface ImportResult {
  row: number;
  success: boolean;
  assetId?: string;
  assetName?: string;
  serialNumber?: string;
  error?: string;
  note?: string;
}

interface ImportSummary {
  totalRows: number;
  successCount: number;
  errorCount: number;
  results: ImportResult[];
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { checkPermission } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<ImportSummary | null>(null);

  if (!checkPermission('Asset create')) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">You don&apos;t have permission to create assets.</p>
      </div>
    );
  }

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
    setResults(null); // Clear previous results
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/downloads/asset-import-template.xlsx';
    link.download = 'asset-import-template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded successfully');
  };

  const uploadFile = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      
      const response = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const summary: ImportSummary = await response.json();
      setResults(summary);

      if (summary.successCount > 0) {
        toast.success(`Successfully imported ${summary.successCount} assets!`);
      }
      
      if (summary.errorCount > 0) {
        toast.error(`${summary.errorCount} rows had errors. Check the results below.`);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => router.push('/assets')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Button>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Bulk Asset Import</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Import multiple assets at once using an Excel spreadsheet
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            How to Import Assets
          </CardTitle>
          <CardDescription>
            Follow these steps to successfully import your assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Download the Excel template using the button below</li>
            <li>Fill in your asset data following the template format</li>
            <li>Ensure required fields are completed (SIV Date, Unit Price)</li>
            <li>Asset Name and Serial Number are optional - they will be auto-generated if left empty</li>
            <li>Save your file and upload it using the upload area</li>
            <li>Review the import results and fix any errors if needed</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Important Notes:</h4>
                <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  <li><strong>Required fields:</strong> SIV Date and Unit Price only</li>
                  <li><strong>Optional fields:</strong> Asset Name and Serial Number (auto-generated if empty)</li>
                  <li>Serial Numbers must be unique across all assets</li>
                  <li>Dates should be in YYYY-MM-DD format (e.g., 2024-01-15)</li>
                  <li>The template includes a sample row for reference</li>
                  <li>Empty rows will be skipped during import</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Download */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Download Template</CardTitle>
          <CardDescription>
            Download the Excel template with the correct format and sample data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Excel Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Upload Your File</CardTitle>
          <CardDescription>
            Select or drag and drop your completed Excel file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            
            {file ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Selected: {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={uploadFile} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload & Import'}
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Choose Different File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop your Excel file here, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.errorCount === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              Import Results
            </CardTitle>
            <CardDescription>
              {results.successCount} successful, {results.errorCount} errors out of {results.totalRows} rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {results.successCount}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {results.errorCount}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">Errors</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {results.totalRows}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Total Rows</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Row {result.row}:</span>
                      {result.success ? (
                        <div className="text-green-700 dark:text-green-300">
                          <div>✓ Created asset "{result.assetName}" ({result.serialNumber})</div>
                          {result.note && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              ℹ️ {result.note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-red-700 dark:text-red-300">
                          ✗ {result.error}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <Button onClick={resetUpload} variant="outline">
                Import Another File
              </Button>
              <Button onClick={() => router.push('/assets')}>
                View All Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
