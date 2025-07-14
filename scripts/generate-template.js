const XLSX = require('xlsx');
const path = require('path');

// Define the template headers based on the Asset model
const headers = [
  'Asset Name (Optional)',
  'Serial Number (Optional)', 
  'SIV Date *',
  'Unit Price *',
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
  'Salvage Value (Auto-calculated)',
  'Depreciation Method',
  'Depreciation Start Date'
];

// Sample data row for reference
const sampleData = [
  'Dell Laptop Model XYZ',
  'DL001234',
  '2024-01-15',
  '1200.00',
  'Dell Inspiron 15 3000 Series laptop with 8GB RAM and 256GB SSD',
  'OLD001',
  'NEW001',
  'GRN2024001',
  '2024-01-10',
  'SIV2024001',
  'IT Department',
  'Purchased for new employee',
  'ACTIVE',
  'Office Floor 2',
  'IT Equipment',
  'Dell Technologies',
  '2027-01-15',
  '',
  '2024-07-15',
  '3',
  '10',
  '1200.00',
  '120.00',
  'STRAIGHT_LINE',
  '2024-01-15'
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();

// Create data array with headers and sample
const data = [
  headers,
  sampleData,
  // Add empty rows for users to fill
  new Array(headers.length).fill(''),
  new Array(headers.length).fill(''),
  new Array(headers.length).fill('')
];

const worksheet = XLSX.utils.aoa_to_sheet(data);

// Set column widths for better readability
const colWidths = headers.map(header => ({
  wch: Math.max(header.length, 15)
}));
worksheet['!cols'] = colWidths;

// Add the worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Asset Import Template');

// Create instructions sheet
const instructions = [
  ['Asset Import Template Instructions'],
  [''],
  ['Required Fields (must be filled):'],
  ['- SIV Date: Date format YYYY-MM-DD (e.g., 2024-01-15)'],
  ['- Unit Price: Numeric value (e.g., 1200.00)'],
  [''],
  ['Optional Fields (auto-generated if empty):'],
  ['- Asset Name: Name of the asset (auto-generated if empty)'],
  ['- Serial Number: Unique identifier (auto-generated if empty)'],
  [''],
  ['Other Optional Fields:'],
  ['- All other fields are optional but recommended'],
  ['- Salvage Value: Auto-calculated from Unit Price × (Residual Percentage ÷ 100)'],
  ['- If no Residual Percentage provided, Salvage Value defaults to 0'],
  ['- Dates should be in YYYY-MM-DD format'],
  ['- Status options: ACTIVE, TRANSFERRED, DISPOSED, UNDER_MAINTENANCE'],
  ['- Depreciation Method options: STRAIGHT_LINE, DECLINING_BALANCE, DOUBLE_DECLINING, SUM_OF_YEARS_DIGITS, UNITS_OF_ACTIVITY'],
  [''],
  ['Notes:'],
  ['- Row 2 contains sample data for reference'],
  ['- You can delete the sample row before importing'],
  ['- Asset Name and Serial Number will be auto-generated if left empty'],
  ['- Serial Numbers must be unique - duplicates will be rejected'],
  ['- Invalid dates or numbers will cause row import to fail'],
  ['- Empty rows will be skipped during import']
];

const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
instructionsSheet['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

// Write the file
const outputPath = path.join(__dirname, '..', 'public', 'downloads', 'asset-import-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Excel template created successfully at:', outputPath);
