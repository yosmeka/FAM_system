'use client';

import React, { useState } from 'react';
// No Lucide icons
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define the form schema
const documentUploadSchema = z.object({
  type: z.enum(['INVOICE', 'WARRANTY', 'MANUAL', 'MAINTENANCE_RECORD', 'OTHER'], {
    required_error: 'Document type is required',
  }),
  url: z.string().optional(),
  file: z.instanceof(File, { message: 'Please select a file' }).optional(),
});

// Ensure either URL or file is provided
const documentUploadFormSchema = documentUploadSchema.refine(
  (data) => data.url || data.file,
  {
    message: 'Either a URL or a file must be provided',
    path: ['file'],
  }
);

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  onSuccess: () => void;
}

export function DocumentUploadModal({ open, onClose, assetId, onSuccess }: DocumentUploadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema.refine(
      (data) => {
        if (uploadMethod === 'url') {
          return !!data.url;
        } else {
          return !!data.file;
        }
      },
      {
        message: uploadMethod === 'url'
          ? 'Please enter a valid URL'
          : 'Please select a file',
        path: [uploadMethod === 'url' ? 'url' : 'file'],
      }
    )),
    defaultValues: {
      type: 'OTHER',
      url: '',
    },
  });

  // Watch the file input
  const selectedFile = watch('file');

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('file', file);
    }
  };

  // Toggle between URL and file upload
  const toggleUploadMethod = () => {
    setUploadMethod(prev => prev === 'url' ? 'file' : 'url');
    // Reset the form values for the other method
    if (uploadMethod === 'url') {
      setValue('file', undefined);
    } else {
      setValue('url', '');
    }
  };

  // Handle form submission
  const onSubmit = async (data: DocumentUploadFormValues) => {
    setIsSubmitting(true);
    try {
      let documentData;

      if (uploadMethod === 'file' && data.file) {
        // Upload file first
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('assetId', assetId);
        formData.append('documentType', data.type);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }

        // Get the file URL and metadata
        const fileData = await uploadResponse.json();

        // Encode file metadata in the URL
        const metadataUrl = `${fileData.url}#metadata=${encodeURIComponent(
          JSON.stringify({
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            mimeType: fileData.mimeType
          })
        )}`;

        // Create document with file data
        documentData = {
          type: data.type,
          url: metadataUrl,
        };
      } else {
        // Use URL directly
        documentData = {
          type: data.type,
          url: data.url,
        };
      }

      // Create document record
      const response = await fetch(`/api/assets/${assetId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document record');
      }

      toast.success('Document uploaded successfully');
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          disabled={isSubmitting}
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Upload Document</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Document Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Type
            </label>
            <select
              id="type"
              {...register('type')}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INVOICE">Invoice</option>
              <option value="WARRANTY">Warranty</option>
              <option value="MANUAL">Manual</option>
              <option value="MAINTENANCE_RECORD">Maintenance Record</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                <span className="mr-1">⚠️</span>
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Upload Method Toggle */}
          <div className="flex border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setUploadMethod('file')}
              className={`flex-1 py-2 text-sm font-medium ${
                uploadMethod === 'file'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('url')}
              className={`flex-1 py-2 text-sm font-medium ${
                uploadMethod === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              Enter URL
            </button>
          </div>

          {/* File Upload */}
          {uploadMethod === 'file' && (
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Document
              </label>
              <input
                id="file"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setValue('file', file);
                  }
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              />
              {errors.file && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.file.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Accepted file types: PDF, Word, Excel, Images, Text (Max: 10MB)
              </p>
            </div>
          )}

          {/* Document URL */}
          {uploadMethod === 'url' && (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document URL
              </label>
              <input
                id="url"
                type="text"
                {...register('url')}
                placeholder="https://example.com/document.pdf"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {errors.url.message}
                </p>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
