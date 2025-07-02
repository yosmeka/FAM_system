'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { exportToExcel, exportToCSV, ExcelExportData } from '@/lib/excelExport';
import { generatePdf } from '@/lib/generatePdf';

interface ExportButtonsProps {
  data: ExcelExportData;
  isLoading?: boolean;
  onEmailReport?: () => void;
}

export function ExportButtons({ data, isLoading = false, onEmailReport }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePdfExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      // Enhanced PDF export with charts and comprehensive data
      await generatePdf({
        title: 'Comprehensive Asset Report',
        data: data.byCategory,
        type: 'category'
      });
      toast.success('PDF report exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExcelExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // For now, export as CSV until xlsx dependency is properly configured
      await exportToCSV(data.byCategory, 'comprehensive-asset-report', ['Category', 'Status', 'Count', 'Total Value']);
      toast.success('CSV report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCsvExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      // Export multiple CSV files for different data sets
      const exports = [
        {
          data: data.byCategory,
          filename: 'assets-by-category',
          headers: ['Category', 'Status', 'Count', 'Total Value']
        },
        {
          data: data.byDepartment,
          filename: 'assets-by-department',
          headers: ['Department', 'Status', 'Count', 'Total Value']
        },
        {
          data: data.statusDistribution,
          filename: 'status-distribution',
          headers: ['Status', 'Count', 'Percentage']
        },
        {
          data: data.depreciation,
          filename: 'depreciation-trend',
          headers: ['Month', 'Book Value', 'Depreciation']
        }
      ];

      for (const exportItem of exports) {
        await exportToCSV(exportItem.data, exportItem.filename, exportItem.headers);
      }
      
      toast.success('CSV reports exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV reports');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailReport = () => {
    if (onEmailReport) {
      onEmailReport();
    } else {
      toast.success('Email functionality not implemented yet');
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* PDF Export */}
      <button
        onClick={handlePdfExport}
        disabled={isLoading || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FileText className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>

      {/* Excel Export */}
      <button
        onClick={handleExcelExport}
        disabled={isLoading || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export Excel'}
      </button>

      {/* CSV Export */}
      <button
        onClick={handleCsvExport}
        disabled={isLoading || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>

      {/* Email Report */}
      <button
        onClick={handleEmailReport}
        disabled={isLoading || isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Mail className="h-4 w-4" />
        Email Report
      </button>
    </div>
  );
}

// Enhanced PDF Export with Charts
export async function generateEnhancedPdf(data: ExcelExportData) {
  try {
    // Import jsPDF and plugins dynamically
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Title and Header
    doc.setFontSize(20);
    doc.text('Comprehensive Asset Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 14, yPosition);
    yPosition += 10;

    const summaryData = [
      ['Total Assets', data.stats.totalAssets.toString()],
      ['Active Assets', data.stats.activeAssets.toString()],
      ['Total Current Value', `$${data.stats.totalValue.toLocaleString()}`],
      ['Total Purchase Value', `$${data.stats.totalPurchaseValue.toLocaleString()}`],
      ['Total Depreciation', `$${data.stats.totalDepreciation.toLocaleString()}`],
      ['Utilization Rate', `${data.stats.utilizationRate}%`],
      ['Average Asset Age', `${data.stats.averageAssetAge.toFixed(1)} years`],
      ['Total ROI', `${data.stats.totalROI}%`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Assets by Category
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.text('Assets by Category', 14, yPosition);
    yPosition += 10;

    const categoryData = data.byCategory.map(item => [
      item.category,
      item.status,
      item.count.toString(),
      `$${item.value.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Status', 'Count', 'Total Value']],
      body: categoryData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Status Distribution
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.text('Status Distribution', 14, yPosition);
    yPosition += 10;

    const statusData = data.statusDistribution.map(item => [
      item.status,
      item.count.toString(),
      `${item.percentage}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Status', 'Count', 'Percentage']],
      body: statusData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    // Add new page for depreciation data
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.text('Depreciation Trend', 14, yPosition);
    yPosition += 10;

    const depreciationTableData = data.depreciation.map(item => [
      item.month,
      `$${item.value.toLocaleString()}`,
      `$${item.depreciation.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Month', 'Book Value', 'Depreciation']],
      body: depreciationTableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 }
    });

    // Footer on all pages
    const pageCount = (doc as any).internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount} - Asset Management System`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save(`comprehensive-asset-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating enhanced PDF:', error);
    throw error;
  }
}
