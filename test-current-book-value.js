// Test script for current book value calculation (no year/month filters)
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCurrentBookValue() {
  console.log('🧪 Testing Current Book Value Calculation...\n');

  const testCases = [
    {
      name: 'No Filters - Current Book Values',
      url: '/api/reports/assets',
      description: 'Test current book value calculation when no year/month filters are applied'
    },
    {
      name: 'Category Filter Only - Current Book Values',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test current book value with category filter (no year/month)'
    },
    {
      name: 'Department Filter Only - Current Book Values',
      url: '/api/reports/assets?currentDepartment=IT',
      description: 'Test current book value with department filter (no year/month)'
    },
    {
      name: 'Comparison: No Filter vs Year Filter',
      urls: ['/api/reports/assets', '/api/reports/assets?year=2024'],
      description: 'Compare current book values vs year-filtered book values'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`${'='.repeat(80)}`);

    try {
      if (testCase.urls) {
        // Comparison test
        console.log('\n📊 Comparison Test:');
        
        for (let i = 0; i < testCase.urls.length; i++) {
          const url = testCase.urls[i];
          const label = i === 0 ? 'No Filters' : 'With Year Filter';
          
          console.log(`\n${label} (${url}):`);
          
          const response = await fetch(`${BASE_URL}${url}`);
          if (!response.ok) {
            console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            continue;
          }

          const data = await response.json();
          
          console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
          console.log(`  Total Book Value: $${(data.stats?.totalBookValue || 0).toLocaleString()}`);
          
          if (data.assets && data.assets.length > 0) {
            const sampleAsset = data.assets[0];
            console.log(`  Sample Asset: ${sampleAsset.itemDescription || sampleAsset.name || 'Unknown'}`);
            console.log(`    Purchase Price: $${(sampleAsset.unitPrice || 0).toLocaleString()}`);
            console.log(`    Current Value: $${(sampleAsset.currentValue || 0).toLocaleString()}`);
            
            if (i === 0) {
              // No filters - should have currentBookValue
              console.log(`    Current Book Value: $${(sampleAsset.currentBookValue || 0).toLocaleString()}`);
              console.log(`    Has currentBookValue field: ${sampleAsset.currentBookValue !== undefined ? '✅' : '❌'}`);
            } else {
              // With year filter - should have bookValuesByMonth
              console.log(`    Has bookValuesByMonth: ${sampleAsset.bookValuesByMonth ? '✅' : '❌'}`);
              if (sampleAsset.bookValuesByMonth) {
                const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
                console.log(`    Monthly data points: ${monthCount}`);
              }
            }
          }
        }
        
      } else {
        // Single test
        const response = await fetch(`${BASE_URL}${testCase.url}`);
        
        if (!response.ok) {
          console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        
        console.log('\n📊 Response Analysis:');
        console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
        console.log(`  Assets in Response: ${data.assets?.length || 0}`);
        console.log(`  Total Book Value: $${(data.stats?.totalBookValue || 0).toLocaleString()}`);
        console.log(`  Total Purchase Value: $${(data.stats?.totalPurchaseValue || 0).toLocaleString()}`);
        
        // Check individual assets for currentBookValue field
        if (data.assets && data.assets.length > 0) {
          console.log('\n📋 Asset Book Value Analysis:');
          
          const assetsWithCurrentBookValue = data.assets.filter(asset => asset.currentBookValue !== undefined);
          console.log(`  Assets with currentBookValue field: ${assetsWithCurrentBookValue.length}/${data.assets.length}`);
          
          if (assetsWithCurrentBookValue.length > 0) {
            console.log('\n  Sample Assets:');
            
            assetsWithCurrentBookValue.slice(0, 3).forEach((asset, index) => {
              const purchasePrice = asset.unitPrice || 0;
              const currentBookValue = asset.currentBookValue || 0;
              const currentValue = asset.currentValue || 0;
              const depreciationRate = purchasePrice > 0 ? ((purchasePrice - currentBookValue) / purchasePrice * 100) : 0;
              
              console.log(`    Asset ${index + 1}: ${asset.itemDescription || asset.name || 'Unknown'}`);
              console.log(`      Purchase Price: $${purchasePrice.toLocaleString()}`);
              console.log(`      Current Book Value: $${currentBookValue.toLocaleString()}`);
              console.log(`      Current Value (old): $${currentValue.toLocaleString()}`);
              console.log(`      Depreciation Rate: ${depreciationRate.toFixed(1)}%`);
              console.log(`      SIV Date: ${asset.sivDate || 'N/A'}`);
              console.log(`      Useful Life: ${asset.usefulLifeYears || 'N/A'} years`);
              console.log(`      Method: ${asset.depreciationMethod || 'N/A'}`);
              
              // Validate book value is reasonable
              const isReasonable = currentBookValue >= 0 && currentBookValue <= purchasePrice;
              console.log(`      Book Value Reasonable: ${isReasonable ? '✅' : '❌'}`);
              
              if (!isReasonable) {
                console.log(`        ⚠️ Book value seems incorrect!`);
              }
            });
            
            // Calculate manual total and compare with API total
            const manualTotal = assetsWithCurrentBookValue.reduce((sum, asset) => sum + (asset.currentBookValue || 0), 0);
            const apiTotal = data.stats.totalBookValue || 0;
            const totalsMatch = Math.abs(manualTotal - apiTotal) < 0.01;
            
            console.log('\n  📊 Total Validation:');
            console.log(`    Manual sum of currentBookValue: $${manualTotal.toLocaleString()}`);
            console.log(`    API totalBookValue: $${apiTotal.toLocaleString()}`);
            console.log(`    Totals match: ${totalsMatch ? '✅' : '❌'}`);
            
            if (!totalsMatch) {
              console.log(`    Difference: $${Math.abs(manualTotal - apiTotal).toLocaleString()}`);
            }
          }
          
          // Check for assets without currentBookValue
          const assetsWithoutCurrentBookValue = data.assets.filter(asset => asset.currentBookValue === undefined);
          if (assetsWithoutCurrentBookValue.length > 0) {
            console.log(`\n  ⚠️ Assets missing currentBookValue: ${assetsWithoutCurrentBookValue.length}`);
            
            assetsWithoutCurrentBookValue.slice(0, 2).forEach((asset, index) => {
              console.log(`    Asset ${index + 1}: ${asset.itemDescription || asset.name || 'Unknown'}`);
              console.log(`      SIV Date: ${asset.sivDate || 'Missing'}`);
              console.log(`      Unit Price: $${(asset.unitPrice || 0).toLocaleString()}`);
              console.log(`      Depreciation Method: ${asset.depreciationMethod || 'Missing'}`);
            });
          }
        }
      }
      
      console.log('\n✅ Test completed');
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Current book value calculation tests completed!');
  console.log('='.repeat(80));
}

// Run the tests
if (require.main === module) {
  testCurrentBookValue().catch(console.error);
}

module.exports = { testCurrentBookValue };
