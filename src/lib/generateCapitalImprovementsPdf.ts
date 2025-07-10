import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/utils/formatters';

interface CapitalImprovement {
  id: string;
  description: string;
  improvementDate: string;
  cost: number;
  notes: string | null;
}

interface GenerateCapitalImprovementsPdfOptions {
  assetName: string;
  assetId: string;
  improvements: CapitalImprovement[];
  totalValue: number;
}

export function generateCapitalImprovementsPdf({
  assetName,
  assetId,
  improvements,
  totalValue,
}: GenerateCapitalImprovementsPdfOptions) {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text(`Capital Improvements - ${assetName}`, 14, 15);
  
  // Add metadata
  doc.setFontSize(10);
  doc.text(`Asset ID: ${assetId}`, 14, 25);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`Total Improvements: ${improvements.length}`, 14, 35);
  doc.text(`Total Added Value: ${formatCurrency(totalValue)}`, 14, 40);

  // Prepare table data
  const headers = [
    ['Description', 'Date', 'Cost', 'Notes']
  ];

  const rows = improvements.map(improvement => [
    improvement.description,
    new Date(improvement.improvementDate).toLocaleDateString(),
    formatCurrency(improvement.cost),
    improvement.notes || '-'
  ]);

  // Add table
  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 45,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [0, 102, 204], // Blue header
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 60 }, // Description
      1: { cellWidth: 30 }, // Date
      2: { cellWidth: 30 }, // Cost
      3: { cellWidth: 'auto' }, // Notes
    },
  });

  // Add summary at the bottom
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 45;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Summary`, 14, finalY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`This report summarizes all capital improvements made to asset "${assetName}".`, 14, finalY + 15);
  doc.text(`The total value added through these improvements is ${formatCurrency(totalValue)}.`, 14, finalY + 20);

  // Save the PDF
  doc.save(`capital-improvements-${assetId}-${new Date().toISOString().split('T')[0]}.pdf`);
}
