import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Define CellData interface for use in the code
interface CellData {
  cursor: {
    x: number;
    y: number;
  };
  row: {
    height: number;
    raw: unknown;
  };
  cell: {
    width: number;
    height: number;
    text: string;
  };
  section: 'head' | 'body' | 'foot';
  column: {
    index: number;
    raw: unknown;
  };
  pageNumber: number;
}

// Define the type for jspdf-autotable
declare module 'jspdf-autotable' {
  interface CellData {
    cursor: {
      x: number;
      y: number;
    };
    row: {
      height: number;
      raw: unknown;
    };
    cell: {
      width: number;
      height: number;
      text: string;
    };
    section: 'head' | 'body' | 'foot';
    column: {
      index: number;
      raw: unknown;
    };
    pageNumber: number;
  }

  interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body: string[][];
    theme?: string;
    headStyles?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    columnStyles?: Record<string, unknown>;
    willDrawCell?: (data: CellData) => void;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}

// Extend jsPDF to include lastAutoTable property
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export interface TransferDocumentOptions {
  transferId: string;
  assetName: string;
  assetSerialNumber: string;
  fromLocation: string;
  toLocation: string;
  requesterName: string;
  requesterEmail: string;
  managerName: string;
  managerEmail: string;
  requestReason: string;
  managerReason?: string;
  status: 'APPROVED' | 'REJECTED';
  requestDate: Date;
  responseDate: Date;
}

/**
 * Generates a PDF document for transfer approval or rejection
 * @param options Transfer document options
 * @returns The PDF document as a Blob
 */
export async function generateTransferDocumentPdf(options: TransferDocumentOptions): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Add header with logo placeholder
  doc.setFillColor(220, 53, 69); // Red color
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(18);
  doc.text('Asset Transfer ' + (options.status === 'APPROVED' ? 'Approval' : 'Rejection'), pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Document ID: ' + options.transferId, pageWidth / 2, 25, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Add document information
  doc.setFontSize(14);
  doc.text('Transfer Details', 14, 40);

  // Add asset information
  const assetInfo = [
    ['Asset Name', options.assetName],
    ['Serial Number', options.assetSerialNumber],
    ['From Location', options.fromLocation],
    ['To Location', options.toLocation],
    ['Status', options.status],
    ['Request Date', format(new Date(options.requestDate), 'PPP')],
    ['Response Date', format(new Date(options.responseDate), 'PPP')],
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Field', 'Value']],
    body: assetInfo,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
  });

  // Get the final Y position
  const finalY1 = doc.lastAutoTable.finalY + 10;

  // Add personnel information
  doc.setFontSize(14);
  doc.text('Personnel Information', 14, finalY1);

  const personnelInfo = [
    ['Requester Name', options.requesterName],
    ['Requester Email', options.requesterEmail],
    ['Manager Name', options.managerName],
    ['Manager Email', options.managerEmail],
  ];

  autoTable(doc, {
    startY: finalY1 + 5,
    head: [['Role', 'Details']],
    body: personnelInfo,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
  });

  // Get the final Y position
  const finalY2 = doc.lastAutoTable.finalY + 10;

  // Add reason information
  doc.setFontSize(14);
  doc.text('Reason Information', 14, finalY2);

  const reasonInfo = [
    ['Request Reason', options.requestReason],
  ];

  if (options.managerReason) {
    reasonInfo.push([
      options.status === 'APPROVED' ? 'Approval Reason' : 'Rejection Reason',
      options.managerReason
    ]);
  }

  // Process long text for better display
  const processedReasonInfo = reasonInfo.map(row => {
    // If the reason text is too long, truncate it or split it
    if (row[1] && row[1].length > 100) {
      // Split long text into multiple lines with proper word breaks
      const words = row[1].split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).length <= 80) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      // Join the lines with newlines
      return [row[0], lines.join('\n')];
    }
    return row;
  });

  autoTable(doc, {
    startY: finalY2 + 5,
    head: [['Type', 'Reason']],
    body: processedReasonInfo,
    theme: 'grid',
    headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60 }, // Fixed width for the first column
      1: { cellWidth: 'auto', overflow: 'linebreak' },
    },
    // Add page break if content doesn't fit
    willDrawCell: (data: CellData) => {
      // Check if we're about to draw a cell that would go off the page
      const pageHeight = doc.internal.pageSize.getHeight();
      if (data.cursor.y + data.row.height > pageHeight - 40) {
        data.cursor.y = 20; // Reset Y position to top of new page
        doc.addPage(); // Add a new page
      }
    },
  });

  // Get the final Y position
  const finalY3 = doc.lastAutoTable.finalY + 10;

  // Check if we need to add a new page for signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  if (finalY3 + 50 > pageHeight - 20) {
    doc.addPage();
    // Reset Y position on new page
    const newFinalY3 = 20;

    // Add signature section on new page
    doc.setFontSize(14);
    doc.text('Signatures', 14, newFinalY3);

    // Add signature lines
    const signatureY = newFinalY3 + 30;

    // Manager signature
    doc.line(14, signatureY, 100, signatureY);
    doc.setFontSize(10);
    doc.text('Manager Signature', 14, signatureY + 5);
    doc.text(options.managerName, 14, signatureY + 10);
    doc.text(format(new Date(options.responseDate), 'PPP'), 14, signatureY + 15);

    // Requester signature
    doc.line(pageWidth - 100, signatureY, pageWidth - 14, signatureY);
    doc.text('Requester Signature', pageWidth - 100, signatureY + 5);
    doc.text(options.requesterName, pageWidth - 100, signatureY + 10);
    doc.text(format(new Date(options.requestDate), 'PPP'), pageWidth - 100, signatureY + 15);
  } else {
    // Add signature section on same page
    doc.setFontSize(14);
    doc.text('Signatures', 14, finalY3);

    // Add signature lines
    const signatureY = finalY3 + 30;

    // Manager signature
    doc.line(14, signatureY, 100, signatureY);
    doc.setFontSize(10);
    doc.text('Manager Signature', 14, signatureY + 5);
    doc.text(options.managerName, 14, signatureY + 10);
    doc.text(format(new Date(options.responseDate), 'PPP'), 14, signatureY + 15);

    // Requester signature
    doc.line(pageWidth - 100, signatureY, pageWidth - 14, signatureY);
    doc.text('Requester Signature', pageWidth - 100, signatureY + 5);
    doc.text(options.requesterName, pageWidth - 100, signatureY + 10);
    doc.text(format(new Date(options.requestDate), 'PPP'), pageWidth - 100, signatureY + 15);
  }

  // Add footer to all pages
  const footerText = `This document was automatically generated on ${format(new Date(), 'PPP')} and serves as official proof of the transfer ${options.status.toLowerCase()}.`;

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
