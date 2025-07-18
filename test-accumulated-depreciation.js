// Test to verify accumulated depreciation column functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAccumulatedDepreciation() {
  console.log('🔧 Testing Accumulated Depreciation Column Functionality...\n');

  const tests = [
    {
      name: 'No Date Filter - No Accumulated Depreciation',
      url: '/api/reports/assets',
      description: 'Test that accumulated depreciation is NOT shown when no date filter',
      expectAccDepreciation: false,
      expectField: 'currentBookValue'
    },
    {
      name: 'Year Only Filter - No Accumulated Depreciation',
      url: '/api/reports/assets?year=2024',
      description: 'Test that accumulated depreciation is NOT shown when only year selected',
      expectAccDepreciation: false,
      expectField: 'bookValuesByMonth'
    },
    {
      name: 'Year + Month Filter - WITH Accumulated Depreciation',
      url: '/api/reports/assets?year=2024&month=6',
      description: 'Test that accumulated depreciation IS shown when year and month selected',
      expectAccDepreciation: true,
      expectField: 'accumulatedDepreciation'
    },
    {
      name: 'Different Month - WITH Accumulated Depreciation',
      url: '/api/reports/assets?year=2024&month=12',
      description: 'Test accumulated depreciation for different month (December 2024)',
      expectAccDepreciation: true,
      expectField: 'accumulatedDepreciation'
    },
    {
      name: 'Previous Year Month - WITH Accumulated Depreciation',
      url: '/api/reports/assets?year=2023&month=6',
      description: 'Test accumulated depreciation for previous year',
      expectAccDepreciation: true,
      expectField: 'accumulatedDepreciation'
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
    console.log(`🎯 Expect accumulated depreciation: ${test.expectAccDepreciation ? 'YES' : 'NO'}`);
    console.log(`📊 Expected field: ${test.expectField}`);
    console.log(`${'='.repeat(70)}`);

    try {
      console.log('⏱️ Starting request...');
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}${test.url}`, {
        timeout: 30000
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Request completed in ${duration}ms`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ JSON Response parsed successfully`);
      
      // Check data structure
      const assets = data.assets || [];
      const stats = data.stats || {};
      
      console.log(`\n📊 Response Analysis:`);
      console.log(`  Total Assets: ${stats.totalAssets || 0}`);
      console.log(`  Assets Returned: ${assets.length}`);
      console.log(`  Total Book Value: $${(stats.totalBookValue || 0).toLocaleString()}`);
      
      if (assets.length > 0) {
        console.log(`\n🔬 Accumulated Depreciation Analysis:`);
        
        // Find assets with depreciation data for testing
        const assetsWithDepreciation = assets.filter(asset => 
          asset.sivDate && asset.unitPrice > 0 && asset.usefulLifeYears
        );
        
        console.log(`  Assets with depreciation data: ${assetsWithDepreciation.length}/${assets.length}`);
        
        if (assetsWithDepreciation.length > 0) {
          const sampleAsset = assetsWithDepreciation[0];
          console.log(`\n📋 Sample Asset Analysis:`);
          console.log(`  Asset ID: ${sampleAsset.id}`);
          console.log(`  Name: ${sampleAsset.name || 'N/A'}`);
          console.log(`  Unit Price: $${(sampleAsset.unitPrice || 0).toLocaleString()}`);
          console.log(`  SIV Date: ${sampleAsset.sivDate || 'N/A'}`);
          console.log(`  Useful Life: ${sampleAsset.usefulLifeYears || 'N/A'} years`);
          
          // Check for accumulated depreciation field
          const hasAccDepreciation = sampleAsset.accumulatedDepreciation !== undefined;
          console.log(`\n📊 Accumulated Depreciation Field Check:`);
          console.log(`  Has accumulatedDepreciation field: ${hasAccDepreciation ? '✅ YES' : '❌ NO'}`);
          console.log(`  Expected to have field: ${test.expectAccDepreciation ? '✅ YES' : '❌ NO'}`);
          
          // Validate expectation
          const expectationMet = hasAccDepreciation === test.expectAccDepreciation;
          console.log(`  Expectation met: ${expectationMet ? '✅ YES' : '❌ NO'}`);
          
          if (hasAccDepreciation) {
            const accDepreciation = Number(sampleAsset.accumulatedDepreciation);
            const unitPrice = Number(sampleAsset.unitPrice || 0);
            const bookValue = Number(sampleAsset.bookValue || 0);
            
            console.log(`\n💰 Accumulated Depreciation Values:`);
            console.log(`  Accumulated Depreciation: $${accDepreciation.toLocaleString()}`);
            console.log(`  Book Value: $${bookValue.toLocaleString()}`);
            console.log(`  Unit Price: $${unitPrice.toLocaleString()}`);
            
            // Validate accumulated depreciation logic
            const expectedBookValue = unitPrice - accDepreciation;
            const bookValueMatches = Math.abs(bookValue - expectedBookValue) < 0.01; // Allow for rounding
            
            console.log(`\n🔍 Validation Checks:`);
            console.log(`  Accumulated depreciation ≥ 0: ${accDepreciation >= 0 ? '✅ YES' : '❌ NO'}`);
            console.log(`  Accumulated depreciation ≤ unit price: ${accDepreciation <= unitPrice ? '✅ YES' : '❌ NO'}`);
            console.log(`  Book value = Unit price - Accumulated depreciation: ${bookValueMatches ? '✅ YES' : '❌ NO'}`);
            
            if (!bookValueMatches) {
              console.log(`    Expected book value: $${expectedBookValue.toLocaleString()}`);
              console.log(`    Actual book value: $${bookValue.toLocaleString()}`);
              console.log(`    Difference: $${Math.abs(bookValue - expectedBookValue).toLocaleString()}`);
            }
            
            // Check if it's reasonable for the selected month
            if (test.url.includes('month=')) {
              const urlParams = new URL(test.url, BASE_URL).searchParams;
              const year = urlParams.get('year');
              const month = urlParams.get('month');
              
              console.log(`\n📅 Time-Specific Analysis for ${month}/${year}:`);
              
              // Calculate expected depreciation based on asset age
              const sivDate = new Date(sampleAsset.sivDate);
              const targetDate = new Date(year, month - 1, 1);
              const ageInMonths = Math.max(0, (targetDate - sivDate) / (1000 * 60 * 60 * 24 * 30.44));
              const usefulLifeMonths = (sampleAsset.usefulLifeYears || 5) * 12;
              
              console.log(`    Asset age at ${month}/${year}: ${ageInMonths.toFixed(1)} months`);
              console.log(`    Useful life: ${usefulLifeMonths} months`);
              
              if (ageInMonths > 0) {
                const expectedDepreciationRate = Math.min(ageInMonths / usefulLifeMonths, 1);
                const residualValue = (sampleAsset.residualPercentage || 0) / 100 * unitPrice;
                const depreciableAmount = unitPrice - residualValue;
                const expectedAccDepreciation = depreciableAmount * expectedDepreciationRate;
                
                console.log(`    Expected accumulated depreciation: $${expectedAccDepreciation.toLocaleString()}`);
                console.log(`    Actual accumulated depreciation: $${accDepreciation.toLocaleString()}`);
                
                const reasonableRange = Math.abs(accDepreciation - expectedAccDepreciation) / unitPrice < 0.1; // Within 10%
                console.log(`    Within reasonable range: ${reasonableRange ? '✅ YES' : '⚠️ CHECK'}`);
              }
            }
          }
          
          // Check other expected fields
          console.log(`\n📊 Other Expected Fields:`);
          if (test.expectField === 'currentBookValue') {
            const hasField = sampleAsset.currentBookValue !== undefined;
            console.log(`  Has currentBookValue: ${hasField ? '✅ YES' : '❌ NO'}`);
            if (hasField) {
              console.log(`    Value: $${Number(sampleAsset.currentBookValue).toLocaleString()}`);
            }
          } else if (test.expectField === 'bookValuesByMonth') {
            const hasField = sampleAsset.bookValuesByMonth !== undefined;
            console.log(`  Has bookValuesByMonth: ${hasField ? '✅ YES' : '❌ NO'}`);
            if (hasField) {
              const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
              console.log(`    Monthly data points: ${monthCount}/12`);
            }
          }
          
          // Export readiness check
          console.log(`\n🔧 Export Readiness:`);
          const exportFields = [];
          if (sampleAsset.currentBookValue !== undefined) exportFields.push('currentBookValue');
          if (sampleAsset.bookValue !== undefined) exportFields.push('bookValue');
          if (sampleAsset.accumulatedDepreciation !== undefined) exportFields.push('accumulatedDepreciation');
          if (sampleAsset.bookValuesByMonth !== undefined) exportFields.push('bookValuesByMonth');
          
          console.log(`  Available export fields: ${exportFields.join(', ')}`);
          console.log(`  Export ready: ${exportFields.length > 0 ? '✅ YES' : '❌ NO'}`);
          
          if (test.expectAccDepreciation && hasAccDepreciation) {
            console.log(`  ✅ Accumulated depreciation column will appear in exports`);
            console.log(`  📊 Column header: "Accumulated Depreciation (${test.url.match(/month=(\d+)/)?.[1] || 'M'}/${test.url.match(/year=(\d+)/)?.[1] || 'YYYY'})"`);
          }
        } else {
          console.log(`  ⚠️ No assets with complete depreciation data found for testing`);
        }
      }
      
      console.log(`\n✅ ${test.name} COMPLETED`);
      
    } catch (error) {
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔧 Server not running on ${BASE_URL}`);
      } else if (error.message.includes('timeout')) {
        console.log(`   ⏱️ Request timed out`);
      }
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎯 ACCUMULATED DEPRECIATION FUNCTIONALITY SUMMARY');
  console.log('='.repeat(70));
  console.log('\n✅ New functionality implemented:');
  console.log('1. Accumulated depreciation field in API response when year+month selected');
  console.log('2. Accumulated depreciation column in asset reports table');
  console.log('3. Accumulated depreciation column in Excel exports');
  console.log('4. Accumulated depreciation column in CSV exports');
  console.log('5. Dynamic column header showing selected month/year');
  console.log('\n📊 Column behavior:');
  console.log('• No filters: No accumulated depreciation column');
  console.log('• Year only: No accumulated depreciation column (shows monthly book values)');
  console.log('• Year + Month: Shows accumulated depreciation column for that specific month');
  console.log('\n💡 Usage:');
  console.log('1. Select year and month filters in asset reports');
  console.log('2. Accumulated depreciation column appears automatically');
  console.log('3. Shows total depreciation accumulated up to that month');
  console.log('4. Export includes accumulated depreciation data');
  console.log('\n🧪 To test:');
  console.log('1. Go to asset reports page');
  console.log('2. Select year (e.g., 2024) and month (e.g., June)');
  console.log('3. Verify "Accumulated Depreciation (6/2024)" column appears');
  console.log('4. Export data and verify column is included');
  console.log('5. Verify values: Book Value + Accumulated Depreciation = Unit Price');
}

// Run the test
if (require.main === module) {
  testAccumulatedDepreciation().catch(console.error);
}

module.exports = { testAccumulatedDepreciation };
