import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withPermission } from '@/middleware/permission';
import * as XLSX from 'xlsx';

interface ImportResult {
  row: number;
  success: boolean;
  assetId?: string;
  assetName?: string;
  serialNumber?: string;
  error?: string;
  note?: string;
}

interface ImportSummary {
  totalRows: number;
  successCount: number;
  errorCount: number;
  results: ImportResult[];
}

export const POST = withPermission(async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return Response.json({ 
        error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' 
      }, { status: 400 });
    }

    // Read the file buffer
    const buffer = await file.arrayBuffer();
    
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with empty cells as empty strings
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { 
      defval: '',
      raw: false // This ensures dates are formatted as strings
    });

    if (rows.length === 0) {
      return Response.json({ 
        error: 'No data found in the Excel file' 
      }, { status: 400 });
    }

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2; // Account for header row (Excel row number)
      const row = rows[i];

      try {
        // Skip empty rows
        const hasData = Object.values(row).some(value => 
          value && value.toString().trim() !== ''
        );
        
        if (!hasData) {
          continue; // Skip empty rows without counting as error
        }

        // Extract and validate required fields
        // Handle both old and new column headers for backward compatibility
        const name = (row['Asset Name'] || row['Asset Name (Optional)'] || '').toString().trim();
        const itemDescription = (row['Item Description'] || '').toString().trim();
        const serialNumber = (row['Serial Number'] || row['Serial Number (Optional)'] || '').toString().trim();
        const sivDateRaw = row['SIV Date'] || row['SIV Date *'];
        const unitPriceRaw = row['Unit Price'] || row['Unit Price *'];

        // Only SIV Date and Unit Price are truly required
        if (!sivDateRaw) {
          throw new Error('SIV Date is required');
        }
        if (!unitPriceRaw || unitPriceRaw === '') {
          throw new Error('Unit Price is required');
        }

        // Generate default values for optional fields
        // Use item description as asset name if no asset name is provided
        const finalName = name || itemDescription || `Asset-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const finalSerialNumber = serialNumber || `SN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        // Parse and validate SIV Date
        const sivDate = new Date(sivDateRaw);
        if (isNaN(sivDate.getTime())) {
          throw new Error('Invalid SIV Date format. Use YYYY-MM-DD');
        }

        // Parse and validate Unit Price
        const unitPrice = parseFloat(unitPriceRaw.toString().replace(/[,$]/g, ''));
        if (isNaN(unitPrice) || unitPrice <= 0) {
          throw new Error('Invalid Unit Price. Must be a positive number greater than zero');
        }

        // Check if serial number already exists (using the final generated serial number)
        const existingAsset = await prisma.asset.findUnique({
          where: { serialNumber: finalSerialNumber },
          select: { id: true, name: true }
        });

        if (existingAsset) {
          throw new Error(`Serial Number '${finalSerialNumber}' already exists for asset '${existingAsset.name}'`);
        }

        // Prepare asset data
        const assetData: any = {
          name: finalName,
          serialNumber: finalSerialNumber,
          sivDate,
          unitPrice,
          currentValue: unitPrice, // Default to unit price
          status: 'ACTIVE' // Default status
        };

        // Helper function to parse optional date fields
        const parseOptionalDate = (value: any): Date | null => {
          if (!value || value === '') return null;
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        };

        // Helper function to parse optional numeric fields
        const parseOptionalNumber = (value: any): number | null => {
          if (!value || value === '') return null;
          const num = parseFloat(value.toString().replace(/[,$]/g, ''));
          return isNaN(num) ? null : num;
        };

        // Helper function to parse optional string fields
        const parseOptionalString = (value: any): string | null => {
          if (!value || value === '') return null;
          return value.toString().trim();
        };

        // Process optional fields
        const optionalStringFields = [
          ['Item Description', 'itemDescription'],
          ['Old Tag Number', 'oldTagNumber'],
          ['New Tag Number', 'newTagNumber'],
          ['GRN Number', 'grnNumber'],
          ['SIV Number', 'sivNumber'],
          ['Current Department', 'currentDepartment'],
          ['Remark', 'remark'],
          ['Status', 'status'],
          ['Location', 'location'],
          ['Category', 'category'],
          ['Supplier', 'supplier'],
          ['Depreciation Method', 'depreciationMethod']
        ];

        optionalStringFields.forEach(([excelField, dbField]) => {
          const value = parseOptionalString(row[excelField]);
          if (value) assetData[dbField] = value;
        });

        // Process optional date fields
        const optionalDateFields = [
          ['GRN Date', 'grnDate'],
          ['Warranty Expiry Date', 'warrantyExpiry'],
          ['Last Maintenance Date', 'lastMaintenance'],
          ['Next Maintenance Date', 'nextMaintenance'],
          ['Depreciation Start Date', 'depreciationStartDate']
        ];

        optionalDateFields.forEach(([excelField, dbField]) => {
          const value = parseOptionalDate(row[excelField]);
          if (value) assetData[dbField] = value;
        });

        // Process optional numeric fields
        const optionalNumericFields = [
          ['Useful Life (Years)', 'usefulLifeYears'],
          ['Residual Percentage', 'residualPercentage'],
          ['Current Value', 'currentValue'],
          ['Salvage Value', 'salvageValue'],
          ['Salvage Value (Auto-calculated)', 'salvageValue'] // Handle new header
        ];

        optionalNumericFields.forEach(([excelField, dbField]) => {
          const value = parseOptionalNumber(row[excelField]);
          if (value !== null) assetData[dbField] = value;
        });

        // Calculate salvage value if residual percentage is provided
        if (assetData.residualPercentage && assetData.residualPercentage > 0) {
          const calculatedSalvageValue = unitPrice * (assetData.residualPercentage / 100);
          assetData.salvageValue = calculatedSalvageValue;
          console.log(`Row ${rowIndex}: Calculated salvage value: ${calculatedSalvageValue} (Unit Price: ${unitPrice} × Residual %: ${assetData.residualPercentage}%)`);
        } else if (!assetData.salvageValue) {
          // If no residual percentage and no explicit salvage value, default to 0
          assetData.salvageValue = 0;
          console.log(`Row ${rowIndex}: No residual percentage provided, salvage value set to 0`);
        } else {
          console.log(`Row ${rowIndex}: Using explicit salvage value: ${assetData.salvageValue}`);
        }

        // Validate status if provided
        if (assetData.status) {
          const validStatuses = ['ACTIVE', 'TRANSFERRED', 'DISPOSED', 'UNDER_MAINTENANCE'];
          if (!validStatuses.includes(assetData.status)) {
            assetData.status = 'ACTIVE'; // Default to ACTIVE for invalid status
          }
        }

        // Validate depreciation method if provided
        if (assetData.depreciationMethod) {
          const validMethods = ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_ACTIVITY'];
          if (!validMethods.includes(assetData.depreciationMethod)) {
            assetData.depreciationMethod = 'STRAIGHT_LINE'; // Default to STRAIGHT_LINE
          }
        }

        // Create the asset
        const asset = await prisma.asset.create({
          data: assetData
        });

        // Generate and store depreciation schedule
        try {
          const { calculateMonthlyDepreciation } = await import('@/utils/depreciation');
          const schedule = calculateMonthlyDepreciation({
            unitPrice: asset.unitPrice || 0,
            sivDate: asset.sivDate?.toISOString() || new Date().toISOString(),
            usefulLifeYears: asset.usefulLifeYears || 1,
            salvageValue: asset.salvageValue || 0,
            method: (asset.depreciationMethod as any) || 'STRAIGHT_LINE',
          });

          await prisma.depreciationSchedule.createMany({
            data: schedule.map(row => ({
              assetId: asset.id,
              year: row.year,
              month: row.month,
              bookValue: row.bookValue,
            })),
          });
        } catch (depreciationError) {
          console.error('Error generating depreciation schedule for asset:', asset.id, depreciationError);
          // Continue without failing the asset creation
        }

        // Track asset creation in history
        const historyFields = [
          'name', 'itemDescription', 'serialNumber', 'oldTagNumber', 'newTagNumber', 
          'grnNumber', 'grnDate', 'unitPrice', 'sivNumber', 'sivDate', 'currentDepartment', 
          'remark', 'usefulLifeYears', 'residualPercentage', 'currentValue', 'status', 
          'location', 'category', 'supplier', 'warrantyExpiry', 'lastMaintenance', 
          'nextMaintenance', 'salvageValue', 'depreciationMethod', 'depreciationStartDate'
        ];

        try {
          for (const field of historyFields) {
            const value = (asset as any)[field];
            if (value !== null && value !== undefined) {
              await prisma.assetHistory.create({
                data: {
                  assetId: asset.id,
                  field,
                  oldValue: null,
                  newValue: value.toString(),
                  changedBy: session.user?.email || 'bulk-import',
                }
              });
            }
          }
        } catch (historyError) {
          console.error('Error creating history records for asset:', asset.id, historyError);
          // Continue without failing the asset creation
        }

        results.push({
          row: rowIndex,
          success: true,
          assetId: asset.id,
          assetName: asset.name,
          serialNumber: asset.serialNumber,
          // Add note if values were auto-generated or taken from item description
          ...(name !== asset.name && {
            note: name ? 'Asset name was auto-generated' :
                  itemDescription ? 'Asset name taken from item description' :
                  'Asset name was auto-generated'
          }),
          ...(serialNumber !== asset.serialNumber && {
            note: (name !== asset.name ?
              (name ? 'Asset name and serial number were auto-generated' :
               itemDescription ? 'Asset name taken from item description, serial number was auto-generated' :
               'Asset name and serial number were auto-generated') :
              'Serial number was auto-generated')
          })
        });
        successCount++;

      } catch (error: any) {
        console.error(`Error processing row ${rowIndex}:`, error);
        results.push({
          row: rowIndex,
          success: false,
          error: error.message || 'Unknown error occurred'
        });
        errorCount++;
      }
    }

    const summary: ImportSummary = {
      totalRows: results.length,
      successCount,
      errorCount,
      results
    };

    return Response.json(summary);

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return Response.json({
      error: error.message || 'Failed to process bulk upload'
    }, { status: 500 });
  }
}, 'Asset create');
