import { PrismaClient } from '@prisma/client';
import { calculateMonthlyDepreciation, DepreciationMethod } from '../src/utils/depreciation';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding assets and depreciation schedules...');

  // Optionally clear existing data for a clean slate
  await prisma.depreciationSchedule.deleteMany({});
  await prisma.asset.deleteMany({});

  const assetsToCreate = [
    {
      name: 'Main Power Generator',
      itemDescription: 'Primary backup power generator for the main facility.',
      serialNumber: 'GEN-001',
      oldTagNumber: 'OLD-GEN-001',
      newTagNumber: 'NEW-GEN-001',
      grnNumber: 'GRN-1001',
      grnDate: new Date('2022-01-10'),
      unitPrice: 25000,
      sivNumber: 'SIV-2001',
      sivDate: new Date('2022-01-15'),
      currentDepartment: 'Operations',
      remark: 'Installed in 2022',
      usefulLifeYears: 10,
      residualPercentage: 10,
      currentValue: 22000,
      status: 'ACTIVE',
      location: 'Utility Room 1',
      category: 'EQUIPMENT',
      type: 'Generator',
      depreciableCost: 25000,
      salvageValue: 2500,
      depreciationMethod: 'STRAIGHT_LINE' as DepreciationMethod,
    },
    {
      name: 'Dell Latitude 7420',
      itemDescription: 'Standard issue laptop for employees.',
      serialNumber: 'LT-DELL-001',
      oldTagNumber: 'OLD-LT-001',
      newTagNumber: 'NEW-LT-001',
      grnNumber: 'GRN-1003',
      grnDate: new Date('2023-05-05'),
      unitPrice: 1200,
      sivNumber: 'SIV-2003',
      sivDate: new Date('2023-05-10'),
      currentDepartment: 'IT',
      remark: 'Assigned to IT staff',
      usefulLifeYears: 3,
      residualPercentage: 8,
      currentValue: 1000,
      status: 'ACTIVE',
      location: 'IT Storage',
      category: 'IT_EQUIPMENT',
      type: 'Laptop',
      depreciableCost: 1200,
      salvageValue: 100,
      depreciationMethod: 'STRAIGHT_LINE' as DepreciationMethod,
    },
    {
      name: 'Ford Transit Van',
      itemDescription: 'Company van for deliveries and transport.',
      serialNumber: 'VAN-FORD-001',
      oldTagNumber: 'OLD-VAN-001',
      newTagNumber: 'NEW-VAN-001',
      grnNumber: 'GRN-1004',
      grnDate: new Date('2020-02-20'),
      unitPrice: 35000,
      sivNumber: 'SIV-2004',
      sivDate: new Date('2020-02-28'),
      currentDepartment: 'Logistics',
      remark: 'Used for company deliveries',
      usefulLifeYears: 5,
      residualPercentage: 12,
      currentValue: 28000,
      status: 'ACTIVE',
      location: 'Company Garage',
      category: 'VEHICLE',
      type: 'Van',
      depreciableCost: 35000,
      salvageValue: 5000,
      depreciationMethod: 'STRAIGHT_LINE' as DepreciationMethod,
    },
  ];

  for (const assetData of assetsToCreate) {
    // Create asset
    const asset = await prisma.asset.create({ data: assetData });

    // Generate monthly depreciation schedule
    const schedule = calculateMonthlyDepreciation({
      unitPrice: asset.unitPrice!,
      sivDate: asset.sivDate!.toISOString(),
      usefulLifeYears: asset.usefulLifeYears!,
      salvageValue: asset.salvageValue ?? 0,
      method: asset.depreciationMethod as DepreciationMethod,
    });

    // Insert schedule into DepreciationSchedule table
    await prisma.depreciationSchedule.createMany({
      data: schedule.map(row => ({
        assetId: asset.id,
        year: row.year,
        month: row.month,
        bookValue: row.bookValue,
      })),
    });
    console.log(`Seeded asset and depreciation schedule for: ${asset.name}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 