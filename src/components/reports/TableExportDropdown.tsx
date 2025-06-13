'use client';

import React, { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { generatePdf } from '@/lib/generatePdf';
import { exportToExcel } from '@/lib/excelExport';
import { toast } from 'react-hot-toast';

interface TableColumn {
  header: string;
  key: string;
  render?: (value: any, item: any) => any;
}

interface TableExportDropdownProps {
  data: any[];
  columns: TableColumn[];
  title: string;
  type: 'summary' | 'detailed';
  filterSummary?: string;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
}

export function TableExportDropdown({ 
  data, 
  columns, 
  title, 
  type, 
  filterSummary = '',
  onExportPDF,
  onExportExcel,
  onExportCSV 
}: TableExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExcelExport = async () => {
    try {
      setIsOpen(false);
      toast.loading('Generating Excel file...', { id: 'excel-export' });

      const XLSX = await import('xlsx');
      
      // Prepare headers
      const headers = columns.map(col => col.header);

      // Prepare data rows
      const rows = data.map(item => {
        return columns.map(col => {
          if (col.key === 'averageValue') {
            return `$${(Number(item.value) / Number(item.count)).toFixed(2)}`;
          }
          if (col.render) {
            const rendered = col.render(item[col.key], item);
            if (typeof rendered === 'string') return rendered;
            if (typeof rendered === 'number') return rendered;
            return item[col.key] || '';
          }
          return item[col.key] || '';
        });
      });

      // Create worksheet data
      const worksheetData = [headers, ...rows];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      const columnWidths = columns.map(col => ({ width: 20 }));
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, title);

      // Generate filename
      const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast.success('Excel file exported successfully!', { id: 'excel-export' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file', { id: 'excel-export' });
    }
  };

  const handlePdfExport = async () => {
    try {
      setIsOpen(false);
      toast.loading('Generating PDF...', { id: 'pdf-export' });

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF(type === 'detailed' ? 'l' : 'p', 'mm', 'a4');

      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      // Prepare table data
      const tableData = data.map(item => {
        return columns.map(col => {
          if (col.key === 'averageValue') {
            return `$${(Number(item.value) / Number(item.count)).toFixed(2)}`;
          }
          if (col.render) {
            const rendered = col.render(item[col.key], item);
            if (typeof rendered === 'string') return rendered;
            if (typeof rendered === 'number') return rendered.toString();
            return item[col.key]?.toString() || '';
          }
          return item[col.key]?.toString() || '';
        });
      });

      // Add table
      autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: tableData,
        startY: 30,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });

      doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF', { id: 'pdf-export' });
    }
  };

  const handleCsvExport = () => {
    try {
      setIsOpen(false);
      
      // Prepare headers
      const headers = columns.map(col => col.header);

      // Prepare data rows
      const rows = data.map(item => {
        return columns.map(col => {
          if (col.key === 'averageValue') {
            return `$${(Number(item.value) / Number(item.count)).toFixed(2)}`;
          }
          if (col.render) {
            const rendered = col.render(item[col.key], item);
            if (typeof rendered === 'string') return rendered;
            if (typeof rendered === 'number') return rendered.toString();
            return item[col.key]?.toString() || '';
          }
          return item[col.key]?.toString() || '';
        }).join(',');
      });

      // Create CSV content
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const exportOptions = [
    {
      id: 'excel',
      label: 'Export to Excel',
      icon: Download,
      action: () => {
        setIsOpen(false);
        if (onExportExcel) {
          onExportExcel();
        } else {
          handleExcelExport();
        }
      }
    },
    {
      id: 'pdf',
      label: 'Export to PDF',
      icon: Download,
      action: () => {
        setIsOpen(false);
        if (onExportPDF) {
          onExportPDF();
        } else {
          handlePdfExport();
        }
      }
    },
    {
      id: 'csv',
      label: 'Export to CSV',
      icon: Download,
      action: () => {
        setIsOpen(false);
        if (onExportCSV) {
          onExportCSV();
        } else {
          handleCsvExport();
        }
      }
    }
  ];

  if (!data || data.length === 0) {
    return null; // Don't show export button if no data
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors border border-red-600"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-black rounded-md shadow-lg border border-red-600 dark:border-red-600 z-20">
            <div className="py-1">
              {exportOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={option.action}
                    className="w-full px-4 py-2 text-left text-sm text-black dark:text-white hover:bg-red-100 dark:hover:bg-red-900 transition-colors flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <IconComponent className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
