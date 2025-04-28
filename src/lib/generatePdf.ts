import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AssetCategoryData } from '@/types/reports';

interface GeneratePdfOptions {
    title: string;
    data: AssetCategoryData[];
    type: 'category' | 'department';
}

export function generatePdf({ title, data, type }: GeneratePdfOptions) {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 25);

    // Prepare table data
    const headers = [
        [type === 'category' ? 'Category' : 'Department', 'Total Assets', 'Total Value ($)', 'Average Value ($)']
    ];

    const rows = data.map(item => [
        item.category,
        item.count.toString(),
        item.value.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        (item.value / item.count).toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);

    // Add table
    autoTable(doc, {
        head: headers,
        body: rows,
        startY: 30,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [220, 53, 69],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
        },
    });

    // Save the PDF
    doc.save(`asset-report-by-${type}-${new Date().toISOString().split('T')[0]}.pdf`);
} 