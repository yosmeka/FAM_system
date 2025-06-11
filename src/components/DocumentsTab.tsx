'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
// No Lucide icons
import { DocumentCard } from './DocumentCard';
import { DocumentUploadModal } from './DocumentUploadModal';
import { usePermissions } from '@/hooks/usePermissions';

interface Document {
  id: string;
  assetId: string;
  type: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsTabProps {
  assetId: string;
  assetName: string;
}

export function DocumentsTab({ assetId, assetName }: DocumentsTabProps) {
  const { checkPermission } = usePermissions();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const canUploadDocuments = checkPermission('Asset document upload/view');

  // Fetch documents
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/documents`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [assetId]);

  // Handle document deletion
  const handleDeleteDocument = (documentId: string) => {
    setDocuments(documents.filter(doc => doc.id !== documentId));
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = documents
    .filter(doc => {
      // Apply search filter
      if (searchTerm) {
        const filename = doc.url.split('/').pop() || '';
        return filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
               doc.type.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(doc => {
      // Apply type filter
      if (filterType) {
        return doc.type === filterType;
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
          <h2 className="text-xl font-semibold dark:text-gray-100">Documents</h2>
          <p className="text-sm text-gray-500">
            Manage documents for {assetName}
          </p>
        </div>
        {canUploadDocuments && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            + Upload Document
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value || null)}
            className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
          >
            <option value="">All Types</option>
            
            <option value="WARRANTY">Warranty</option>
            <option value="MANUAL">Manual</option>
            <option value="MAINTENANCE_RECORD">Maintenance Record</option>
            <option value="OTHER">Other</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border rounded-md px-3 py-2 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            title={sortOrder === 'asc' ? 'Sort Newest First' : 'Sort Oldest First'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          <button
            onClick={fetchDocuments}
            className="border rounded-md px-3 py-2 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Documents list */}
      {isLoading ? (
       
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        
      ) : filteredAndSortedDocuments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredAndSortedDocuments.map((document) => {
            try {
              return (
                <DocumentCard
                  key={document.id}
                  id={document.id}
                  assetId={assetId}
                  type={document.type}
                  url={document.url}
                  fileName={document.fileName}
                  fileSize={document.fileSize}
                  mimeType={document.mimeType}
                  createdAt={document.createdAt}
                  onDelete={handleDeleteDocument}
                />
              );
            } catch (error) {
              console.error('Error rendering document card:', error, document);
              return (
                <div key={document.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                  <p className="text-sm text-gray-500">Error displaying document: {document.url}</p>
                </div>
              );
            }
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg dark:bg-gray-800">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4 dark:bg-blue-900 dark:text-blue-300">
            📄
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Documents Found</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filterType
              ? 'No documents match your search criteria. Try adjusting your filters.'
              : 'Upload documents to keep track of important files for this asset.'}
          </p>
          {canUploadDocuments && !searchTerm && !filterType && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              + Upload First Document
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        assetId={assetId}
        onSuccess={fetchDocuments}
      />
    </div>
  );
}
