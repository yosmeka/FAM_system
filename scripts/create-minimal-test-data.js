const XLSX = require('xlsx');
const path = require('path');

// Create minimal test data to test optional Asset Name and Serial Number
const testData = [
  // Headers (using new format)
  [
    'Asset Name (Optional)',
    'Serial Number (Optional)', 
    'SIV Date *',
    'Unit Price *',
    'Item Description',
    'Current Department',
    'Location',
    'Category',
    'Supplier',
    'Status'
  ],
  // Test data rows - some with missing Asset Name and Serial Number
  [
    '', // Empty Asset Name - should be auto-generated
    '', // Empty Serial Number - should be auto-generated
    '2024-01-15',
    '1500.00',
    'Laptop for development team',
    'IT Department',
    'Office Floor 3',
    'IT Equipment',
    'Tech Supplier Inc.',
    'ACTIVE'
  ],
  [
    'Custom Monitor Name', // Provided Asset Name
    '', // Empty Serial Number - should be auto-generated
    '2024-01-20',
    '300.00',
    'Monitor for workstation',
    'IT Department',
    'Office Floor 3',
    'IT Equipment',
    'Monitor Corp',
    'ACTIVE'
  ],
  [
    '', // Empty Asset Name - should be auto-generated
    'CUSTOM-SERIAL-001', // Provided Serial Number
    '2024-02-01',
    '250.00',
    'Office furniture',
    'HR Department',
    'Office Floor 2',
    'Furniture',
    'Furniture Co.',
    'ACTIVE'
  ],
  [
    'Complete Asset Info', // Both provided
    'COMPLETE-001',
    '2024-02-05',
    '800.00',
    'Printer for office use',
    'Admin Department',
    'Office Floor 1',
    'Office Equipment',
    'Printer Solutions',
    'ACTIVE'
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
XLSX.utils.book_append_sheet(workbook, worksheet, 'Minimal Test Assets');

// Write the file
const outputPath = path.join(__dirname, '..', 'public', 'downloads', 'minimal-test-assets.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Minimal test Excel file created successfully at:', outputPath);
console.log('This file tests the optional Asset Name and Serial Number functionality:');
console.log('- Row 2: Both Asset Name and Serial Number empty (both auto-generated)');
console.log('- Row 3: Asset Name provided, Serial Number empty (serial auto-generated)');
console.log('- Row 4: Asset Name empty, Serial Number provided (name auto-generated)');
console.log('- Row 5: Both Asset Name and Serial Number provided (no auto-generation)');
