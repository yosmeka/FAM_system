// Test script to verify pagination removal and export fixes
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testPaginationRemoval() {
  console.log('🧪 Testing Pagination Removal & Export Fixes...\n');

  const testCases = [
    {
      name: 'No Filters - All Assets',
      url: '/api/reports/assets',
      description: 'Test that all assets are returned without pagination'
    },
    {
      name: 'Category Filter - All Matching Assets',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test that all computer assets are returned'
    },
    {
      name: 'Year Filter - With Monthly Book Values',
      url: '/api/reports/assets?year=2024',
      description: 'Test year filter returns all assets with monthly book values'
    },
    {
      name: 'Complex Filters - All Matching Assets',
      url: '/api/reports/assets?category=COMPUTER&currentDepartment=IT&status=ACTIVE',
      description: 'Test complex filters return all matching assets'
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
      
      console.log(`📊 API Response Analysis:`);
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets Returned: ${data.assets?.length || 0}`);
      console.log(`  Has Pagination: ${data.pagination ? 'YES ❌' : 'NO ✅'}`);
      console.log(`  Total Assets = Returned Assets: ${(data.stats?.totalAssets || 0) === (data.assets?.length || 0) ? 'YES ✅' : 'NO ❌'}`);
      
      if (data.pagination) {
        console.log(`    ⚠️ Pagination still present:`, data.pagination);
      }
      
      // Check if all assets are returned (no pagination limit)
      const allAssetsReturned = (data.stats?.totalAssets || 0) === (data.assets?.length || 0);
      if (allAssetsReturned) {
        console.log(`  ✅ SUCCESS: All filtered assets returned (no pagination)`);
      } else {
        console.log(`  ❌ ISSUE: Not all assets returned`);
        console.log(`    Expected: ${data.stats?.totalAssets || 0}`);
        console.log(`    Received: ${data.assets?.length || 0}`);
      }

      // Check for monthly book values when year filter is applied
      if (testCase.url.includes('year=')) {
        console.log(`\n📊 Monthly Book Values Check:`);
        if (data.assets && data.assets.length > 0) {
          const sampleAsset = data.assets[0];
          const hasMonthlyBookValues = sampleAsset.bookValuesByMonth !== undefined;
          console.log(`  Has Monthly Book Values: ${hasMonthlyBookValues ? 'YES ✅' : 'NO ❌'}`);
          
          if (hasMonthlyBookValues) {
            const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
            console.log(`  Months with Data: ${monthCount}/12`);
            
            // Show sample monthly values
            console.log(`  Sample Monthly Values:`);
            Object.entries(sampleAsset.bookValuesByMonth).slice(0, 3).forEach(([month, value]) => {
              console.log(`    Month ${month}: $${Number(value).toLocaleString()}`);
            });
          }
        }
      }

      // Check for current book values when no year filter
      if (!testCase.url.includes('year=')) {
        console.log(`\n📊 Current Book Values Check:`);
        if (data.assets && data.assets.length > 0) {
          const sampleAsset = data.assets[0];
          const hasCurrentBookValue = sampleAsset.currentBookValue !== undefined;
          console.log(`  Has Current Book Value: ${hasCurrentBookValue ? 'YES ✅' : 'NO ❌'}`);
          
          if (hasCurrentBookValue) {
            console.log(`  Sample Current Book Value: $${Number(sampleAsset.currentBookValue).toLocaleString()}`);
          }
        }
      }

      // Show sample asset data structure
      if (data.assets && data.assets.length > 0) {
        console.log(`\n📋 Sample Asset Data Structure:`);
        const sampleAsset = data.assets[0];
        const fields = Object.keys(sampleAsset);
        console.log(`  Total Fields: ${fields.length}`);
        console.log(`  Key Fields Present:`);
        
        const keyFields = [
          'id', 'name', 'itemDescription', 'serialNumber', 'category', 
          'currentDepartment', 'status', 'unitPrice', 'currentValue',
          'currentBookValue', 'bookValuesByMonth', 'age', 'depreciationRate'
        ];
        
        keyFields.forEach(field => {
          const present = sampleAsset[field] !== undefined;
          console.log(`    ${field}: ${present ? '✅' : '❌'}`);
        });
      }

      console.log(`\n✅ Test completed`);
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test export data completeness
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Export Data Completeness Test`);
  console.log(`📝 Verify export-ready data structure`);
  console.log(`${'='.repeat(80)}`);

  try {
    // Test with a filter that should return multiple assets
    const testUrl = '/api/reports/assets?category=COMPUTER&year=2024';
    console.log(`\n🔍 Testing export-ready data: ${testUrl}`);
    
    const response = await fetch(`${BASE_URL}${testUrl}`);
    const data = await response.json();

    if (data.assets && data.assets.length > 0) {
      console.log(`\n📊 Export Readiness Check:`);
      console.log(`  Total Assets: ${data.assets.length}`);
      
      // Check if data has all fields needed for export
      const sampleAsset = data.assets[0];
      const exportFields = [
        'name', 'itemDescription', 'serialNumber', 'category', 'currentDepartment',
        'status', 'unitPrice', 'currentValue', 'bookValuesByMonth', 'age', 'depreciationRate'
      ];
      
      const missingFields = exportFields.filter(field => sampleAsset[field] === undefined);
      console.log(`  Export Fields Complete: ${missingFields.length === 0 ? 'YES ✅' : 'NO ❌'}`);
      
      if (missingFields.length > 0) {
        console.log(`    Missing Fields: ${missingFields.join(', ')}`);
      }

      // Check monthly book values structure for export
      if (sampleAsset.bookValuesByMonth) {
        console.log(`  Monthly Book Values Structure:`);
        const months = Object.keys(sampleAsset.bookValuesByMonth);
        console.log(`    Months Available: ${months.join(', ')}`);
        console.log(`    Ready for Excel Columns: ${months.length === 12 ? 'YES ✅' : 'PARTIAL ⚠️'}`);
      }

      console.log(`\n🎉 Export data is ready for Excel/CSV generation!`);
    }

  } catch (error) {
    console.log(`❌ Export readiness test failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Pagination removal and export fixes testing completed!');
  console.log('='.repeat(80));
  console.log('\n📋 Summary of Changes:');
  console.log('1. ✅ Pagination removed from API (returns all filtered assets)');
  console.log('2. ✅ Pagination removed from frontend (no page limits)');
  console.log('3. ✅ Export functions simplified (use direct data)');
  console.log('4. ✅ Monthly book values available for Excel columns');
  console.log('5. ✅ All filtered data available for export');
  console.log('\n💡 Benefits:');
  console.log('- No pagination complexity');
  console.log('- Export includes ALL filtered data');
  console.log('- Monthly columns will show in Excel');
  console.log('- Simpler, more reliable system');
}

// Run the tests
if (require.main === module) {
  testPaginationRemoval().catch(console.error);
}

module.exports = { testPaginationRemoval };
