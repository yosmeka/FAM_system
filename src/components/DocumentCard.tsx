'use client';

import React from 'react';
// Use simple HTML/CSS instead of Lucide icons
import { formatDistanceToNow } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'react-hot-toast';

interface DocumentCardProps {
  id: string;
  assetId: string;
  type: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  onDelete: (id: string) => void;
}

export function DocumentCard({ id, assetId, type, url, fileName: propFileName, fileSize: propFileSize, mimeType: propMimeType, createdAt, onDelete }: DocumentCardProps) {
  const { checkPermission } = usePermissions();
  const canDeleteDocuments = checkPermission('Asset document delete');

  // Extract metadata from URL if available
  const [fileUrl, metadata] = React.useMemo(() => {
    try {
      // Check if URL contains metadata
      const [baseUrl, hashPart] = url.split('#');

      if (hashPart && hashPart.startsWith('metadata=')) {
        const metadataStr = decodeURIComponent(hashPart.replace('metadata=', ''));
        const metadata = JSON.parse(metadataStr);
        return [baseUrl, metadata];
      }
    } catch (error) {
      console.error('Error parsing metadata from URL:', error);
    }

    return [url, null];
  }, [url]);

  // Use metadata from props or extracted from URL
  const fileName = propFileName || metadata?.fileName;
  const fileSize = propFileSize || metadata?.fileSize;
  const mimeType = propMimeType || metadata?.mimeType;

  // Function to get the appropriate icon based on document type
  const getDocumentIcon = () => {
    try {
      let color;
      let letter;

      switch (type) {
        case 'INVOICE':
          color = 'bg-blue-500';
          letter = 'I';
          break;
        case 'WARRANTY':
          color = 'bg-green-500';
          letter = 'W';
          break;
        case 'MANUAL':
          color = 'bg-red-500';
          letter = 'M';
          break;
        case 'MAINTENANCE_RECORD':
          color = 'bg-yellow-500';
          letter = 'R';
          break;
        default:
          color = 'bg-gray-500';
          letter = 'D';
          break;
      }

      return (
        <div className={`h-8 w-8 ${color} rounded-md flex items-center justify-center text-white font-bold`}>
          {letter}
        </div>
      );
    } catch (error) {
      console.error('Error rendering document icon:', error);
      // Fallback to a simple div if there's an error
      return <div className="h-8 w-8 bg-gray-200 rounded"></div>;
    }
  };

  // Function to get a readable document type
  const getReadableType = () => {
    switch (type) {
      case 'INVOICE':
        return 'Invoice';
      case 'WARRANTY':
        return 'Warranty';
      case 'MANUAL':
        return 'Manual';
      case 'MAINTENANCE_RECORD':
        return 'Maintenance Record';
      case 'OTHER':
        return 'Other Document';
      default:
        return type;
    }
  };

  // Function to extract filename from URL or use provided fileName
  const getFilename = () => {
    if (fileName) {
      return fileName;
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'Document';
    } catch (error) {
      // If URL parsing fails, try to extract the filename from the string
      const parts = url.split('/');
      return parts[parts.length - 1] || 'Document';
    }
  };

  // Function to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Function to handle document deletion
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${assetId}/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success('Document deleted successfully');
      onDelete(id);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-start space-x-4">
      <div className="flex-shrink-0">
        {getDocumentIcon()}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {getFilename()}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getReadableType()} • Added {formatDistanceToNow(new Date(createdAt))} ago
              {fileSize && <span> • {formatFileSize(fileSize)}</span>}
              {mimeType && <span> • {mimeType.split('/')[1]?.toUpperCase()}</span>}
            </p>
          </div>
          <div className="flex space-x-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 transition-colors px-2 py-1 text-xs border border-blue-500 rounded"
              title="Open document"
            >
              Open
            </a>
            <a
              href={fileUrl}
              download={fileName || undefined}
              className="text-green-500 hover:text-green-700 transition-colors px-2 py-1 text-xs border border-green-500 rounded"
              title="Download document"
            >
              Download
            </a>
            {canDeleteDocuments && (
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 transition-colors px-2 py-1 text-xs border border-red-500 rounded"
                title="Delete document"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
