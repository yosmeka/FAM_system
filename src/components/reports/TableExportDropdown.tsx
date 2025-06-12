'use client';

import React, { useState } from 'react';
import { ChevronDown, Download, FileText, FileSpreadsheet } from 'lucide-react';
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
}

export function TableExportDropdown({ data, columns, title, type, filterSummary = '' }: TableExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    {
      id: 'excel',
      label: 'Export to Excel',
      icon: FileSpreadsheet,
      action: () => handleExcelExport()
    },
    {
      id: 'pdf',
      label: 'Export to PDF',
      icon: FileText,
      action: () => handlePdfExport()
    }
  ];

  const handleExcelExport = async () => {
    try {
      setIsOpen(false);
      toast.loading('Generating Excel file...', { id: 'excel-export' });

      // Create Excel workbook with table data
      const XLSX = await import('xlsx');

      // Prepare headers
      const headers = columns.map(col => col.header);

      // Prepare data rows
      const rows = data.map(item => {
        return columns.map(col => {
          if (col.render) {
            // If there's a render function, use it but extract text content
            const rendered = col.render(item[col.key], item);
            if (typeof rendered === 'string') return rendered;
            if (typeof rendered === 'number') return rendered;
            // For complex renders, try to extract meaningful text
            return item[col.key] || '';
          }

          // Handle special cases for calculated fields
          if (col.key === 'averageValue' && item.value && item.count) {
            return (Number(item.value) / Number(item.count)).toFixed(2);
          }

          // Handle date formatting
          if (col.key === 'purchaseDate' || col.key === 'warrantyExpiry') {
            return item[col.key] ? new Date(item[col.key]).toLocaleDateString() : '';
          }

          // Handle currency formatting
          if (col.key === 'purchasePrice' || col.key === 'currentValue') {
            return item[col.key] ? `$${Number(item[col.key]).toLocaleString()}` : '';
          }

          // Handle percentage formatting
          if (col.key === 'depreciationRate') {
            return item[col.key] ? `${item[col.key]}%` : '';
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

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success('Excel file downloaded successfully!', { id: 'excel-export' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file', { id: 'excel-export' });
    }
  };

  const handlePdfExport = async () => {
    try {
      setIsOpen(false);
      toast.loading('Generating PDF...', { id: 'pdf-export' });

      // Create a hidden iframe for PDF generation and local download
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      document.body.appendChild(iframe);

      // Prepare table data
      const tableData = data.map(item => {
        return columns.map(col => {
          if (col.render) {
            const rendered = col.render(item[col.key], item);
            if (typeof rendered === 'string') return rendered;
            if (typeof rendered === 'number') return rendered.toString();
            return item[col.key]?.toString() || '';
          }

          // Handle special cases for calculated fields
          if (col.key === 'averageValue' && item.value && item.count) {
            return `$${(Number(item.value) / Number(item.count)).toFixed(2)}`;
          }

          // Handle date formatting
          if (col.key === 'purchaseDate' || col.key === 'warrantyExpiry') {
            return item[col.key] ? new Date(item[col.key]).toLocaleDateString() : '';
          }

          // Handle currency formatting
          if (col.key === 'purchasePrice' || col.key === 'currentValue') {
            return item[col.key] ? `$${Number(item[col.key]).toLocaleString()}` : '';
          }

          // Handle percentage formatting
          if (col.key === 'depreciationRate') {
            return item[col.key] ? `${item[col.key]}%` : '';
          }

          // Handle age formatting
          if (col.key === 'age') {
            return item[col.key] ? `${item[col.key]} years` : '';
          }

          return item[col.key]?.toString() || '';
        });
      });

      // Create HTML content with RED theme
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}${filterSummary}</title>
          <style>
            @page {
              size: ${type === 'detailed' ? 'A4 landscape' : 'A4 portrait'};
              margin: 15mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              background: white;
            }
            .header {
              background: #dc2626;
              color: white;
              padding: 20px;
              margin: -20px -20px 30px -20px;
              text-align: center;
              border-radius: 0;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 8px 0;
            }
            .subtitle {
              font-size: 12px;
              margin: 0;
              opacity: 0.9;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: ${type === 'detailed' ? '8px' : '10px'};
            }
            th {
              background-color: #dc2626;
              color: white;
              padding: 12px 8px;
              text-align: left;
              border: 1px solid #b91c1c;
              font-weight: bold;
              font-size: ${type === 'detailed' ? '9px' : '11px'};
            }
            td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              text-align: left;
              vertical-align: top;
            }
            tr:nth-child(even) {
              background-color: #fef2f2;
            }
            tr:hover {
              background-color: #fee2e2;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #6b7280;
              border-top: 2px solid #dc2626;
              padding-top: 15px;
            }
            @media print {
              body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .header {
                background: #dc2626 !important;
                color: white !important;
              }
              th {
                background-color: #dc2626 !important;
                color: white !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${title}${filterSummary}</div>
            <div class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Total Records: ${data.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableData.map(row =>
                `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Asset Management System</strong> | Zemen Bank | Report Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
        </html>
      `;

      // Write HTML to iframe and trigger download
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Wait for content to load, then trigger print/save
        setTimeout(() => {
          try {
            // Focus the iframe and trigger print dialog
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();

            // Clean up after a delay
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 2000);

            toast.success('PDF save dialog opened! Choose "Save as PDF" in the print dialog.', {
              id: 'pdf-export',
              duration: 5000
            });
          } catch (error) {
            console.error('Print error:', error);
            // Fallback: open in new window
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(htmlContent);
              newWindow.document.close();
              newWindow.print();
            }
            document.body.removeChild(iframe);
            toast.success('PDF opened in new window. Use Ctrl+P to save as PDF.', {
              id: 'pdf-export',
              duration: 5000
            });
          }
        }, 1000);
      } else {
        // Fallback: open in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          setTimeout(() => {
            newWindow.print();
          }, 500);
        }
        document.body.removeChild(iframe);
        toast.success('PDF opened in new window. Use Ctrl+P to save as PDF.', {
          id: 'pdf-export',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.', { id: 'pdf-export' });
    }
  };

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
