const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed process...');

  // Clear existing data (in correct order to avoid foreign key constraints)
  console.log('🧹 Cleaning existing data...');
  await prisma.assetHistory.deleteMany();
  await prisma.assetDepreciation.deleteMany();
  await prisma.depreciation.deleteMany();
  await prisma.capitalImprovement.deleteMany();
  await prisma.document.deleteMany();
  await prisma.disposal.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.linkedAsset.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.roleChangeLog.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@zemenbank.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      name: 'John Manager',
      email: 'john.manager@zemenbank.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      name: 'Sarah Wilson',
      email: 'sarah.wilson@zemenbank.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice.johnson@zemenbank.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob.smith@zemenbank.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      name: 'Carol Davis',
      email: 'carol.davis@zemenbank.com',
      password: hashedPassword,
      role: 'USER',
    },
  });

  // Create Assets with comprehensive data
  console.log('💻 Creating assets...');
  
  const assets = [];
  const categories = ['Electronics', 'Furniture', 'Vehicles', 'Equipment', 'Software'];
  const departments = ['IT', 'Finance', 'HR', 'Operations', 'Marketing'];
  const locations = ['Head Office', 'Branch 1', 'Branch 2', 'Warehouse', 'Data Center'];
  const statuses = ['ACTIVE', 'TRANSFERRED', 'DISPOSED', 'UNDER_MAINTENANCE'];
  const depreciationMethods = ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS_DIGITS'];

  // Generate 100 assets with realistic data
  for (let i = 1; i <= 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const status = i <= 80 ? 'ACTIVE' : statuses[Math.floor(Math.random() * statuses.length)];
    const depreciationMethod = depreciationMethods[Math.floor(Math.random() * depreciationMethods.length)];
    
    // Generate realistic purchase dates (last 5 years)
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - Math.floor(Math.random() * 5));
    purchaseDate.setMonth(Math.floor(Math.random() * 12));
    purchaseDate.setDate(Math.floor(Math.random() * 28) + 1);

    // Generate realistic prices based on category
    let basePrice;
    switch (category) {
      case 'Electronics':
        basePrice = 500 + Math.random() * 4500; // $500 - $5000
        break;
      case 'Furniture':
        basePrice = 200 + Math.random() * 1800; // $200 - $2000
        break;
      case 'Vehicles':
        basePrice = 15000 + Math.random() * 35000; // $15000 - $50000
        break;
      case 'Equipment':
        basePrice = 1000 + Math.random() * 9000; // $1000 - $10000
        break;
      case 'Software':
        basePrice = 100 + Math.random() * 4900; // $100 - $5000
        break;
      default:
        basePrice = 500 + Math.random() * 2000;
    }

    const purchasePrice = Math.round(basePrice * 100) / 100;
    const salvageValue = Math.round(purchasePrice * (0.05 + Math.random() * 0.15) * 100) / 100; // 5-20% of purchase price
    const usefulLifeMonths = (3 + Math.floor(Math.random() * 7)) * 12; // 3-10 years
    
    // Calculate current value with some depreciation
    const ageInYears = (new Date() - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);
    const depreciationRate = Math.random() * 0.15 + 0.05; // 5-20% per year
    const currentValue = Math.max(
      salvageValue,
      Math.round(purchasePrice * Math.pow(1 - depreciationRate, ageInYears) * 100) / 100
    );

    const asset = await prisma.asset.create({
      data: {
        name: `${category} Asset ${i.toString().padStart(3, '0')}`,
        description: `${category} asset for ${department} department`,
        serialNumber: `ZB${category.substring(0, 2).toUpperCase()}${i.toString().padStart(4, '0')}`,
        purchaseDate,
        purchasePrice,
        currentValue,
        status,
        location,
        department: 'Zemen Bank', // All assets belong to Zemen Bank
        category,
        type: category,
        supplier: `${category} Supplier ${Math.floor(Math.random() * 5) + 1}`,
        warrantyExpiry: new Date(purchaseDate.getTime() + (1 + Math.random() * 2) * 365 * 24 * 60 * 60 * 1000), // 1-3 years warranty
        depreciableCost: purchasePrice,
        salvageValue,
        usefulLifeMonths,
        depreciationMethod,
        depreciationStartDate: purchaseDate,
      },
    });

    assets.push(asset);
  }

  console.log(`✅ Created ${assets.length} assets`);

  // Create Depreciation History
  console.log('📉 Creating depreciation history...');
  
  for (const asset of assets) {
    const startDate = new Date(asset.purchaseDate);
    const currentDate = new Date();
    const monthsDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 30));
    
    // Create monthly depreciation records
    for (let month = 0; month <= Math.min(monthsDiff, 60); month++) { // Max 5 years of history
      const depreciationDate = new Date(startDate);
      depreciationDate.setMonth(depreciationDate.getMonth() + month);
      
      if (depreciationDate > currentDate) break;

      const monthlyDepreciation = calculateMonthlyDepreciation(
        asset.purchasePrice,
        asset.salvageValue || 0,
        asset.usefulLifeMonths || 60,
        asset.depreciationMethod || 'STRAIGHT_LINE',
        month
      );

      await prisma.depreciation.create({
        data: {
          assetId: asset.id,
          amount: monthlyDepreciation,
          date: depreciationDate,
          depreciationRate: 10, // Default rate
          description: `Monthly depreciation for ${depreciationDate.toLocaleDateString()}`,
          method: asset.depreciationMethod || 'STRAIGHT_LINE',
          salvageValue: asset.salvageValue || 0,
          usefulLife: Math.floor((asset.usefulLifeMonths || 60) / 12),
        },
      });

      // Also create AssetDepreciation records
      await prisma.assetDepreciation.create({
        data: {
          assetId: asset.id,
          amount: monthlyDepreciation,
          date: depreciationDate,
          method: asset.depreciationMethod || 'STRAIGHT_LINE',
          usefulLife: Math.floor((asset.usefulLifeMonths || 60) / 12),
          salvageValue: asset.salvageValue || 0,
          depreciationRate: 10,
          description: `Monthly depreciation calculation`,
        },
      });
    }
  }

  console.log('✅ Created depreciation history');

  // Create Asset Transfers
  console.log('🔄 Creating asset transfers...');

  const transferStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
  const transferReasons = [
    'Department restructuring',
    'Employee relocation',
    'Equipment upgrade',
    'Operational efficiency',
    'Cost optimization',
    'Branch expansion'
  ];

  for (let i = 0; i < 25; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const status = transferStatuses[Math.floor(Math.random() * transferStatuses.length)];
    const reason = transferReasons[Math.floor(Math.random() * transferReasons.length)];

    const transferDate = new Date();
    transferDate.setDate(transferDate.getDate() - Math.floor(Math.random() * 365)); // Last year

    await prisma.transfer.create({
      data: {
        assetId: asset.id,
        reason,
        fromDepartment: departments[Math.floor(Math.random() * departments.length)],
        toDepartment: departments[Math.floor(Math.random() * departments.length)],
        status,
        requesterId: [user1.id, user2.id, user3.id][Math.floor(Math.random() * 3)],
        managerId: [manager1.id, manager2.id][Math.floor(Math.random() * 2)],
        managerReason: status === 'REJECTED' ? 'Asset not suitable for transfer' : null,
        createdAt: transferDate,
      },
    });
  }

  console.log('✅ Created 25 asset transfers');

  // Create Asset Disposals
  console.log('🗑️ Creating asset disposals...');

  const disposalMethods = ['SALE', 'DONATION', 'RECYCLE', 'SCRAP'];
  const disposalStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
  const disposalReasons = [
    'End of useful life',
    'Obsolete technology',
    'Damaged beyond repair',
    'Upgrade to newer model',
    'Cost of maintenance too high',
    'No longer needed'
  ];

  for (let i = 0; i < 15; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const method = disposalMethods[Math.floor(Math.random() * disposalMethods.length)];
    const status = disposalStatuses[Math.floor(Math.random() * disposalStatuses.length)];
    const reason = disposalReasons[Math.floor(Math.random() * disposalReasons.length)];

    const expectedValue = asset.currentValue * (0.1 + Math.random() * 0.4); // 10-50% of current value
    const actualValue = status === 'COMPLETED' ? expectedValue * (0.8 + Math.random() * 0.4) : null;

    const disposalDate = new Date();
    disposalDate.setDate(disposalDate.getDate() - Math.floor(Math.random() * 180)); // Last 6 months

    await prisma.disposal.create({
      data: {
        assetId: asset.id,
        reason,
        method,
        status,
        expectedValue: Math.round(expectedValue * 100) / 100,
        actualValue: actualValue ? Math.round(actualValue * 100) / 100 : null,
        requesterId: [user1.id, user2.id, user3.id][Math.floor(Math.random() * 3)],
        createdAt: disposalDate,
      },
    });
  }

  console.log('✅ Created 15 asset disposals');

  // Create Capital Improvements
  console.log('🔧 Creating capital improvements...');

  const improvementDescriptions = [
    'Hardware upgrade - RAM expansion',
    'Software license upgrade',
    'Security system enhancement',
    'Performance optimization',
    'Capacity expansion',
    'Technology refresh',
    'Compliance upgrade',
    'Energy efficiency improvement'
  ];

  for (let i = 0; i < 30; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const description = improvementDescriptions[Math.floor(Math.random() * improvementDescriptions.length)];

    const improvementDate = new Date(asset.purchaseDate);
    improvementDate.setMonth(improvementDate.getMonth() + Math.floor(Math.random() * 24) + 6); // 6-30 months after purchase

    if (improvementDate > new Date()) continue; // Skip future improvements

    const improvementCost = 100 + Math.random() * 2000; // $100 - $2000

    await prisma.capitalImprovement.create({
      data: {
        assetId: asset.id,
        description,
        improvementDate,
        cost: Math.round(improvementCost * 100) / 100,
        usefulLifeMonths: 12 + Math.floor(Math.random() * 36), // 1-4 years additional life
        depreciationMethod: asset.depreciationMethod,
        notes: `Capital improvement to enhance ${asset.name} functionality`,
      },
    });
  }

  console.log('✅ Created 30 capital improvements');

  // Helper function to calculate monthly depreciation
  function calculateMonthlyDepreciation(purchasePrice, salvageValue, usefulLifeMonths, method, monthNumber) {
    const depreciableAmount = purchasePrice - salvageValue;

    switch (method) {
      case 'STRAIGHT_LINE':
        return depreciableAmount / usefulLifeMonths;

      case 'DECLINING_BALANCE':
        const rate = 2 / (usefulLifeMonths / 12); // Double declining rate
        const remainingValue = purchasePrice * Math.pow(1 - rate / 12, monthNumber);
        return Math.max(0, remainingValue * (rate / 12));

      case 'DOUBLE_DECLINING':
        const doubleRate = 2 / (usefulLifeMonths / 12);
        const remainingValueDD = purchasePrice * Math.pow(1 - doubleRate / 12, monthNumber);
        return Math.max(0, remainingValueDD * (doubleRate / 12));

      default:
        return depreciableAmount / usefulLifeMonths;
    }
  }

  // Create Asset History
  console.log('📋 Creating asset history...');

  const historyFields = ['status', 'location', 'department', 'currentValue', 'depreciationMethod'];
  const historyActions = [
    'Status updated',
    'Location changed',
    'Department transfer',
    'Value reassessment',
    'Depreciation method changed',
    'Maintenance completed',
    'Warranty updated'
  ];

  for (let i = 0; i < 200; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const field = historyFields[Math.floor(Math.random() * historyFields.length)];
    const action = historyActions[Math.floor(Math.random() * historyActions.length)];

    const historyDate = new Date(asset.purchaseDate);
    historyDate.setDate(historyDate.getDate() + Math.floor(Math.random() * 1000)); // Random date after purchase

    if (historyDate > new Date()) continue; // Skip future dates

    let oldValue, newValue;
    switch (field) {
      case 'status':
        oldValue = 'ACTIVE';
        newValue = ['ACTIVE', 'UNDER_MAINTENANCE', 'TRANSFERRED'][Math.floor(Math.random() * 3)];
        break;
      case 'location':
        oldValue = asset.location;
        newValue = locations[Math.floor(Math.random() * locations.length)];
        break;
      case 'department':
        oldValue = asset.department;
        newValue = departments[Math.floor(Math.random() * departments.length)];
        break;
      case 'currentValue':
        oldValue = asset.currentValue.toString();
        newValue = (asset.currentValue * (0.9 + Math.random() * 0.2)).toFixed(2);
        break;
      case 'depreciationMethod':
        oldValue = asset.depreciationMethod;
        newValue = depreciationMethods[Math.floor(Math.random() * depreciationMethods.length)];
        break;
      default:
        oldValue = 'Previous value';
        newValue = 'New value';
    }

    await prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        field,
        oldValue,
        newValue,
        changedAt: historyDate,
        changedBy: [user1.name, user2.name, user3.name, manager1.name, manager2.name][Math.floor(Math.random() * 5)],
      },
    });
  }

  console.log('✅ Created 200 asset history records');

  // Create Linked Assets (Parent-Child relationships)
  console.log('🔗 Creating linked assets...');

  for (let i = 0; i < 20; i++) {
    const parentAsset = assets[Math.floor(Math.random() * assets.length)];
    const childAsset = assets[Math.floor(Math.random() * assets.length)];

    if (parentAsset.id === childAsset.id) continue; // Skip self-linking

    try {
      await prisma.linkedAsset.create({
        data: {
          fromAssetId: parentAsset.id,
          toAssetId: childAsset.id,
        },
      });
    } catch (error) {
      // Skip if relationship already exists
      continue;
    }
  }

  console.log('✅ Created linked asset relationships');

  // Create Documents
  console.log('📄 Creating documents...');

  const documentTypes = ['INVOICE', 'WARRANTY', 'MANUAL', 'MAINTENANCE_RECORD', 'OTHER'];
  const documentUrls = [
    'https://example.com/invoice1.pdf',
    'https://example.com/warranty2.pdf',
    'https://example.com/manual3.pdf',
    'https://example.com/maintenance4.pdf',
    'https://example.com/other5.pdf'
  ];

  for (let i = 0; i < 150; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const docType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
    const url = documentUrls[Math.floor(Math.random() * documentUrls.length)];

    const docDate = new Date(asset.purchaseDate);
    docDate.setDate(docDate.getDate() + Math.floor(Math.random() * 500)); // Random date after purchase

    await prisma.document.create({
      data: {
        assetId: asset.id,
        type: docType,
        url,
        fileName: `${docType.toLowerCase()}_${asset.serialNumber}.pdf`,
        fileSize: 1024 + Math.floor(Math.random() * 5120), // 1-6 KB
        mimeType: 'application/pdf',
        createdAt: docDate,
      },
    });
  }

  console.log('✅ Created 150 documents');

  // Create some notifications for testing
  console.log('🔔 Creating notifications...');

  const notificationTypes = ['info', 'warning', 'success', 'error'];
  const notificationMessages = [
    'Asset transfer approved',
    'Depreciation calculation updated',
    'Maintenance due soon',
    'Asset disposal completed',
    'Capital improvement recorded',
    'Asset audit required'
  ];

  for (let i = 0; i < 50; i++) {
    const user = [user1, user2, user3, manager1, manager2][Math.floor(Math.random() * 5)];
    const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    const message = notificationMessages[Math.floor(Math.random() * notificationMessages.length)];

    await prisma.notification.create({
      data: {
        userId: user.id,
        message,
        type,
        read: Math.random() > 0.3, // 70% read, 30% unread
        meta: {
          assetId: assets[Math.floor(Math.random() * assets.length)].id,
          action: 'asset_update'
        },
      },
    });
  }

  console.log('✅ Created 50 notifications');

  console.log('🎉 Seed completed successfully!');
  console.log(`
📊 Summary:
- Users: 6 (1 Admin, 2 Managers, 3 Users)
- Assets: ${assets.length}
- Depreciation Records: ~${assets.length * 12} (monthly records)
- Transfers: 25
- Disposals: 15
- Capital Improvements: 30
- Asset History: 200 records
- Linked Assets: ~20 relationships
- Documents: 150
- Notifications: 50

🔑 Login Credentials:
- Admin: admin@zemenbank.com / password123
- Manager: john.manager@zemenbank.com / password123
- Manager: sarah.wilson@zemenbank.com / password123
- User: alice.johnson@zemenbank.com / password123
- User: bob.smith@zemenbank.com / password123
- User: carol.davis@zemenbank.com / password123

🚀 You can now test the advanced asset reporting with realistic data!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
