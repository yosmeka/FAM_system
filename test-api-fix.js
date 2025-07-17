// Quick test to verify API is working after syntax fix
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testApiFix() {
  console.log('🔧 Testing API Fix...\n');

  const tests = [
    {
      name: 'Basic API Test',
      url: '/api/reports/assets',
      timeout: 10000
    },
    {
      name: 'Category Filter Test',
      url: '/api/reports/assets?category=COMPUTER',
      timeout: 10000
    },
    {
      name: 'Year Filter Test',
      url: '/api/reports/assets?year=2024',
      timeout: 15000
    },
    {
      name: 'Year + Month Filter Test',
      url: '/api/reports/assets?year=2024&month=6',
      timeout: 15000
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`🌐 ${test.url}`);
    console.log(`⏱️ Timeout: ${test.timeout}ms`);
    console.log(`${'='.repeat(60)}`);

    try {
      console.log('⏱️ Starting request...');
      const startTime = Date.now();
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), test.timeout);
      });
      
      // Create the fetch promise
      const fetchPromise = fetch(`${BASE_URL}${test.url}`);
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Request completed in ${duration}ms`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        
        try {
          const errorText = await response.text();
          console.log(`📄 Error Response: ${errorText.substring(0, 500)}`);
        } catch (e) {
          console.log(`📄 Could not read error response`);
        }
        continue;
      }

      console.log(`✅ HTTP Status: ${response.status} ${response.statusText}`);
      
      // Parse JSON response
      const data = await response.json();
      console.log(`✅ JSON Response parsed successfully`);
      
      // Analyze response
      console.log(`\n📊 Response Analysis:`);
      console.log(`  Has stats: ${data.stats ? '✅' : '❌'}`);
      console.log(`  Has assets: ${data.assets ? '✅' : '❌'}`);
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets Returned: ${data.assets?.length || 0}`);
      
      // Check book value fields
      if (data.assets && data.assets.length > 0) {
        const sampleAsset = data.assets[0];
        console.log(`\n📋 Book Value Fields Check:`);
        console.log(`  Has currentBookValue: ${sampleAsset.currentBookValue !== undefined ? '✅' : '❌'}`);
        console.log(`  Has bookValue: ${sampleAsset.bookValue !== undefined ? '✅' : '❌'}`);
        console.log(`  Has bookValuesByMonth: ${sampleAsset.bookValuesByMonth !== undefined ? '✅' : '❌'}`);
        
        if (sampleAsset.currentBookValue !== undefined) {
          console.log(`    currentBookValue: $${Number(sampleAsset.currentBookValue).toLocaleString()}`);
        }
        if (sampleAsset.bookValue !== undefined) {
          console.log(`    bookValue: $${Number(sampleAsset.bookValue).toLocaleString()}`);
        }
        if (sampleAsset.bookValuesByMonth) {
          const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
          console.log(`    bookValuesByMonth: ${monthCount} months`);
          
          // Show first 3 months
          Object.entries(sampleAsset.bookValuesByMonth).slice(0, 3).forEach(([month, value]) => {
            console.log(`      Month ${month}: $${Number(value).toLocaleString()}`);
          });
        }
      }
      
      console.log(`\n✅ ${test.name} PASSED`);
      
    } catch (error) {
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
      
      if (error.message === 'Request timeout') {
        console.log(`   ⚠️ API is taking too long - likely infinite loop or hanging`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   ⚠️ Server not running on ${BASE_URL}`);
      } else {
        console.log(`   📄 Error details: ${error.stack}`);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 API Fix Test Summary');
  console.log('='.repeat(60));
  console.log('\n✅ If all tests passed:');
  console.log('   - Loading spinner issue should be fixed');
  console.log('   - Book value fields should be present');
  console.log('   - Export should work correctly');
  console.log('\n❌ If tests failed:');
  console.log('   - Check server console for errors');
  console.log('   - Verify database connection');
  console.log('   - Check for remaining syntax errors');
}

// Run the test
if (require.main === module) {
  testApiFix().catch(console.error);
}

module.exports = { testApiFix };
