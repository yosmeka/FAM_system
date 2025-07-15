const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDepreciationErrors() {
  try {
    console.log('🔍 Debugging depreciation calculation errors...');
    
    // Get the specific assets mentioned in the error
    const problematicAssetIds = [
      'cmd31enpw0d4kwik8uefydfwn',
      'cmd31ent50d59wik8z3fzn03p', 
      'cmd31enyc0d60wik8ccth20df'
    ];

    console.log('Checking specific assets from error logs...');
    
    for (const assetId of problematicAssetIds) {
      try {
        const asset = await prisma.asset.findUnique({
          where: { id: assetId },
          select: {
            id: true,
            name: true,
            serialNumber: true,
            unitPrice: true,
            depreciableCost: true,
            salvageValue: true,
            usefulLifeYears: true,
            depreciationMethod: true,
            // depreciationStartDate removed - using sivDate only
            sivDate: true,
            currentValue: true
          }
        });

        if (asset) {
          console.log(`\n📋 Asset: ${asset.name} (${asset.serialNumber})`);
          console.log(`   ID: ${asset.id}`);
          console.log(`   Unit Price: ${asset.unitPrice}`);
          console.log(`   Depreciable Cost: ${asset.depreciableCost}`);
          console.log(`   Salvage Value: ${asset.salvageValue}`);
          console.log(`   Useful Life Years: ${asset.usefulLifeYears}`);
          console.log(`   Depreciation Method: ${asset.depreciationMethod}`);
          console.log(`   SIV Date (depreciation start): ${asset.sivDate}`);
          console.log(`   SIV Date: ${asset.sivDate}`);
          console.log(`   Current Value: ${asset.currentValue}`);

          // Check what would be used for depreciation calculation
          const depreciableCost = asset.depreciableCost || asset.unitPrice;
          const salvageValue = asset.salvageValue || 0;
          const startDate = asset.sivDate; // Single source for depreciation start

          console.log(`\n   🧮 Calculated values for depreciation:`);
          console.log(`   Depreciable Cost (used): ${depreciableCost}`);
          console.log(`   Salvage Value (used): ${salvageValue}`);
          console.log(`   Start Date (used): ${startDate}`);

          // Check for issues
          const issues = [];
          if (!depreciableCost || depreciableCost <= 0) {
            issues.push(`❌ Invalid depreciable cost: ${depreciableCost}`);
          }
          if (salvageValue < 0) {
            issues.push(`❌ Negative salvage value: ${salvageValue}`);
          }
          if (salvageValue >= depreciableCost) {
            issues.push(`❌ Salvage value (${salvageValue}) >= depreciable cost (${depreciableCost})`);
          }
          if (!startDate) {
            issues.push(`❌ No valid start date`);
          }

          if (issues.length > 0) {
            console.log(`\n   🚨 Issues found:`);
            issues.forEach(issue => console.log(`   ${issue}`));
          } else {
            console.log(`\n   ✅ No obvious issues found`);
          }

        } else {
          console.log(`\n❌ Asset ${assetId} not found in database`);
        }
      } catch (error) {
        console.error(`❌ Error checking asset ${assetId}:`, error.message);
      }
    }

    // Also check for any assets with problematic values
    console.log('\n🔍 Checking all assets for potential depreciation issues...');
    
    const allAssets = await prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        serialNumber: true,
        unitPrice: true,
        depreciableCost: true,
        salvageValue: true,
        usefulLifeYears: true,
        // depreciationStartDate removed - using sivDate only
        sivDate: true
      }
    });

    let issueCount = 0;
    
    for (const asset of allAssets) {
      const depreciableCost = asset.depreciableCost || asset.unitPrice;
      const salvageValue = asset.salvageValue || 0;
      const startDate = asset.sivDate; // Single source for depreciation start

      const hasIssues = 
        !depreciableCost || 
        depreciableCost <= 0 || 
        salvageValue < 0 || 
        salvageValue >= depreciableCost || 
        !startDate;

      if (hasIssues) {
        issueCount++;
        console.log(`\n⚠️  Issue with asset: ${asset.name} (${asset.serialNumber})`);
        console.log(`   ID: ${asset.id}`);
        console.log(`   Depreciable Cost: ${depreciableCost}`);
        console.log(`   Salvage Value: ${salvageValue}`);
        console.log(`   Start Date: ${startDate}`);
      }
    }

    console.log(`\n📊 Summary: Found ${issueCount} assets with potential depreciation calculation issues out of ${allAssets.length} total assets.`);

    if (issueCount > 0) {
      console.log('\n🔧 To fix these issues, you can:');
      console.log('1. Update assets with zero/null unit prices');
      console.log('2. Fix salvage values that are >= unit price');
      console.log('3. Set valid SIV dates for assets missing them');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugDepreciationErrors();
