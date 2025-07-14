const XLSX = require('xlsx');
const path = require('path');

// Create test data for bulk upload
const testData = [
  // Headers
  [
    'Asset Name',
    'Serial Number', 
    'SIV Date',
    'Unit Price',
    'Item Description',
    'Old Tag Number',
    'New Tag Number',
    'GRN Number',
    'GRN Date',
    'SIV Number',
    'Current Department',
    'Remark',
    'Status',
    'Location',
    'Category',
    'Supplier',
    'Warranty Expiry Date',
    'Last Maintenance Date',
    'Next Maintenance Date',
    'Useful Life (Years)',
    'Residual Percentage',
    'Current Value',
    'Salvage Value',
    'Depreciation Method',
    'Depreciation Start Date'
  ],
  // Test data rows
  [
    'HP Laptop ProBook 450',
    'HP001',
    '2024-01-15',
    '1500.00',
    'HP ProBook 450 G9 with Intel i5 processor, 8GB RAM, 256GB SSD',
    'OLD-HP001',
    'NEW-HP001',
    'GRN2024001',
    '2024-01-10',
    'SIV2024001',
    'IT Department',
    'For software development team',
    'ACTIVE',
    'Office Floor 3',
    'IT Equipment',
    'HP Inc.',
    '2027-01-15',
    '',
    '2024-07-15',
    '3',
    '10',
    '1500.00',
    '150.00',
    'STRAIGHT_LINE',
    '2024-01-15'
  ],
  [
    'Dell Monitor 24 inch',
    'DELL001',
    '2024-01-20',
    '300.00',
    'Dell 24-inch LED monitor with 1080p resolution',
    'OLD-DELL001',
    'NEW-DELL001',
    'GRN2024002',
    '2024-01-18',
    'SIV2024002',
    'IT Department',
    'Additional monitor for developers',
    'ACTIVE',
    'Office Floor 3',
    'IT Equipment',
    'Dell Technologies',
    '2027-01-20',
    '',
    '2024-07-20',
    '5',
    '5',
    '300.00',
    '15.00',
    'STRAIGHT_LINE',
    '2024-01-20'
  ],
  [
    'Office Chair Ergonomic',
    'CHAIR001',
    '2024-02-01',
    '250.00',
    'Ergonomic office chair with lumbar support',
    'OLD-CHAIR001',
    'NEW-CHAIR001',
    'GRN2024003',
    '2024-01-30',
    'SIV2024003',
    'HR Department',
    'For new employee workstation',
    'ACTIVE',
    'Office Floor 2',
    'Furniture',
    'Office Furniture Co.',
    '2026-02-01',
    '',
    '2024-08-01',
    '7',
    '20',
    '250.00',
    '50.00',
    'STRAIGHT_LINE',
    '2024-02-01'
  ]
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(testData);

// Set column widths
const colWidths = testData[0].map(header => ({
  wch: Math.max(header.length, 15)
}));
worksheet['!cols'] = colWidths;

// Add the worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Assets');

// Write the file
const outputPath = path.join(__dirname, '..', 'public', 'downloads', 'test-assets-import.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Test Excel file created successfully at:', outputPath);
console.log('You can use this file to test the bulk upload functionality.');
console.log('It contains 3 sample assets with all required fields filled.');
