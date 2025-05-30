'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TransferReportData } from '@/utils/pdfUtils';

// Define the type for jspdf-autotable
declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  function autoTable(doc: jsPDF, options: any): void;
  export default autoTable;
}

interface PdfExportButtonProps {
  reportData: TransferReportData | null;
}

export function PdfExportButton({ reportData }: PdfExportButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExportPDF = async () => {
    if (!reportData || isGenerating) return;

    setIsGenerating(true);

    try {
      // Import jsPDF and jspdf-autotable
      const { default: jsPDF } = await import('jspdf');

      // Import the autotable plugin
      const { default: autoTable } = await import('jspdf-autotable');

      // Create a new document
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(20);
      doc.text('Transfer Report', pageWidth / 2, 20, { align: 'center' });

      // Date
      const currentDate = new Date().toLocaleDateString();
      doc.setFontSize(10);
      doc.text(`Generated on: ${currentDate}`, pageWidth / 2, 30, { align: 'center' });

      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Summary Statistics', 14, 40);

      doc.setFontSize(10);
      const stats = [
        ['Total Transfers', reportData.stats.totalTransfers.toString()],
        ['Completed Transfers', (reportData.stats.completedTransfers || 0).toString()],
        ['Pending Transfers', reportData.stats.pendingTransfers.toString()],
        ['Rejected Transfers', (reportData.stats.rejectedTransfers || 0).toString()],
        ['Average Processing Time', `${reportData.stats.avgProcessingDays.toFixed(1)} days`],
        ['Approval Rate', `${reportData.stats.approvalRate}%`],
        ['Rejection Rate', `${reportData.stats.rejectionRate || 0}%`],
        ['Transfer Efficiency', `${reportData.stats.transferEfficiency || 0}%`],
        ['Transfer Velocity', `${reportData.stats.transferVelocity || 0}/day`],
        ['Transfer Growth', `${reportData.stats.transferGrowth}%`],
      ];

      // Use the autoTable function directly
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: stats,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });

      // Get the final Y position after the first table
      const finalY = (doc as any).lastAutoTable.finalY;

      // Department Transfers
      doc.setFontSize(14);
      doc.text('Department Transfer Summary', 14, finalY + 15);

      const departmentData = reportData.departmentTransfers.map(dept => [
        dept.department || 'Unknown',
        dept.outgoing.toString(),
        dept.incoming.toString(),
        (dept.incoming - dept.outgoing).toString(),
        `${Math.round(dept.avgProcessingDays)} days`,
      ]);

      // Use the autoTable function directly again
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Department', 'Outgoing', 'Incoming', 'Net Change', 'Avg. Processing Time']],
        body: departmentData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });

      // Get the final Y position after the second table
      const finalY2 = (doc as any).lastAutoTable.finalY;

      // Monthly Trends
      doc.setFontSize(14);
      doc.text('Monthly Transfer Trends', 14, finalY2 + 15);

      const monthlyData = reportData.monthlyTrends.map(month => [
        month.month,
        month.count.toString(),
        month.approved.toString(),
        (month.rejected || 0).toString(),
        `${month.approvalRate || 0}%`,
      ]);

      // Add monthly trends table
      autoTable(doc, {
        startY: finalY2 + 20,
        head: [['Month', 'Total Transfers', 'Approved', 'Rejected', 'Approval Rate']],
        body: monthlyData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });

      // Add a new page for status distribution
      doc.addPage();

      // Status Distribution
      doc.setFontSize(14);
      doc.text('Transfer Status Distribution', 14, 20);

      const statusData = reportData.statusDistribution?.map(status => [
        status.status,
        status.count.toString(),
        `${status.percentage || 0}%`,
      ]) || [];

      // Add status distribution table
      autoTable(doc, {
        startY: 25,
        head: [['Status', 'Count', 'Percentage']],
        body: statusData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount} - Generated on ${currentDate}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      doc.save('transfer-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <Button
      onClick={handleExportPDF}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all duration-300 transform
        ${isGenerating
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md hover:scale-105 active:scale-95'
        }
      `}
      disabled={!reportData || isGenerating}
    >
      {isGenerating ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-white font-medium">Generating PDF...</span>
        </>
      ) : (
        <>
          <FileDown size={18} className="text-white" />
          <span className="text-white font-medium">Export PDF Report</span>
        </>
      )}
    </Button>
  );
}
