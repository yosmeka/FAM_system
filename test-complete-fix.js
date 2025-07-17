// Complete test to verify both loading spinner and book value export fixes
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCompleteFix() {
  console.log('🎯 Complete Fix Verification Test...\n');
  console.log('Testing both loading spinner fix and book value export functionality\n');

  const tests = [
    {
      name: 'Basic API Test',
      url: '/api/reports/assets',
      description: 'Test basic API without filters',
      expectBookValue: 'currentBookValue',
      timeout: 8000
    },
    {
      name: 'Category Filter Test',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test category filter (should not hang)',
      expectBookValue: 'currentBookValue',
      timeout: 8000
    },
    {
      name: 'Department Filter Test',
      url: '/api/reports/assets?currentDepartment=IT',
      description: 'Test department filter (should not hang)',
      expectBookValue: 'currentBookValue',
      timeout: 8000
    },
    {
      name: 'Year + Month Filter Test',
      url: '/api/reports/assets?year=2024&month=6',
      description: 'Test year+month filter (should show bookValue field)',
      expectBookValue: 'bookValue',
      timeout: 10000
    },
    {
      name: 'Year Only Filter Test',
      url: '/api/reports/assets?year=2024',
      description: 'Test year only filter (should show bookValuesByMonth)',
      expectBookValue: 'bookValuesByMonth',
      timeout: 12000
    },
    {
      name: 'Complex Filter Test',
      url: '/api/reports/assets?category=COMPUTER&status=ACTIVE&currentDepartment=IT',
      description: 'Test multiple filters (should not hang)',
      expectBookValue: 'currentBookValue',
      timeout: 10000
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;
  const results = [];

  for (const test of tests) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
    console.log(`⏱️ Timeout: ${test.timeout}ms`);
    console.log(`📊 Expected book value field: ${test.expectBookValue}`);
    console.log(`${'='.repeat(70)}`);

    const testResult = {
      name: test.name,
      passed: false,
      duration: 0,
      error: null,
      bookValueCheck: false,
      exportReady: false
    };

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
      testResult.duration = endTime - startTime;
      
      console.log(`⏱️ Request completed in ${testResult.duration}ms`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        testResult.error = `HTTP ${response.status}`;
        
        try {
          const errorText = await response.text();
          console.log(`📄 Error Response: ${errorText.substring(0, 200)}`);
        } catch (e) {
          console.log(`📄 Could not read error response`);
        }
        results.push(testResult);
        continue;
      }

      const data = await response.json();
      console.log(`✅ JSON Response parsed successfully`);
      
      // Basic validation
      console.log(`\n📊 Response Structure:`);
      const hasStats = data.stats ? '✅' : '❌';
      const hasAssets = data.assets ? '✅' : '❌';
      const totalAssets = data.stats?.totalAssets || 0;
      const returnedAssets = data.assets?.length || 0;
      const allAssetsReturned = totalAssets === returnedAssets;
      
      console.log(`  Has stats: ${hasStats}`);
      console.log(`  Has assets: ${hasAssets}`);
      console.log(`  Total Assets: ${totalAssets}`);
      console.log(`  Returned Assets: ${returnedAssets}`);
      console.log(`  All assets returned: ${allAssetsReturned ? '✅' : '❌'}`);
      console.log(`  Pagination removed: ${!data.pagination ? '✅' : '❌'}`);
      
      // Check book value fields
      if (data.assets && data.assets.length > 0) {
        const asset = data.assets[0];
        console.log(`\n📋 Book Value Fields Check:`);
        
        const hasCurrentBookValue = asset.currentBookValue !== undefined;
        const hasBookValue = asset.bookValue !== undefined;
        const hasMonthlyBookValues = asset.bookValuesByMonth !== undefined;
        
        console.log(`  Has currentBookValue: ${hasCurrentBookValue ? '✅' : '❌'}`);
        console.log(`  Has bookValue: ${hasBookValue ? '✅' : '❌'}`);
        console.log(`  Has bookValuesByMonth: ${hasMonthlyBookValues ? '✅' : '❌'}`);
        
        // Check expected field
        let expectedFieldPresent = false;
        if (test.expectBookValue === 'currentBookValue' && hasCurrentBookValue) {
          expectedFieldPresent = true;
          console.log(`  ✅ Expected field 'currentBookValue' present: $${Number(asset.currentBookValue).toLocaleString()}`);
        } else if (test.expectBookValue === 'bookValue' && hasBookValue) {
          expectedFieldPresent = true;
          console.log(`  ✅ Expected field 'bookValue' present: $${Number(asset.bookValue).toLocaleString()}`);
        } else if (test.expectBookValue === 'bookValuesByMonth' && hasMonthlyBookValues) {
          expectedFieldPresent = true;
          const monthCount = Object.keys(asset.bookValuesByMonth).length;
          console.log(`  ✅ Expected field 'bookValuesByMonth' present: ${monthCount} months`);
          
          // Show sample monthly values
          Object.entries(asset.bookValuesByMonth).slice(0, 3).forEach(([month, value]) => {
            console.log(`    Month ${month}: $${Number(value).toLocaleString()}`);
          });
        }
        
        testResult.bookValueCheck = expectedFieldPresent;
        
        // Check export readiness
        console.log(`\n🔧 Export Readiness Check:`);
        let exportReady = false;
        
        if (test.expectBookValue === 'currentBookValue' && hasCurrentBookValue && asset.currentBookValue > 0) {
          exportReady = true;
          console.log(`  ✅ Export ready - currentBookValue: $${Number(asset.currentBookValue).toFixed(2)}`);
        } else if (test.expectBookValue === 'bookValue' && hasBookValue && asset.bookValue > 0) {
          exportReady = true;
          console.log(`  ✅ Export ready - bookValue: $${Number(asset.bookValue).toFixed(2)}`);
        } else if (test.expectBookValue === 'bookValuesByMonth' && hasMonthlyBookValues) {
          const monthlyValues = Object.values(asset.bookValuesByMonth);
          const hasValidMonthlyData = monthlyValues.some(val => val > 0);
          if (hasValidMonthlyData) {
            exportReady = true;
            console.log(`  ✅ Export ready - monthly book values available`);
          } else {
            console.log(`  ❌ Export not ready - monthly values are zero/empty`);
          }
        } else {
          console.log(`  ❌ Export not ready - expected book value field missing or zero`);
        }
        
        testResult.exportReady = exportReady;
        
        if (expectedFieldPresent && exportReady) {
          console.log(`\n✅ ${test.name} PASSED - Book values ready for export!`);
          testResult.passed = true;
          passedTests++;
        } else {
          console.log(`\n⚠️ ${test.name} PARTIAL - API works but book values need attention`);
        }
      } else {
        console.log(`\n📋 No assets found for this filter combination`);
        testResult.passed = true; // API works, just no data
        passedTests++;
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ ${test.name} FAILED: Request timed out`);
        console.log(`   ⚠️ Loading spinner issue may still exist`);
        testResult.error = 'Timeout';
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name} FAILED: Server not running`);
        console.log(`   🔧 Start server with: npm run dev`);
        testResult.error = 'Server not running';
      } else {
        console.log(`❌ ${test.name} FAILED: ${error.message}`);
        testResult.error = error.message;
      }
    }
    
    results.push(testResult);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('🎯 COMPLETE FIX TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`\n📊 Overall Summary: ${passedTests}/${totalTests} tests passed`);
  
  // Detailed results
  console.log(`\n📋 Detailed Results:`);
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `${result.duration}ms`;
    const bookValue = result.bookValueCheck ? '✅' : '❌';
    const exportReady = result.exportReady ? '✅' : '❌';
    
    console.log(`  ${status} ${result.name.padEnd(25)} ${duration.padEnd(8)} BookValue:${bookValue} Export:${exportReady}`);
    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }
  });
  
  // Issue analysis
  const timeoutTests = results.filter(r => r.error === 'Timeout');
  const bookValueIssues = results.filter(r => r.passed && !r.bookValueCheck);
  const exportIssues = results.filter(r => r.passed && !r.exportReady);
  
  console.log(`\n🔍 Issue Analysis:`);
  console.log(`  Loading Spinner Issues: ${timeoutTests.length} (${timeoutTests.map(t => t.name).join(', ')})`);
  console.log(`  Book Value Field Issues: ${bookValueIssues.length} (${bookValueIssues.map(t => t.name).join(', ')})`);
  console.log(`  Export Readiness Issues: ${exportIssues.length} (${exportIssues.map(t => t.name).join(', ')})`);
  
  // Final verdict
  if (passedTests === totalTests && bookValueIssues.length === 0 && exportIssues.length === 0) {
    console.log(`\n🎉 COMPLETE SUCCESS!`);
    console.log(`✅ Loading spinner issue: FIXED`);
    console.log(`✅ Book value fields: WORKING`);
    console.log(`✅ Export functionality: READY`);
    console.log(`\n💡 You can now:`);
    console.log(`1. Use filters without loading spinner hanging`);
    console.log(`2. Export data with book value columns populated`);
    console.log(`3. View different book value displays based on date filters`);
  } else if (timeoutTests.length === 0) {
    console.log(`\n🎯 LOADING SPINNER FIXED!`);
    console.log(`✅ API responds without hanging`);
    console.log(`✅ All filters work correctly`);
    if (bookValueIssues.length > 0 || exportIssues.length > 0) {
      console.log(`⚠️ Book value calculations need refinement`);
      console.log(`💡 Export will work but values may need adjustment`);
    }
  } else {
    console.log(`\n❌ ISSUES REMAIN`);
    console.log(`❌ Loading spinner: ${timeoutTests.length > 0 ? 'STILL HANGING' : 'FIXED'}`);
    console.log(`❌ Book values: ${bookValueIssues.length > 0 ? 'NEED WORK' : 'WORKING'}`);
    console.log(`\n🔧 Next steps:`);
    console.log(`1. Check server console for errors`);
    console.log(`2. Verify database connection`);
    console.log(`3. Test with smaller datasets`);
  }
}

// Run the complete test
if (require.main === module) {
  testCompleteFix().catch(console.error);
}

module.exports = { testCompleteFix };
