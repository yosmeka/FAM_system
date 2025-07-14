const XLSX = require('xlsx');
const path = require('path');

// Create test data specifically for salvage value calculation
const testData = [
  // Headers
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
    'Status',
    'Useful Life (Years)',
    'Residual Percentage',
    'Salvage Value (Auto-calculated)'
  ],
  // Test data rows with different residual percentages
  [
    'Laptop with 10% Residual',
    'LAPTOP-10PCT',
    '2024-01-15',
    '1000.00', // Unit Price: $1000
    'Laptop for testing 10% residual',
    'IT Department',
    'Office Floor 3',
    'IT Equipment',
    'Tech Corp',
    'ACTIVE',
    '3',
    '10', // 10% residual = $100 salvage value
    '' // Leave empty to test auto-calculation
  ],
  [
    'Monitor with 5% Residual',
    'MONITOR-5PCT',
    '2024-01-20',
    '500.00', // Unit Price: $500
    'Monitor for testing 5% residual',
    'IT Department',
    'Office Floor 3',
    'IT Equipment',
    'Monitor Inc',
    'ACTIVE',
    '5',
    '5', // 5% residual = $25 salvage value
    '' // Leave empty to test auto-calculation
  ],
  [
    'Chair with 20% Residual',
    'CHAIR-20PCT',
    '2024-02-01',
    '300.00', // Unit Price: $300
    'Chair for testing 20% residual',
    'HR Department',
    'Office Floor 2',
    'Furniture',
    'Furniture Co',
    'ACTIVE',
    '7',
    '20', // 20% residual = $60 salvage value
    '' // Leave empty to test auto-calculation
  ],
  [
    'Printer No Residual',
    'PRINTER-0PCT',
    '2024-02-05',
    '800.00', // Unit Price: $800
    'Printer with no residual percentage',
    'Admin Department',
    'Office Floor 1',
    'Office Equipment',
    'Printer Corp',
    'ACTIVE',
    '5',
    '', // No residual percentage = $0 salvage value
    '' // Leave empty to test auto-calculation
  ],
  [
    'Server Explicit Salvage',
    'SERVER-EXPLICIT',
    '2024-02-10',
    '2000.00', // Unit Price: $2000
    'Server with explicit salvage value',
    'IT Department',
    'Server Room',
    'IT Equipment',
    'Server Solutions',
    'ACTIVE',
    '5',
    '15', // 15% residual would be $300, but explicit value should override
    '500' // Explicit salvage value should be used instead of calculation
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
XLSX.utils.book_append_sheet(workbook, worksheet, 'Salvage Value Test');

// Write the file
const outputPath = path.join(__dirname, '..', 'public', 'downloads', 'salvage-value-test.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Salvage value test Excel file created successfully at:', outputPath);
console.log('\nExpected Results:');
console.log('Row 2: Laptop - Unit Price: $1000, Residual: 10% → Salvage Value: $100');
console.log('Row 3: Monitor - Unit Price: $500, Residual: 5% → Salvage Value: $25');
console.log('Row 4: Chair - Unit Price: $300, Residual: 20% → Salvage Value: $60');
console.log('Row 5: Printer - Unit Price: $800, No Residual → Salvage Value: $0');
console.log('Row 6: Server - Unit Price: $2000, Explicit Salvage: $500 → Salvage Value: $500 (not calculated)');
