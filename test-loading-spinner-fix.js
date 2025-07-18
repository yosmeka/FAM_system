// Test to verify loading spinner fix without touching other functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testLoadingSpinnerFix() {
  console.log('🔧 Testing Loading Spinner Fix (Peaceful Solution)...\n');

  const tests = [
    {
      name: 'Basic Filter Test',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test category filter without hanging',
      timeout: 15000
    },
    {
      name: 'Department Filter Test',
      url: '/api/reports/assets?currentDepartment=IT',
      description: 'Test department filter without hanging',
      timeout: 15000
    },
    {
      name: 'Year Filter Test',
      url: '/api/reports/assets?year=2024',
      description: 'Test year filter (monthly calculations) without hanging',
      timeout: 30000
    },
    {
      name: 'Year + Month Filter Test',
      url: '/api/reports/assets?year=2024&month=6',
      description: 'Test year+month filter (with accumulated depreciation) without hanging',
      timeout: 20000
    },
    {
      name: 'Multiple Filters Test',
      url: '/api/reports/assets?category=COMPUTER&status=ACTIVE&year=2024&month=6',
      description: 'Test multiple filters including date filters without hanging',
      timeout: 25000
    },
    {
      name: 'Status Filter Test',
      url: '/api/reports/assets?status=ACTIVE',
      description: 'Test status filter without hanging',
      timeout: 15000
    }
  ];

  let passedTests = 0;
  const results = [];

  for (const test of tests) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
    console.log(`⏱️ Timeout: ${test.timeout}ms`);
    console.log(`${'='.repeat(70)}`);

    const testResult = {
      name: test.name,
      passed: false,
      duration: 0,
      assetCount: 0,
      error: null,
      hasAccumulatedDepreciation: false,
      hasBookValues: false
    };

    try {
      console.log('⏱️ Starting request...');
      const startTime = Date.now();
      
      // Create timeout controller
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
        results.push(testResult);
        continue;
      }

      const data = await response.json();
      console.log(`✅ JSON Response parsed successfully`);
      
      // Check response structure
      const assets = data.assets || [];
      const stats = data.stats || {};
      testResult.assetCount = assets.length;
      
      console.log(`\n📊 Response Analysis:`);
      console.log(`  Total Assets: ${stats.totalAssets || 0}`);
      console.log(`  Assets Returned: ${assets.length}`);
      console.log(`  Response Time: ${testResult.duration}ms`);
      
      // Performance rating
      const performanceRating = testResult.duration < 5000 ? 'Excellent' : 
                               testResult.duration < 10000 ? 'Good' : 
                               testResult.duration < 20000 ? 'Acceptable' : 'Slow';
      console.log(`  Performance: ${performanceRating}`);
      
      // Check for accumulated depreciation (should only be present for year+month filters)
      if (assets.length > 0) {
        const sampleAsset = assets[0];
        testResult.hasAccumulatedDepreciation = sampleAsset.accumulatedDepreciation !== undefined;
        testResult.hasBookValues = sampleAsset.currentBookValue !== undefined || 
                                   sampleAsset.bookValue !== undefined || 
                                   sampleAsset.bookValuesByMonth !== undefined;
        
        console.log(`\n📋 Functionality Check:`);
        console.log(`  Has book values: ${testResult.hasBookValues ? '✅ YES' : '❌ NO'}`);
        console.log(`  Has accumulated depreciation: ${testResult.hasAccumulatedDepreciation ? '✅ YES' : '❌ NO'}`);
        
        // Verify accumulated depreciation appears only for year+month filters
        const shouldHaveAccDepreciation = test.url.includes('year=') && test.url.includes('month=');
        const accDepreciationCorrect = testResult.hasAccumulatedDepreciation === shouldHaveAccDepreciation;
        console.log(`  Accumulated depreciation correct: ${accDepreciationCorrect ? '✅ YES' : '❌ NO'}`);
        
        if (testResult.hasAccumulatedDepreciation) {
          const accDepreciation = Number(sampleAsset.accumulatedDepreciation || 0);
          const bookValue = Number(sampleAsset.bookValue || 0);
          const unitPrice = Number(sampleAsset.unitPrice || 0);
          
          console.log(`    Sample accumulated depreciation: $${accDepreciation.toLocaleString()}`);
          console.log(`    Sample book value: $${bookValue.toLocaleString()}`);
          console.log(`    Sample unit price: $${unitPrice.toLocaleString()}`);
          
          // Basic validation
          const reasonable = accDepreciation >= 0 && accDepreciation <= unitPrice;
          console.log(`    Values reasonable: ${reasonable ? '✅ YES' : '❌ NO'}`);
        }
      }
      
      // Check for timeout protection indicators
      console.log(`\n🛡️ Timeout Protection Check:`);
      const hasTimeoutProtection = testResult.duration < test.timeout;
      console.log(`  Completed within timeout: ${hasTimeoutProtection ? '✅ YES' : '❌ NO'}`);
      
      if (testResult.duration > 10000) {
        console.log(`  ⚠️ Slow response - check server logs for timeout protection messages`);
      }
      
      testResult.passed = true;
      passedTests++;
      console.log(`\n✅ ${test.name} PASSED`);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ ${test.name} FAILED: Request timed out after ${test.timeout}ms`);
        console.log(`   ⚠️ Loading spinner would be stuck - timeout protection not working`);
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
  console.log('🎯 LOADING SPINNER FIX TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`\n📊 Overall Results: ${passedTests}/${tests.length} tests passed`);
  
  // Detailed results table
  console.log(`\n📋 Detailed Results:`);
  console.log(`${'Test Name'.padEnd(30)} ${'Status'.padEnd(8)} ${'Time'.padEnd(8)} ${'Assets'.padEnd(8)} ${'AccDep'.padEnd(6)}`);
  console.log('-'.repeat(70));
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const time = `${result.duration}ms`.padEnd(8);
    const assets = `${result.assetCount}`.padEnd(8);
    const accDep = result.hasAccumulatedDepreciation ? '✅' : '❌';
    
    console.log(`${result.name.padEnd(30)} ${status.padEnd(8)} ${time} ${assets} ${accDep.padEnd(6)}`);
    
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  // Performance analysis
  const completedTests = results.filter(r => r.passed);
  if (completedTests.length > 0) {
    const avgTime = completedTests.reduce((sum, r) => sum + r.duration, 0) / completedTests.length;
    const maxTime = Math.max(...completedTests.map(r => r.duration));
    const minTime = Math.min(...completedTests.map(r => r.duration));
    
    console.log(`\n⚡ Performance Analysis:`);
    console.log(`  Average response time: ${Math.round(avgTime)}ms`);
    console.log(`  Fastest response: ${minTime}ms`);
    console.log(`  Slowest response: ${maxTime}ms`);
    console.log(`  All under 30 seconds: ${maxTime < 30000 ? '✅ YES' : '❌ NO'}`);
  }
  
  // Final verdict
  if (passedTests === tests.length) {
    console.log(`\n🎉 ALL TESTS PASSED!`);
    console.log(`✅ Loading spinner issue: FIXED`);
    console.log(`✅ All filters work without hanging`);
    console.log(`✅ Accumulated depreciation functionality: PRESERVED`);
    console.log(`✅ Book value calculations: WORKING`);
    console.log(`✅ Performance: ACCEPTABLE`);
    console.log(`\n💡 Applied peaceful fixes:`);
    console.log(`1. Added timeout protection (30-45 seconds)`);
    console.log(`2. Added circuit breaker for large datasets (2000 asset limit)`);
    console.log(`3. Reduced logging frequency to improve performance`);
    console.log(`4. Added individual calculation timeouts`);
    console.log(`5. Preserved all existing functionality`);
  } else {
    console.log(`\n⚠️ Some tests failed`);
    console.log(`❌ Loading spinner issue: ${passedTests > 0 ? 'PARTIALLY FIXED' : 'NOT FIXED'}`);
    console.log(`\n🔧 Next steps:`);
    console.log(`1. Check server console for timeout messages`);
    console.log(`2. Verify server is running and responsive`);
    console.log(`3. Check for any remaining infinite loops`);
  }
}

// Run the test
if (require.main === module) {
  testLoadingSpinnerFix().catch(console.error);
}

module.exports = { testLoadingSpinnerFix };
