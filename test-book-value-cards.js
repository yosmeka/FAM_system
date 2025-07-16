// Test script for book value card functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testBookValueCards() {
  console.log('🧪 Testing Book Value Cards Functionality...\n');

  const testCases = [
    {
      name: 'No Year/Month Filter - Current Book Values',
      url: '/api/reports/assets',
      description: 'Should show current book values without year/month filters',
      expectedBehavior: 'totalBookValue should equal totalCurrentBookValue'
    },
    {
      name: 'Year Only Filter - Monthly Book Values',
      url: '/api/reports/assets?year=2024',
      description: 'Should show monthly book value totals for 2024',
      expectedBehavior: 'monthlyBookValueTotals should have 12 months of data'
    },
    {
      name: 'Year + Month Filter - Specific Month',
      url: '/api/reports/assets?year=2024&month=06',
      description: 'Should show book value total for June 2024 only',
      expectedBehavior: 'totalBookValue should be sum of all assets for June 2024'
    },
    {
      name: 'Year + Month Filter - Different Month',
      url: '/api/reports/assets?year=2024&month=12',
      description: 'Should show book value total for December 2024 only',
      expectedBehavior: 'totalBookValue should be sum of all assets for December 2024'
    },
    {
      name: 'Previous Year Filter',
      url: '/api/reports/assets?year=2023',
      description: 'Should show monthly book value totals for 2023',
      expectedBehavior: 'monthlyBookValueTotals should have 12 months of data for 2023'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🎯 Expected: ${testCase.expectedBehavior}`);
    console.log(`🌐 ${testCase.url}`);
    console.log(`${'='.repeat(70)}`);

    try {
      const response = await fetch(`${BASE_URL}${testCase.url}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      // Extract URL parameters
      const urlParams = new URLSearchParams(testCase.url.split('?')[1] || '');
      const year = urlParams.get('year');
      const month = urlParams.get('month');
      
      console.log('\n📊 Book Value Analysis:');
      console.log(`  Filter Applied: Year=${year || 'None'}, Month=${month || 'None'}`);
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets in Response: ${data.assets?.length || 0}`);
      
      // Check book value calculations
      if (data.stats) {
        console.log('\n💰 Book Value Metrics:');
        console.log(`  Total Book Value: $${(data.stats.totalBookValue || 0).toLocaleString()}`);
        console.log(`  Total Current Book Value: $${(data.stats.totalCurrentBookValue || 0).toLocaleString()}`);
        console.log(`  Total Purchase Value: $${(data.stats.totalPurchaseValue || 0).toLocaleString()}`);
        console.log(`  Total Accumulated Depreciation: $${(data.stats.totalAccumulatedDepreciation || 0).toLocaleString()}`);
        
        // Analyze based on filter type
        if (year && month) {
          console.log(`\n📅 Specific Month Analysis (${month}/${year}):`);
          console.log(`  Book Value for ${month}/${year}: $${(data.stats.totalBookValue || 0).toLocaleString()}`);
          
          // Check if individual assets have book values
          if (data.assets && data.assets.length > 0) {
            const assetsWithBookValue = data.assets.filter(asset => asset.bookValue !== undefined && asset.bookValue !== null);
            console.log(`  Assets with book value data: ${assetsWithBookValue.length}`);
            
            if (assetsWithBookValue.length > 0) {
              const manualSum = assetsWithBookValue.reduce((sum, asset) => sum + (asset.bookValue || 0), 0);
              console.log(`  Manual sum of asset book values: $${manualSum.toLocaleString()}`);
              console.log(`  Matches API total: ${Math.abs(manualSum - (data.stats.totalBookValue || 0)) < 0.01 ? '✅ Yes' : '❌ No'}`);
            }
          }
          
        } else if (year && !month) {
          console.log(`\n📅 Yearly Analysis (${year}):`);
          
          if (data.stats.monthlyBookValueTotals) {
            console.log(`  Monthly book value totals available: ✅ Yes`);
            
            // Show each month's total
            for (let m = 1; m <= 12; m++) {
              const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
              const monthValue = data.stats.monthlyBookValueTotals[m] || 0;
              console.log(`    ${monthName}: $${monthValue.toLocaleString()}`);
            }
            
            // Calculate average
            const monthlyValues = Object.values(data.stats.monthlyBookValueTotals);
            const totalMonthly = monthlyValues.reduce((sum, val) => sum + (val || 0), 0);
            const averageMonthly = totalMonthly / 12;
            console.log(`  Average monthly book value: $${averageMonthly.toLocaleString()}`);
            
          } else {
            console.log(`  Monthly book value totals available: ❌ No`);
          }
          
          // Check if individual assets have monthly book values
          if (data.assets && data.assets.length > 0) {
            const assetsWithMonthlyData = data.assets.filter(asset => asset.bookValuesByMonth && Object.keys(asset.bookValuesByMonth).length > 0);
            console.log(`  Assets with monthly book value data: ${assetsWithMonthlyData.length}`);
            
            if (assetsWithMonthlyData.length > 0) {
              console.log(`  Sample asset monthly data:`);
              const sampleAsset = assetsWithMonthlyData[0];
              console.log(`    Asset: ${sampleAsset.itemDescription || sampleAsset.name || 'Unknown'}`);
              const monthlyData = Object.entries(sampleAsset.bookValuesByMonth || {})
                .slice(0, 3)
                .map(([month, value]) => `${month}: $${Number(value).toLocaleString()}`)
                .join(', ');
              console.log(`    Sample months: ${monthlyData}...`);
            }
          }
          
        } else {
          console.log(`\n📅 No Year/Month Filter:`);
          console.log(`  Using current book values`);
          console.log(`  Total matches current: ${Math.abs((data.stats.totalBookValue || 0) - (data.stats.totalCurrentBookValue || 0)) < 0.01 ? '✅ Yes' : '❌ No'}`);
        }
        
        // Validation checks
        console.log('\n✅ Validation Checks:');
        
        // Check if book value is reasonable compared to purchase value
        const bookValueRatio = data.stats.totalPurchaseValue > 0 ? 
          (data.stats.totalBookValue / data.stats.totalPurchaseValue) * 100 : 0;
        console.log(`  Book value is ${bookValueRatio.toFixed(1)}% of purchase value`);
        console.log(`  Ratio seems reasonable: ${bookValueRatio >= 0 && bookValueRatio <= 100 ? '✅ Yes' : '❌ No'}`);
        
        // Check if accumulated depreciation + book value = purchase value
        const calculatedPurchaseValue = (data.stats.totalBookValue || 0) + (data.stats.totalAccumulatedDepreciation || 0);
        const purchaseValueMatch = Math.abs(calculatedPurchaseValue - (data.stats.totalPurchaseValue || 0)) < 1; // Allow $1 rounding difference
        console.log(`  Book Value + Depreciation = Purchase Value: ${purchaseValueMatch ? '✅ Yes' : '❌ No'}`);
        console.log(`    Calculated: $${calculatedPurchaseValue.toLocaleString()}`);
        console.log(`    Actual: $${(data.stats.totalPurchaseValue || 0).toLocaleString()}`);
      }
      
      console.log('\n✅ Test completed successfully');
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 All book value card tests completed!');
  console.log('='.repeat(70));
}

// Run the tests
if (require.main === module) {
  testBookValueCards().catch(console.error);
}

module.exports = { testBookValueCards };
