'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';

interface PhotoCardProps {
  id: string;
  assetId: string;
  fileName: string;
  originalName?: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  uploadedBy?: string;
  createdAt: string;
  onDelete: (photoId: string) => void;
}

export function PhotoCard({
  id,
  assetId,
  fileName,
  originalName,
  filePath,
  fileSize,
  mimeType,
  description,
  uploadedBy,
  createdAt,
  onDelete,
}: PhotoCardProps) {
  const { checkPermission } = usePermissions();
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canDeletePhotos = checkPermission('Asset document upload/view'); // Using same permission as documents

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    if (!canDeletePhotos) {
      toast.error('You do not have permission to delete photos');
      return;
    }

    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/photos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete photo');
      }

      toast.success('Photo deleted successfully');
      onDelete(id);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          {!imageError ? (
            <img
              src={filePath}
              alt={description || originalName || fileName}
              className="w-full h-48 object-cover rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity"
              onError={handleImageError}
              onClick={openModal}
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-t-lg flex items-center justify-center cursor-pointer" onClick={openModal}>
              <div className="text-center">
                <div className="text-4xl text-gray-400 dark:text-gray-500 mb-2">📷</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Image not available</p>
              </div>
            </div>
          )}
          
          {canDeletePhotos && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete photo"
            >
              {isDeleting ? (
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="p-4">
          <div className="mb-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {originalName || fileName}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{formatFileSize(fileSize)}</span>
            <span>{formatDate(createdAt)}</span>
          </div>

          {uploadedBy && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Uploaded by: {uploadedBy}
            </div>
          )}
        </div>
      </div>

      {/* Modal for full-size image */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {!imageError ? (
              <img
                src={filePath}
                alt={description || originalName || fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="text-6xl text-gray-400 mb-4">📷</div>
                <p className="text-white">Image not available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
