// Test script specifically for monthly book value aggregation
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMonthlyBookValues() {
  console.log('🧪 Testing Monthly Book Value Aggregation...\n');

  const testCases = [
    {
      name: 'Year 2024 - All Assets',
      url: '/api/reports/assets?year=2024',
      description: 'Test monthly book value totals for all assets in 2024'
    },
    {
      name: 'Year 2024 with Category Filter',
      url: '/api/reports/assets?year=2024&category=COMPUTER',
      description: 'Test monthly book value totals for computer assets in 2024'
    },
    {
      name: 'Year 2024 with Department Filter',
      url: '/api/reports/assets?year=2024&currentDepartment=IT',
      description: 'Test monthly book value totals for IT department assets in 2024'
    },
    {
      name: 'Year 2023 - Previous Year',
      url: '/api/reports/assets?year=2023',
      description: 'Test monthly book value totals for all assets in 2023'
    },
    {
      name: 'Year 2024 with Depreciation Filter',
      url: '/api/reports/assets?year=2024&depreciationStatus=active',
      description: 'Test monthly book value totals for actively depreciating assets in 2024'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🌐 ${testCase.url}`);
    console.log(`${'='.repeat(80)}`);

    try {
      const response = await fetch(`${BASE_URL}${testCase.url}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      console.log('\n📊 Basic Response Info:');
      console.log(`  Total Assets Found: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets in Response: ${data.assets?.length || 0}`);
      console.log(`  Total Purchase Value: $${(data.stats?.totalPurchaseValue || 0).toLocaleString()}`);
      console.log(`  Total Current Book Value: $${(data.stats?.totalCurrentBookValue || 0).toLocaleString()}`);
      
      // Check monthly book value totals
      if (data.stats?.monthlyBookValueTotals) {
        console.log('\n📅 Monthly Book Value Totals:');
        console.log('Month | Total Book Value | Assets Contributing | % of Purchase Value');
        console.log('------|------------------|--------------------|-----------------');
        
        let totalAcrossMonths = 0;
        let monthsWithData = 0;
        
        for (let m = 1; m <= 12; m++) {
          const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
          const monthValue = data.stats.monthlyBookValueTotals[m] || 0;
          const percentOfPurchase = data.stats.totalPurchaseValue > 0 ? 
            ((monthValue / data.stats.totalPurchaseValue) * 100).toFixed(1) : '0.0';
          
          // Count assets that have data for this month
          let assetsWithData = 0;
          if (data.assets) {
            assetsWithData = data.assets.filter(asset => 
              asset.bookValuesByMonth && 
              asset.bookValuesByMonth[m] !== undefined && 
              asset.bookValuesByMonth[m] !== null
            ).length;
          }
          
          console.log(`${monthName.padEnd(5)} | $${monthValue.toLocaleString().padStart(15)} | ${assetsWithData.toString().padStart(18)} | ${percentOfPurchase.padStart(14)}%`);
          
          if (monthValue > 0) {
            totalAcrossMonths += monthValue;
            monthsWithData++;
          }
        }
        
        console.log('\n📈 Monthly Analysis:');
        console.log(`  Months with data: ${monthsWithData}/12`);
        console.log(`  Average monthly book value: $${monthsWithData > 0 ? (totalAcrossMonths / monthsWithData).toLocaleString() : '0'}`);
        console.log(`  Total across all months: $${totalAcrossMonths.toLocaleString()}`);
        console.log(`  Expected total (12 × current): $${((data.stats.totalCurrentBookValue || 0) * 12).toLocaleString()}`);
        
        // Validate monthly totals by manually calculating
        console.log('\n🔍 Manual Validation:');
        if (data.assets && data.assets.length > 0) {
          const assetsWithMonthlyData = data.assets.filter(asset => 
            asset.bookValuesByMonth && Object.keys(asset.bookValuesByMonth).length > 0
          );
          
          console.log(`  Assets with monthly data: ${assetsWithMonthlyData.length}/${data.assets.length}`);
          
          if (assetsWithMonthlyData.length > 0) {
            // Manually calculate totals for first 3 months
            for (let m = 1; m <= 3; m++) {
              let manualTotal = 0;
              let contributingAssets = 0;
              
              assetsWithMonthlyData.forEach(asset => {
                if (asset.bookValuesByMonth[m] !== undefined && asset.bookValuesByMonth[m] !== null) {
                  manualTotal += asset.bookValuesByMonth[m];
                  contributingAssets++;
                }
              });
              
              const apiTotal = data.stats.monthlyBookValueTotals[m] || 0;
              const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
              const matches = Math.abs(manualTotal - apiTotal) < 0.01;
              
              console.log(`  ${monthName}: Manual=$${manualTotal.toLocaleString()}, API=$${apiTotal.toLocaleString()}, Match=${matches ? '✅' : '❌'} (${contributingAssets} assets)`);
            }
          }
          
          // Show sample asset data
          console.log('\n📋 Sample Asset Monthly Data:');
          const sampleAssets = assetsWithMonthlyData.slice(0, 2);
          sampleAssets.forEach((asset, index) => {
            console.log(`  Asset ${index + 1}: ${asset.itemDescription || asset.name || 'Unknown'}`);
            console.log(`    Purchase Price: $${(asset.unitPrice || 0).toLocaleString()}`);
            console.log(`    Depreciation Method: ${asset.depreciationMethod || 'Unknown'}`);
            console.log(`    Useful Life: ${asset.usefulLifeYears || 'Unknown'} years`);
            
            if (asset.bookValuesByMonth) {
              const monthlyData = Object.entries(asset.bookValuesByMonth)
                .slice(0, 6)
                .map(([month, value]) => `${month}:$${Number(value).toFixed(0)}`)
                .join(', ');
              console.log(`    Monthly Book Values: ${monthlyData}...`);
            }
          });
        }
        
      } else {
        console.log('\n❌ No monthly book value totals found in response');
        console.log('   This might indicate an issue with the calculation');
      }
      
      // Check for any errors or warnings in the response
      if (data.error) {
        console.log(`\n❌ API Error: ${data.error}`);
      }
      
      console.log('\n✅ Test completed');
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Monthly book value aggregation tests completed!');
  console.log('='.repeat(80));
}

// Run the tests
if (require.main === module) {
  testMonthlyBookValues().catch(console.error);
}

module.exports = { testMonthlyBookValues };
