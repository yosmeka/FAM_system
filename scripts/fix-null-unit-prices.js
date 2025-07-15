const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNullUnitPrices() {
  try {
    console.log('🔍 Checking for assets with null or zero unit prices...');
    
    // Find assets with null or zero unit prices
    const problematicAssets = await prisma.asset.findMany({
      where: {
        OR: [
          { unitPrice: null },
          { unitPrice: 0 },
          { unitPrice: { lte: 0 } }
        ]
      },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        unitPrice: true,
        currentValue: true
      }
    });

    console.log(`Found ${problematicAssets.length} assets with problematic unit prices:`);
    
    if (problematicAssets.length === 0) {
      console.log('✅ No problematic assets found. All assets have valid unit prices.');
      return;
    }

    // Display problematic assets
    problematicAssets.forEach(asset => {
      console.log(`- ${asset.name} (${asset.serialNumber}): unitPrice = ${asset.unitPrice}, currentValue = ${asset.currentValue}`);
    });

    console.log('\n🔧 Fixing assets...');

    let fixedCount = 0;
    let skippedCount = 0;

    for (const asset of problematicAssets) {
      try {
        let newUnitPrice = null;

        // Try to use currentValue if it's valid
        if (asset.currentValue && asset.currentValue > 0) {
          newUnitPrice = asset.currentValue;
        } else {
          // Set a default minimum value of $1 to prevent depreciation calculation errors
          newUnitPrice = 1.00;
          console.log(`⚠️  Asset ${asset.name} (${asset.serialNumber}) has no valid price data. Setting to $1.00`);
        }

        // Update the asset
        await prisma.asset.update({
          where: { id: asset.id },
          data: { 
            unitPrice: newUnitPrice,
            // Also update currentValue if it was null/zero
            ...((!asset.currentValue || asset.currentValue <= 0) && { currentValue: newUnitPrice })
          }
        });

        console.log(`✅ Fixed ${asset.name} (${asset.serialNumber}): unitPrice set to $${newUnitPrice}`);
        fixedCount++;

      } catch (error) {
        console.error(`❌ Failed to fix asset ${asset.id}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Fixed: ${fixedCount} assets`);
    console.log(`- Skipped: ${skippedCount} assets`);
    console.log(`- Total processed: ${problematicAssets.length} assets`);

    if (fixedCount > 0) {
      console.log('\n✅ Database fix completed! The reports page should now work properly.');
    }

  } catch (error) {
    console.error('❌ Error during database fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixNullUnitPrices();
