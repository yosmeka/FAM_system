// Test script for monthly book value aggregation
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMonthlyAggregation() {
  console.log('🧪 Testing Monthly Book Value Aggregation...\n');

  try {
    // Test with year filter to get monthly totals
    const response = await fetch(`${BASE_URL}/api/reports/assets?year=2024`);
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    console.log('📊 Response Analysis:');
    console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
    console.log(`  Assets in Response: ${data.assets?.length || 0}`);
    console.log(`  Total Purchase Value: $${(data.stats?.totalPurchaseValue || 0).toLocaleString()}`);
    
    // Check monthly book value totals
    if (data.stats?.monthlyBookValueTotals) {
      console.log('\n📅 Monthly Book Value Totals for 2024:');
      console.log('Month | Total Book Value | % of Purchase');
      console.log('------|------------------|-------------');
      
      for (let m = 1; m <= 12; m++) {
        const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
        const monthValue = data.stats.monthlyBookValueTotals[m] || 0;
        const percentOfPurchase = data.stats.totalPurchaseValue > 0 ? 
          ((monthValue / data.stats.totalPurchaseValue) * 100).toFixed(1) : '0.0';
        
        console.log(`${monthName.padEnd(5)} | $${monthValue.toLocaleString().padStart(15)} | ${percentOfPurchase.padStart(10)}%`);
      }
      
      // Manual validation
      console.log('\n🔍 Manual Validation:');
      if (data.assets && data.assets.length > 0) {
        const assetsWithMonthlyData = data.assets.filter(asset => 
          asset.bookValuesByMonth && Object.keys(asset.bookValuesByMonth).length > 0
        );
        
        console.log(`  Assets with monthly data: ${assetsWithMonthlyData.length}/${data.assets.length}`);
        
        // Check first month manually
        let manualJanTotal = 0;
        let contributingAssets = 0;
        
        assetsWithMonthlyData.forEach(asset => {
          if (asset.bookValuesByMonth[1] !== undefined && asset.bookValuesByMonth[1] !== null) {
            manualJanTotal += asset.bookValuesByMonth[1];
            contributingAssets++;
          }
        });
        
        const apiJanTotal = data.stats.monthlyBookValueTotals[1] || 0;
        const matches = Math.abs(manualJanTotal - apiJanTotal) < 0.01;
        
        console.log(`  January Manual Total: $${manualJanTotal.toLocaleString()}`);
        console.log(`  January API Total: $${apiJanTotal.toLocaleString()}`);
        console.log(`  Totals Match: ${matches ? '✅ Yes' : '❌ No'}`);
        console.log(`  Contributing Assets: ${contributingAssets}`);
        
        // Show sample asset data
        if (assetsWithMonthlyData.length > 0) {
          console.log('\n📋 Sample Asset Data:');
          const sampleAsset = assetsWithMonthlyData[0];
          console.log(`  Asset: ${sampleAsset.itemDescription || sampleAsset.name || 'Unknown'}`);
          console.log(`  Purchase Price: $${(sampleAsset.unitPrice || 0).toLocaleString()}`);
          
          if (sampleAsset.bookValuesByMonth) {
            const monthlyData = Object.entries(sampleAsset.bookValuesByMonth)
              .slice(0, 6)
              .map(([month, value]) => `${month}:$${Number(value).toFixed(0)}`)
              .join(', ');
            console.log(`  Monthly Values: ${monthlyData}...`);
          }
        }
      }
      
    } else {
      console.log('\n❌ No monthly book value totals found');
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testMonthlyAggregation().catch(console.error);
}

module.exports = { testMonthlyAggregation };
