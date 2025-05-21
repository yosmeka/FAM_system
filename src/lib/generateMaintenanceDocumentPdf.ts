import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface MaintenanceDocumentOptions {
  maintenanceId: string;
  assetName: string;
  assetSerialNumber: string;
  description: string;
  priority: string;
  requesterName: string;
  requesterEmail: string;
  managerName: string;
  managerEmail: string;
  requestReason: string;
  managerNotes?: string;
  status: 'APPROVED' | 'REJECTED';
  requestDate: Date | string;
  responseDate: Date | string;
  scheduledDate?: Date | string;
}

/**
 * Generates a PDF document for maintenance request approval or rejection
 * @param options Maintenance document options
 * @returns The PDF document as a Blob
 */
export async function generateMaintenanceDocumentPdf(options: MaintenanceDocumentOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add header with logo placeholder
  doc.setFillColor(220, 53, 69); // Red color
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(18);
  doc.text('Maintenance Request ' + (options.status === 'APPROVED' ? 'Approval' : 'Rejection'), pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Document ID: ' + options.maintenanceId, pageWidth / 2, 25, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Add document information
  doc.setFontSize(14);
  doc.text('Maintenance Request Details', 14, 40);

  // Add asset information
  const assetInfo = [
    ['Asset Name', options.assetName],
    ['Serial Number', options.assetSerialNumber],
    ['Description', options.description],
    ['Priority', options.priority],
    ['Status', options.status],
    ['Request Date', format(new Date(options.requestDate), 'PPP')],
    ['Response Date', format(new Date(options.responseDate), 'PPP')],
  ];

  // Add scheduled date if available and approved
  if (options.scheduledDate && options.status === 'APPROVED') {
    assetInfo.push(['Scheduled Date', format(new Date(options.scheduledDate), 'PPP')]);
  }

  autoTable(doc, {
    startY: 45,
    head: [['Field', 'Value']],
    body: assetInfo,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
  });

  // Add requester information
  const requesterY = doc.lastAutoTable?.finalY || 120;
  doc.setFontSize(14);
  doc.text('Requester Information', 14, requesterY + 10);

  autoTable(doc, {
    startY: requesterY + 15,
    body: [
      ['Name', options.requesterName],
      ['Email', options.requesterEmail],
      ['Request Reason', options.requestReason],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
  });

  // Add manager information
  const managerY = doc.lastAutoTable?.finalY || 160;
  doc.setFontSize(14);
  doc.text('Manager Information', 14, managerY + 10);

  autoTable(doc, {
    startY: managerY + 15,
    body: [
      ['Name', options.managerName],
      ['Email', options.managerEmail],
      ['Notes', options.managerNotes || 'No notes provided'],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
  });

  // Add status information
  const statusY = doc.lastAutoTable?.finalY || 200;
  doc.setFontSize(14);
  doc.text('Status Information', 14, statusY + 10);

  // Set color based on status
  const statusColor = options.status === 'APPROVED' ? [39, 174, 96] : [231, 76, 60]; // Green or Red

  autoTable(doc, {
    startY: statusY + 15,
    body: [
      ['Status', options.status],
      ['Date', format(new Date(options.responseDate), 'PPP')],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    bodyStyles: { fillColor: statusColor, textColor: [255, 255, 255] },
  });

  // Add footer to all pages
  const footerText = `This document was automatically generated on ${format(new Date(), 'PPP')} and serves as official proof of the maintenance request ${options.status.toLowerCase()}.`;

  // Get the number of pages
  const pageCount = doc.internal.pages.length - 1; // -1 because jsPDF uses 1-based indexing

  // Add footer to each page
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.text(
      footerText,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    // Add page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 20,
      footerY - 5,
      { align: 'right' }
    );
  }

  // Return the PDF as a blob
  return doc.output('blob');
}
