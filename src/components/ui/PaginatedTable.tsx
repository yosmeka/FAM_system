'use client';

import { useState, useMemo, useEffect } from 'react';
import { RoleBasedTable } from './RoleBasedTable';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginatedTableProps {
  data: any[];
  columns: Array<{
    header: string;
    key: string;
    render?: (value: any, item: any) => React.ReactNode;
  }>;
  className?: string;
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  // Server-side pagination props
  serverSide?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  loading?: boolean;
}

export function PaginatedTable({
  data,
  columns,
  className,
  itemsPerPageOptions = [10, 25, 50, 100],
  defaultItemsPerPage = 25,
  searchable = true,
  searchPlaceholder = "Search assets...",
  serverSide = false,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  loading = false
}: PaginatedTableProps) {
  const [currentPage, setCurrentPage] = useState(serverSide && pagination ? pagination.page : 1);
  const [itemsPerPage, setItemsPerPage] = useState(serverSide && pagination ? pagination.limit : defaultItemsPerPage);
  const [searchTerm, setSearchTerm] = useState('');

  // Update local state when server-side pagination props change
  useEffect(() => {
    if (serverSide && pagination) {
      setCurrentPage(pagination.page);
      setItemsPerPage(pagination.limit);
    }
  }, [serverSide, pagination]);

  // Error handling for invalid pagination values
  useEffect(() => {
    if (serverSide && pagination) {
      if (pagination.page < 1 || pagination.limit < 1 || pagination.total < 0) {
        console.error('Invalid pagination values:', pagination);
      }
    }
  }, [serverSide, pagination]);

  // Filter data based on search term (client-side only)
  const filteredData = useMemo(() => {
    if (serverSide) return data; // No client-side filtering for server-side pagination
    if (!searchTerm.trim()) return data;

    return data.filter(item => {
      return columns.some(column => {
        const value = item[column.key];
        if (value == null) return false;
        return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns, serverSide]);

  // Calculate pagination values
  const totalItems = serverSide && pagination ? pagination.total : filteredData.length;
  const totalPages = serverSide && pagination ? pagination.totalPages : Math.ceil(totalItems / itemsPerPage);

  // For client-side pagination
  const startIndex = serverSide ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = serverSide ? data.length : startIndex + itemsPerPage;
  const currentData = serverSide ? data : filteredData.slice(startIndex, endIndex);

  // Reset to first page when search term changes (client-side only)
  useEffect(() => {
    if (!serverSide) {
      setCurrentPage(1);
    }
  }, [searchTerm, itemsPerPage, serverSide]);

  const handlePageChange = (page: number) => {
    if (totalPages === 0) return; // No pages to navigate to

    const validPage = Math.max(1, Math.min(page, totalPages));

    if (serverSide && onPageChange) {
      onPageChange(validPage);
    } else {
      setCurrentPage(validPage);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    const newItemsPerPage = Number(value);

    if (serverSide && onItemsPerPageChange) {
      onItemsPerPageChange(newItemsPerPage);
    } else {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1); // Reset to first page when changing items per page
    }
  };

  const goToPage = (page: number) => handlePageChange(page);
  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Search and Items Per Page Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {searchable && (
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Show:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => handleItemsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
        <div>
          {serverSide ? (
            <>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
              {loading && <span className="ml-2 text-blue-600 dark:text-blue-400">(Loading...)</span>}
            </>
          ) : (
            <>
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
              {searchTerm && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (filtered from {data.length} total)
                </span>
              )}
            </>
          )}
        </div>
        {!serverSide && searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 dark:border-red-400"></div>
        </div>
      ) : (
        <RoleBasedTable
          data={currentData}
          columns={columns}
          className={className}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center gap-1">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="p-2"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page Numbers */}
            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(pageNum)}
                className={`min-w-[2.5rem] ${
                  currentPage === pageNum 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : ''
                }`}
              >
                {pageNum}
              </Button>
            ))}
            
            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="p-2"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            {searchTerm ? (
              <>
                No results found for "{searchTerm}"
                <br />
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mt-2 text-sm"
                >
                  Clear search to see all results
                </button>
              </>
            ) : (
              'No data available'
            )}
          </div>
        </div>
      )}
    </div>
  );
}
