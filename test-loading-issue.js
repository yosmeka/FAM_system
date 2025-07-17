// Test script to diagnose the loading spinner issue
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testLoadingIssue() {
  console.log('🔍 Diagnosing Loading Spinner Issue...\n');

  const testCases = [
    {
      name: 'Basic API Test - No Filters',
      url: '/api/reports/assets',
      description: 'Test basic API call without any filters'
    },
    {
      name: 'Simple Filter Test',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test with a simple category filter'
    },
    {
      name: 'Year Filter Test',
      url: '/api/reports/assets?year=2024',
      description: 'Test with year filter (might cause issues with book value calculations)'
    },
    {
      name: 'Complex Filter Test',
      url: '/api/reports/assets?category=COMPUTER&currentDepartment=IT&status=ACTIVE',
      description: 'Test with multiple filters'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🌐 ${testCase.url}`);
    console.log(`${'='.repeat(70)}`);

    try {
      console.log('⏱️ Starting request...');
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}${testCase.url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        timeout: 30000 // 30 seconds
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Request completed in ${duration}ms`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        
        // Try to get error details
        try {
          const errorText = await response.text();
          console.log(`📄 Error Response: ${errorText}`);
        } catch (e) {
          console.log(`📄 Could not read error response: ${e.message}`);
        }
        continue;
      }

      console.log(`✅ HTTP Status: ${response.status} ${response.statusText}`);
      
      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
        console.log(`✅ JSON Response parsed successfully`);
      } catch (jsonError) {
        console.log(`❌ JSON Parse Error: ${jsonError.message}`);
        
        // Try to get raw response
        try {
          const rawText = await response.text();
          console.log(`📄 Raw Response (first 500 chars): ${rawText.substring(0, 500)}`);
        } catch (e) {
          console.log(`📄 Could not read raw response: ${e.message}`);
        }
        continue;
      }
      
      // Analyze response structure
      console.log(`\n📊 Response Analysis:`);
      console.log(`  Has stats: ${data.stats ? '✅' : '❌'}`);
      console.log(`  Has assets: ${data.assets ? '✅' : '❌'}`);
      console.log(`  Has filterOptions: ${data.filterOptions ? '✅' : '❌'}`);
      console.log(`  Has byCategory: ${data.byCategory ? '✅' : '❌'}`);
      console.log(`  Has byDepartment: ${data.byDepartment ? '✅' : '❌'}`);
      
      if (data.stats) {
        console.log(`  Total Assets: ${data.stats.totalAssets || 0}`);
        console.log(`  Active Assets: ${data.stats.activeAssets || 0}`);
        console.log(`  Total Value: $${(data.stats.totalValue || 0).toLocaleString()}`);
      }
      
      if (data.assets) {
        console.log(`  Assets Array Length: ${data.assets.length}`);
        
        if (data.assets.length > 0) {
          const sampleAsset = data.assets[0];
          console.log(`  Sample Asset Fields: ${Object.keys(sampleAsset).length}`);
          console.log(`  Sample Asset ID: ${sampleAsset.id || 'N/A'}`);
          console.log(`  Sample Asset Name: ${sampleAsset.name || 'N/A'}`);
          
          // Check for book value fields
          if (testCase.url.includes('year=')) {
            console.log(`  Has bookValuesByMonth: ${sampleAsset.bookValuesByMonth ? '✅' : '❌'}`);
            if (sampleAsset.bookValuesByMonth) {
              const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
              console.log(`    Monthly data points: ${monthCount}`);
            }
          } else {
            console.log(`  Has currentBookValue: ${sampleAsset.currentBookValue !== undefined ? '✅' : '❌'}`);
          }
        }
      }
      
      // Check for pagination (should be removed)
      if (data.pagination) {
        console.log(`  ⚠️ Pagination still present: ${JSON.stringify(data.pagination)}`);
      } else {
        console.log(`  ✅ Pagination removed successfully`);
      }
      
      console.log(`\n✅ Test completed successfully`);
      
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      console.log(`   Error type: ${error.constructor.name}`);
      console.log(`   Error stack: ${error.stack}`);
      
      // Check for specific error types
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔧 Server might not be running on ${BASE_URL}`);
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.log(`   ⏱️ Request timed out - API might be hanging`);
      } else if (error.message.includes('JSON')) {
        console.log(`   📄 JSON parsing issue - API might be returning invalid JSON`);
      }
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎯 Diagnosis Summary');
  console.log('='.repeat(70));
  console.log('\n🔍 Common causes of loading spinner issues:');
  console.log('1. ❌ Syntax error in API code (missing comma, bracket, etc.)');
  console.log('2. ❌ Database connection issues');
  console.log('3. ❌ Infinite loop in calculation logic');
  console.log('4. ❌ Memory issues with large datasets');
  console.log('5. ❌ Frontend not handling response correctly');
  console.log('\n💡 Next steps:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Check browser network tab for failed requests');
  console.log('3. Check server logs for API errors');
  console.log('4. Verify database connection');
  console.log('5. Test with smaller datasets first');
}

// Run the diagnostic
if (require.main === module) {
  testLoadingIssue().catch(console.error);
}

module.exports = { testLoadingIssue };
