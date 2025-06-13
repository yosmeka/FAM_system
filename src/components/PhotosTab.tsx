'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PhotoCard } from './PhotoCard';
import { PhotoUploadModal } from './PhotoUploadModal';
import { usePermissions } from '@/hooks/usePermissions';

interface AssetPhoto {
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
  updatedAt: string;
}

interface PhotosTabProps {
  assetId: string;
  assetName: string;
  onPhotosChange?: () => void;
}

export function PhotosTab({ assetId, assetName, onPhotosChange }: PhotosTabProps) {
  const { checkPermission } = usePermissions();
  const [photos, setPhotos] = useState<AssetPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const canUploadPhotos = checkPermission('Asset document upload/view'); // Using same permission as documents

  // Fetch photos
  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/photos`);

      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const data = await response.json();
      setPhotos(data);
      // Notify parent component about photo changes
      if (onPhotosChange) {
        onPhotosChange();
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Failed to fetch photos');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPhotos();
  }, [assetId]);

  // Handle photo deletion
  const handleDeletePhoto = (photoId: string) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
    // Notify parent component about photo changes
    if (onPhotosChange) {
      onPhotosChange();
    }
  };

  // Filter and sort photos
  const filteredAndSortedPhotos = photos
    .filter(photo => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          (photo.originalName && photo.originalName.toLowerCase().includes(searchLower)) ||
          photo.fileName.toLowerCase().includes(searchLower) ||
          (photo.description && photo.description.toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="space-y-6 dark:space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#000000] dark:text-[#ffffff]">Photos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage photos for {assetName}
          </p>
        </div>
        {canUploadPhotos && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#FF0000] text-[#ffffff] rounded-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Upload Photo
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Search photos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#FF0000] focus:border-transparent bg-white dark:bg-gray-800 text-[#000000] dark:text-[#ffffff]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent text-[#000000] dark:text-[#ffffff] transition-colors"
            title={sortOrder === 'asc' ? 'Sort Newest First' : 'Sort Oldest First'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <button
            onClick={fetchPhotos}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent text-[#000000] dark:text-[#ffffff] transition-colors"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Photos grid */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF0000]"></div>
        </div>
      ) : filteredAndSortedPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              id={photo.id}
              assetId={assetId}
              fileName={photo.fileName}
              originalName={photo.originalName}
              filePath={photo.filePath}
              fileSize={photo.fileSize}
              mimeType={photo.mimeType}
              description={photo.description}
              uploadedBy={photo.uploadedBy}
              createdAt={photo.createdAt}
              onDelete={handleDeletePhoto}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 mb-4">
            📷
          </div>
          <h3 className="text-lg font-medium text-[#000000] dark:text-[#ffffff]">No Photos Found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'No photos match your search criteria. Try adjusting your search term.'
              : 'Upload photos to keep a visual record of this asset.'}
          </p>
          {canUploadPhotos && !searchTerm && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-[#FF0000] text-[#ffffff] rounded-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Upload First Photo
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <PhotoUploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        assetId={assetId}
        onSuccess={fetchPhotos}
      />
    </div>
  );
}
