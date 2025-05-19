import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Define the type for jspdf-autotable
declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  function autoTable(doc: jsPDF, options: any): void;
  export default autoTable;
}

export interface TransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  avgProcessingDays: number;
  approvalRate: number;
  transferGrowth: number;
}

export interface DepartmentTransfer {
  department: string;
  outgoing: number;
  incoming: number;
  avgProcessingDays: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
  approved: number;
}

export interface DepartmentTransferMatrix {
  fromDepartment: string;
  toDepartment: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface TransferReportData {
  stats: TransferStats;
  departmentTransferMatrix: DepartmentTransferMatrix[];
  monthlyTrends: MonthlyTrend[];
  departmentTransfers: DepartmentTransfer[];
  statusDistribution?: StatusDistribution[];
}

export const generateTransferReportPDF = (data: TransferReportData): void => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = format(new Date(), 'MMMM d, yyyy');

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('Transfer Report', pageWidth / 2, 20, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, pageWidth / 2, 30, { align: 'center' });

    // Summary Statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, 40);

    doc.setFontSize(10);
    const stats = [
      ['Total Transfers', data.stats.totalTransfers.toString()],
      ['Pending Transfers', data.stats.pendingTransfers.toString()],
      ['Average Processing Time', `${data.stats.avgProcessingDays.toFixed(1)} days`],
      ['Approval Rate', `${data.stats.approvalRate}%`],
      ['Transfer Growth', `${data.stats.transferGrowth}%`],
    ];

    // Use autoTable directly
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: stats,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Get the final Y position
    const finalY1 = (doc as any).lastAutoTable.finalY;

    // Location Transfers
    doc.setFontSize(14);
    doc.text('Location Transfer Summary', 14, finalY1 + 15);

    const locationData = data.departmentTransfers.map(loc => [
      loc.department || 'Unknown',
      loc.outgoing.toString(),
      loc.incoming.toString(),
      (loc.incoming - loc.outgoing).toString(),
      `${Math.round(loc.avgProcessingDays)} days`,
    ]);

    // Use autoTable directly
    autoTable(doc, {
      startY: finalY1 + 20,
      head: [['Location', 'Outgoing', 'Incoming', 'Net Change', 'Avg. Processing Time']],
      body: locationData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Get the final Y position
    const finalY2 = (doc as any).lastAutoTable.finalY;

    // Monthly Trends
    doc.setFontSize(14);
    doc.text('Monthly Transfer Trends', 14, finalY2 + 15);

    const monthlyData = data.monthlyTrends.map(month => [
      month.month,
      month.count.toString(),
      month.approved.toString(),
      `${Math.round((month.approved / (month.count || 1)) * 100)}%`,
    ]);

    // Use autoTable directly
    autoTable(doc, {
      startY: finalY2 + 20,
      head: [['Month', 'Total Transfers', 'Approved', 'Approval Rate']],
      body: monthlyData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Department Transfer Matrix
    if (data.departmentTransferMatrix.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Location Transfer Matrix', 14, 20);

      const matrixData = data.departmentTransferMatrix.map(item => [
        item.fromDepartment || 'Unknown',
        item.toDepartment || 'Unknown',
        item.count.toString(),
      ]);

      // Use autoTable directly
      autoTable(doc, {
        startY: 25,
        head: [['From Location', 'To Location', 'Count']],
        body: matrixData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    // Status Distribution
    if (data.statusDistribution && data.statusDistribution.length > 0) {
      // Add a new page if we already have content
      if (doc.internal.getNumberOfPages() > 1) {
        doc.addPage();
      }

      doc.setFontSize(14);
      doc.text('Status Distribution', 14, 20);

      const statusData = data.statusDistribution.map(item => [
        item.status,
        item.count.toString(),
        `${item.percentage}%`,
      ]);

      // Use autoTable directly
      autoTable(doc, {
        startY: 25,
        head: [['Status', 'Count', 'Percentage']],
        body: statusData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
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
  }
};
