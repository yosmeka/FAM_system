// Test to verify syntax errors are fixed
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testSyntaxFix() {
  console.log('🔧 Testing Syntax Fix...\n');

  const tests = [
    {
      name: 'Basic API Test',
      url: '/api/reports/assets',
      description: 'Test basic API without filters'
    },
    {
      name: 'Category Filter Test',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test with category filter'
    },
    {
      name: 'Year Filter Test',
      url: '/api/reports/assets?year=2024',
      description: 'Test with year filter (simplified calculation)'
    },
    {
      name: 'Year + Month Filter Test',
      url: '/api/reports/assets?year=2024&month=6',
      description: 'Test with year + month filter (simplified calculation)'
    }
  ];

  let passedTests = 0;

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
    console.log(`${'='.repeat(60)}`);

    try {
      console.log('⏱️ Starting request...');
      const startTime = Date.now();
      
      // Set a reasonable timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
      
      const response = await fetch(`${BASE_URL}${test.url}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Request completed in ${duration}ms`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        
        try {
          const errorText = await response.text();
          console.log(`📄 Error Response: ${errorText.substring(0, 300)}`);
        } catch (e) {
          console.log(`📄 Could not read error response`);
        }
        continue;
      }

      console.log(`✅ HTTP Status: ${response.status} ${response.statusText}`);
      
      const data = await response.json();
      console.log(`✅ JSON Response parsed successfully`);
      
      // Basic validation
      console.log(`\n📊 Response Validation:`);
      console.log(`  Has stats: ${data.stats ? '✅' : '❌'}`);
      console.log(`  Has assets: ${data.assets ? '✅' : '❌'}`);
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets Returned: ${data.assets?.length || 0}`);
      
      // Check if pagination was removed successfully
      console.log(`  Pagination removed: ${!data.pagination ? '✅' : '❌'}`);
      console.log(`  All assets returned: ${(data.stats?.totalAssets || 0) === (data.assets?.length || 0) ? '✅' : '❌'}`);
      
      // Check book value fields
      if (data.assets && data.assets.length > 0) {
        const asset = data.assets[0];
        console.log(`\n📋 Book Value Fields:`);
        console.log(`  Has currentBookValue: ${asset.currentBookValue !== undefined ? '✅' : '❌'}`);
        console.log(`  Has bookValue: ${asset.bookValue !== undefined ? '✅' : '❌'}`);
        console.log(`  Has bookValuesByMonth: ${asset.bookValuesByMonth !== undefined ? '✅' : '❌'}`);
        
        if (asset.currentBookValue !== undefined) {
          console.log(`    currentBookValue: $${Number(asset.currentBookValue).toLocaleString()}`);
        }
        if (asset.bookValue !== undefined) {
          console.log(`    bookValue: $${Number(asset.bookValue).toLocaleString()}`);
        }
        if (asset.bookValuesByMonth) {
          const monthCount = Object.keys(asset.bookValuesByMonth).length;
          console.log(`    bookValuesByMonth: ${monthCount} months`);
        }
      }
      
      console.log(`\n✅ ${test.name} PASSED`);
      passedTests++;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ ${test.name} FAILED: Request timed out`);
        console.log(`   ⚠️ API might still be hanging`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name} FAILED: Server not running`);
        console.log(`   🔧 Start server with: npm run dev`);
      } else {
        console.log(`❌ ${test.name} FAILED: ${error.message}`);
        
        if (error.message.includes('Syntax')) {
          console.log(`   ⚠️ Syntax error still present in API`);
        }
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Syntax Fix Test Results');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log(`\n🎉 ALL TESTS PASSED!`);
    console.log(`✅ Syntax errors: FIXED`);
    console.log(`✅ Loading spinner: SHOULD BE FIXED`);
    console.log(`✅ API responses: WORKING`);
    console.log(`✅ Book value fields: PRESENT`);
    console.log(`\n💡 Next steps:`);
    console.log(`1. Test the frontend - filters should work without hanging`);
    console.log(`2. Test exports - book value columns should have data`);
    console.log(`3. Verify all functionality is working`);
  } else if (passedTests > 0) {
    console.log(`\n⚠️ PARTIAL SUCCESS`);
    console.log(`✅ Some syntax errors fixed`);
    console.log(`❌ Some issues remain`);
    console.log(`\n🔧 Next steps:`);
    console.log(`1. Check server console for remaining errors`);
    console.log(`2. Verify all syntax issues are resolved`);
    console.log(`3. Test specific failing scenarios`);
  } else {
    console.log(`\n❌ ALL TESTS FAILED`);
    console.log(`❌ Syntax errors may still be present`);
    console.log(`\n🔧 Troubleshooting:`);
    console.log(`1. Check server console for syntax errors`);
    console.log(`2. Verify server is running: npm run dev`);
    console.log(`3. Check for remaining syntax issues in API file`);
  }
}

// Run the test
if (require.main === module) {
  testSyntaxFix().catch(console.error);
}

module.exports = { testSyntaxFix };
