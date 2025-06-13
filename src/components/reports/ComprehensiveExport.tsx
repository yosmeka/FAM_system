'use client';

import React, { useState } from 'react';
import { ChevronDown, Download, FileText, FileSpreadsheet, FileImage, Printer } from 'lucide-react';
import { generatePdf } from '@/lib/generatePdf';
import { exportToExcel } from '@/lib/excelExport';
import { toast } from 'react-hot-toast';

interface ExportData {
  stats: any;
  byCategory: any[];
  byDepartment: any[];
  statusDistribution: any[];
  depreciation: any[];
  assets: any[];
  analytics: any;
}

interface ComprehensiveExportProps {
  data: ExportData;
  isLoading?: boolean;
  filterSummary?: string;
}

export function ComprehensiveExport({ data, isLoading = false, filterSummary = '' }: ComprehensiveExportProps) {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    {
      id: 'excel-summary',
      label: 'Excel - Summary Report',
      icon: FileSpreadsheet,
      description: 'Categories, status, depreciation data',
      action: () => handleExcelExport('summary')
    },
    {
      id: 'excel-detailed',
      label: 'Excel - Detailed Assets',
      icon: FileSpreadsheet,
      description: 'Individual asset list with all details',
      action: () => handleExcelExport('detailed')
    },
    {
      id: 'excel-complete',
      label: 'Excel - Complete Report',
      icon: FileSpreadsheet,
      description: 'All data in multiple sheets',
      action: () => handleExcelExport('complete')
    },
    {
      id: 'pdf-summary',
      label: 'PDF - Summary Report',
      icon: FileText,
      description: 'Charts and summary tables',
      action: () => handlePdfExport('summary')
    },
    {
      id: 'pdf-detailed',
      label: 'PDF - Detailed Assets',
      icon: FileText,
      description: 'Complete asset list',
      action: () => handlePdfExport('detailed')
    },
    {
      id: 'pdf-complete',
      label: 'PDF - Complete Report',
      icon: FileText,
      description: 'Full report with all sections',
      action: () => handlePdfExport('complete')
    }
  ];

  const handleExcelExport = async (type: 'summary' | 'detailed' | 'complete') => {
    try {
      setIsOpen(false);
      toast.loading('Generating Excel file...', { id: 'excel-export' });

      let exportData = { ...data };
      let filename = 'asset-report';

      switch (type) {
        case 'summary':
          // Remove detailed assets for summary export
          exportData = { ...data, assets: [] };
          filename = 'asset-summary-report';
          break;
        case 'detailed':
          // Only include assets and basic stats
          exportData = {
            stats: data.stats,
            byCategory: [],
            byDepartment: [],
            statusDistribution: [],
            depreciation: [],
            assets: data.assets,
            analytics: {}
          };
          filename = 'detailed-assets-report';
          break;
        case 'complete':
          filename = 'complete-asset-report';
          break;
      }

      await exportToExcel(exportData, filename);
      toast.success('Excel file downloaded successfully!', { id: 'excel-export' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file', { id: 'excel-export' });
    }
  };

  const handlePdfExport = async (type: 'summary' | 'detailed' | 'complete') => {
    try {
      setIsOpen(false);
      toast.loading('Generating PDF...', { id: 'pdf-export' });

      let title = 'Asset Report';
      let exportData = data.byCategory;
      let pdfType: 'category' | 'department' = 'category';

      switch (type) {
        case 'summary':
          title = 'Asset Summary Report';
          exportData = data.byCategory;
          break;
        case 'detailed':
          title = 'Detailed Assets Report';
          exportData = data.assets || [];
          break;
        case 'complete':
          title = 'Complete Asset Report';
          exportData = [...data.byCategory, ...data.assets];
          break;
      }

      await generatePdf({
        title: `${title}${filterSummary}`,
        data: exportData,
        type: pdfType
      });

      toast.success('PDF downloaded successfully!', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF', { id: 'pdf-export' });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="h-4 w-4" />
        Export Report
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Export Options
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose format and content type
              </p>
            </div>
            
            <div className="py-2 max-h-96 overflow-y-auto">
              {exportOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={option.action}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <FileSpreadsheet className="h-3 w-3" />
                <span>Excel files include multiple sheets</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FileText className="h-3 w-3" />
                <span>PDF files are formatted for printing</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
