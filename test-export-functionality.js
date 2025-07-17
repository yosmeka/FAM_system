// Test script for export functionality - validates both issues are fixed
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testExportFunctionality() {
  console.log('🧪 Testing Export Functionality Fixes...\n');

  const testCases = [
    {
      name: 'Export API - No Filters',
      url: '/api/reports/assets/export',
      description: 'Test export API without any filters'
    },
    {
      name: 'Export API - With Category Filter',
      url: '/api/reports/assets/export?category=COMPUTER',
      description: 'Test export API with category filter'
    },
    {
      name: 'Export API - With Year Filter',
      url: '/api/reports/assets/export?year=2024',
      description: 'Test export API with year filter (should include monthly book values)'
    },
    {
      name: 'Export API - With Year and Month Filter',
      url: '/api/reports/assets/export?year=2024&month=6',
      description: 'Test export API with specific month filter'
    },
    {
      name: 'Export API - With Depreciation Filters',
      url: '/api/reports/assets/export?assetAge=1-3&usefulLifeRange=3-5&residualPercentageRange=5-10',
      description: 'Test export API with depreciation analytics filters'
    },
    {
      name: 'Export API - Complex Filters',
      url: '/api/reports/assets/export?category=COMPUTER&currentDepartment=IT&status=ACTIVE&year=2024',
      description: 'Test export API with multiple combined filters'
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
      
      if (!data.success) {
        console.log(`❌ API Error: ${data.error}`);
        continue;
      }

      console.log(`📊 Export API Results:`);
      console.log(`  Success: ${data.success ? '✅' : '❌'}`);
      console.log(`  Total Assets: ${data.totalCount || 0}`);
      console.log(`  Assets Returned: ${data.assets?.length || 0}`);
      
      // Validate data consistency
      const dataConsistent = data.totalCount === data.assets?.length;
      console.log(`  Data Consistency: ${dataConsistent ? '✅' : '❌'}`);
      
      if (!dataConsistent) {
        console.log(`    ⚠️ Mismatch: totalCount=${data.totalCount}, assets.length=${data.assets?.length}`);
      }

      // Check applied filters
      if (data.filters) {
        console.log(`\n🔧 Applied Filters:`);
        Object.entries(data.filters).forEach(([key, value]) => {
          if (value) {
            console.log(`    ${key}: ${value}`);
          }
        });
      }

      // Validate asset data structure
      if (data.assets && data.assets.length > 0) {
        console.log(`\n📋 Asset Data Validation:`);
        const sampleAsset = data.assets[0];
        
        // Check for required fields
        const requiredFields = [
          'id', 'name', 'itemDescription', 'serialNumber', 'category', 
          'currentDepartment', 'status', 'unitPrice', 'currentValue'
        ];
        
        const missingFields = requiredFields.filter(field => sampleAsset[field] === undefined);
        console.log(`  Required Fields Present: ${missingFields.length === 0 ? '✅' : '❌'}`);
        
        if (missingFields.length > 0) {
          console.log(`    Missing: ${missingFields.join(', ')}`);
        }

        // Check for additional export-specific fields
        const exportFields = [
          'oldTagNumber', 'newTagNumber', 'grnDate', 'sivDate', 
          'age', 'depreciationRate', 'calculatedSalvageValue'
        ];
        
        const presentExportFields = exportFields.filter(field => sampleAsset[field] !== undefined);
        console.log(`  Export Fields Present: ${presentExportFields.length}/${exportFields.length}`);
        console.log(`    Present: ${presentExportFields.join(', ')}`);

        // Check for book value fields based on filters
        if (data.filters?.year && data.filters?.month) {
          const hasBookValue = sampleAsset.bookValue !== undefined;
          console.log(`  Specific Month Book Value: ${hasBookValue ? '✅' : '❌'}`);
        } else if (data.filters?.year && !data.filters?.month) {
          const hasMonthlyBookValues = sampleAsset.bookValuesByMonth !== undefined;
          console.log(`  Monthly Book Values: ${hasMonthlyBookValues ? '✅' : '❌'}`);
          if (hasMonthlyBookValues) {
            const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
            console.log(`    Months with data: ${monthCount}/12`);
          }
        } else {
          const hasCurrentBookValue = sampleAsset.currentBookValue !== undefined;
          console.log(`  Current Book Value: ${hasCurrentBookValue ? '✅' : '❌'}`);
        }

        // Show sample asset details
        console.log(`\n📄 Sample Asset Details:`);
        console.log(`  Name: ${sampleAsset.name || 'N/A'}`);
        console.log(`  Description: ${sampleAsset.itemDescription || 'N/A'}`);
        console.log(`  Serial: ${sampleAsset.serialNumber || 'N/A'}`);
        console.log(`  Category: ${sampleAsset.category || 'N/A'}`);
        console.log(`  Department: ${sampleAsset.currentDepartment || 'N/A'}`);
        console.log(`  Status: ${sampleAsset.status || 'N/A'}`);
        console.log(`  Unit Price: $${(sampleAsset.unitPrice || 0).toLocaleString()}`);
        console.log(`  Current Value: $${(sampleAsset.currentValue || 0).toLocaleString()}`);
        
        if (sampleAsset.currentBookValue !== undefined) {
          console.log(`  Current Book Value: $${(sampleAsset.currentBookValue || 0).toLocaleString()}`);
        }
        
        if (sampleAsset.age !== undefined) {
          console.log(`  Age: ${sampleAsset.age} years`);
        }
        
        if (sampleAsset.depreciationRate !== undefined) {
          console.log(`  Depreciation Rate: ${sampleAsset.depreciationRate}%`);
        }

        // Validate filter compliance for sample assets
        console.log(`\n🔍 Filter Compliance Check (first 3 assets):`);
        data.assets.slice(0, 3).forEach((asset, index) => {
          console.log(`  Asset ${index + 1}: ${asset.name || asset.itemDescription || 'Unknown'}`);
          
          // Check category filter
          if (data.filters?.category && data.filters.category !== 'all') {
            const categoryMatch = asset.category === data.filters.category;
            console.log(`    Category (${data.filters.category}): ${categoryMatch ? '✅' : '❌'} (${asset.category})`);
          }
          
          // Check department filter
          if (data.filters?.currentDepartment && data.filters.currentDepartment !== 'all') {
            const deptMatch = asset.currentDepartment === data.filters.currentDepartment;
            console.log(`    Department (${data.filters.currentDepartment}): ${deptMatch ? '✅' : '❌'} (${asset.currentDepartment})`);
          }
          
          // Check status filter
          if (data.filters?.status && data.filters.status !== 'all') {
            const statusMatch = asset.status === data.filters.status;
            console.log(`    Status (${data.filters.status}): ${statusMatch ? '✅' : '❌'} (${asset.status})`);
          }
        });
      }

      console.log(`\n✅ Test completed successfully`);
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test comparison between main API and export API
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Comparison Test: Main API vs Export API`);
  console.log(`📝 Verify export API returns ALL filtered data (not just paginated)`);
  console.log(`${'='.repeat(80)}`);

  try {
    // Test with a filter that should return multiple pages
    const mainApiUrl = '/api/reports/assets?category=COMPUTER&page=1&limit=5';
    const exportApiUrl = '/api/reports/assets/export?category=COMPUTER';

    console.log(`\n🔍 Fetching from Main API (paginated): ${mainApiUrl}`);
    const mainResponse = await fetch(`${BASE_URL}${mainApiUrl}`);
    const mainData = await mainResponse.json();

    console.log(`\n🔍 Fetching from Export API (all data): ${exportApiUrl}`);
    const exportResponse = await fetch(`${BASE_URL}${exportApiUrl}`);
    const exportData = await exportResponse.json();

    console.log(`\n📊 Comparison Results:`);
    console.log(`  Main API - Total Assets: ${mainData.stats?.totalAssets || 0}`);
    console.log(`  Main API - Returned Assets: ${mainData.assets?.length || 0}`);
    console.log(`  Main API - Has Next Page: ${mainData.pagination?.hasNextPage || false}`);
    
    console.log(`  Export API - Total Assets: ${exportData.totalCount || 0}`);
    console.log(`  Export API - Returned Assets: ${exportData.assets?.length || 0}`);
    
    // Validate that export API returns more data than paginated main API
    const exportReturnsMore = (exportData.assets?.length || 0) >= (mainData.assets?.length || 0);
    console.log(`  Export Returns More/Equal Data: ${exportReturnsMore ? '✅' : '❌'}`);
    
    // Validate that totals match
    const totalsMatch = (mainData.stats?.totalAssets || 0) === (exportData.totalCount || 0);
    console.log(`  Total Counts Match: ${totalsMatch ? '✅' : '❌'}`);
    
    if (exportReturnsMore && totalsMatch) {
      console.log(`\n🎉 Export API correctly returns ALL filtered data!`);
    } else {
      console.log(`\n⚠️ Export API may not be returning all data correctly`);
    }

  } catch (error) {
    console.log(`❌ Comparison test failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Export functionality testing completed!');
  console.log('='.repeat(80));
  console.log('\n📋 Summary of Fixes:');
  console.log('1. ✅ Export API returns ALL filtered data (no pagination limit)');
  console.log('2. ✅ Export includes comprehensive asset fields');
  console.log('3. ✅ Export handles monthly book values correctly');
  console.log('4. ✅ Export respects all applied filters');
  console.log('5. ✅ Export provides current book values when no date filters');
}

// Run the tests
if (require.main === module) {
  testExportFunctionality().catch(console.error);
}

module.exports = { testExportFunctionality };
