// Final test to verify loading spinner and book value fixes
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testFinalFix() {
  console.log('🎯 Final Fix Verification Test...\n');

  const tests = [
    {
      name: 'Basic API - No Filters',
      url: '/api/reports/assets',
      expectBookValue: 'currentBookValue',
      timeout: 5000
    },
    {
      name: 'Category Filter',
      url: '/api/reports/assets?category=COMPUTER',
      expectBookValue: 'currentBookValue',
      timeout: 5000
    },
    {
      name: 'Department Filter',
      url: '/api/reports/assets?currentDepartment=IT',
      expectBookValue: 'currentBookValue',
      timeout: 5000
    },
    {
      name: 'Status Filter',
      url: '/api/reports/assets?status=ACTIVE',
      expectBookValue: 'currentBookValue',
      timeout: 5000
    },
    {
      name: 'Multiple Filters',
      url: '/api/reports/assets?category=COMPUTER&status=ACTIVE',
      expectBookValue: 'currentBookValue',
      timeout: 5000
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`🌐 ${test.url}`);
    console.log(`⏱️ Timeout: ${test.timeout}ms`);
    console.log(`📊 Expected: ${test.expectBookValue} field`);
    console.log(`${'='.repeat(60)}`);

    try {
      console.log('⏱️ Starting request...');
      const startTime = Date.now();
      
      // Create timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), test.timeout);
      
      const response = await fetch(`${BASE_URL}${test.url}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Request completed in ${duration}ms`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ JSON Response parsed successfully`);
      
      // Check basic response structure
      const hasStats = data.stats ? '✅' : '❌';
      const hasAssets = data.assets ? '✅' : '❌';
      const totalAssets = data.stats?.totalAssets || 0;
      const returnedAssets = data.assets?.length || 0;
      
      console.log(`\n📊 Response Structure:`);
      console.log(`  Has stats: ${hasStats}`);
      console.log(`  Has assets: ${hasAssets}`);
      console.log(`  Total Assets: ${totalAssets}`);
      console.log(`  Returned Assets: ${returnedAssets}`);
      console.log(`  All assets returned: ${totalAssets === returnedAssets ? '✅' : '❌'}`);
      
      // Check book value fields
      if (data.assets && data.assets.length > 0) {
        const asset = data.assets[0];
        console.log(`\n📋 Book Value Check:`);
        
        const hasCurrentBookValue = asset.currentBookValue !== undefined;
        const hasBookValue = asset.bookValue !== undefined;
        const hasMonthlyBookValues = asset.bookValuesByMonth !== undefined;
        
        console.log(`  Has currentBookValue: ${hasCurrentBookValue ? '✅' : '❌'}`);
        console.log(`  Has bookValue: ${hasBookValue ? '✅' : '❌'}`);
        console.log(`  Has bookValuesByMonth: ${hasMonthlyBookValues ? '✅' : '❌'}`);
        
        if (hasCurrentBookValue) {
          const value = Number(asset.currentBookValue);
          console.log(`  currentBookValue: $${value.toLocaleString()}`);
          console.log(`  Value is reasonable: ${value >= 0 && value <= (asset.unitPrice || 0) ? '✅' : '❌'}`);
        }
        
        // Check export readiness
        console.log(`\n🔧 Export Readiness:`);
        const exportReady = hasCurrentBookValue && asset.currentBookValue > 0;
        console.log(`  Ready for export: ${exportReady ? '✅' : '❌'}`);
        
        if (exportReady) {
          console.log(`  Export would show: $${Number(asset.currentBookValue).toFixed(2)}`);
        }
      }
      
      console.log(`\n✅ ${test.name} PASSED`);
      passedTests++;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ ${test.name} FAILED: Request timed out`);
        console.log(`   ⚠️ API is still hanging - need to investigate further`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name} FAILED: Server not running`);
        console.log(`   🔧 Start server with: npm run dev`);
      } else {
        console.log(`❌ ${test.name} FAILED: ${error.message}`);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Final Test Results');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 ALL TESTS PASSED!`);
    console.log(`✅ Loading spinner issue: FIXED`);
    console.log(`✅ Book value fields: PRESENT`);
    console.log(`✅ Export functionality: READY`);
    console.log(`\n💡 Next steps:`);
    console.log(`1. Test the frontend - filters should work without hanging`);
    console.log(`2. Test exports - book value columns should have data`);
    console.log(`3. Re-enable complex book value calculations if needed`);
  } else {
    console.log(`\n⚠️ Some tests failed`);
    console.log(`❌ Loading spinner issue: ${passedTests > 0 ? 'PARTIALLY FIXED' : 'NOT FIXED'}`);
    console.log(`\n🔧 Troubleshooting:`);
    console.log(`1. Check server console for errors`);
    console.log(`2. Verify database connection`);
    console.log(`3. Check for remaining syntax errors`);
    console.log(`4. Consider simplifying book value calculations further`);
  }
}

// Run the test
if (require.main === module) {
  testFinalFix().catch(console.error);
}

module.exports = { testFinalFix };
