// Test to verify monthly book values appear in exports when year-only filter is applied
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMonthlyExportFix() {
  console.log('🔧 Testing Monthly Export Fix (Year-Only Filter)...\n');

  const tests = [
    {
      name: 'Year Only Filter - API Response',
      url: '/api/reports/assets?year=2024',
      description: 'Test API returns bookValuesByMonth data for year-only filter',
      checkType: 'api'
    },
    {
      name: 'Year + Month Filter - API Response',
      url: '/api/reports/assets?year=2024&month=6',
      description: 'Test API returns bookValue and accumulatedDepreciation for year+month filter',
      checkType: 'api'
    },
    {
      name: 'No Filter - API Response',
      url: '/api/reports/assets',
      description: 'Test API returns currentBookValue for no filter',
      checkType: 'api'
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
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
      
      if (assets.length > 0) {
        const sampleAsset = assets[0];
        console.log(`\n📋 Sample Asset Analysis:`);
        console.log(`  Asset ID: ${sampleAsset.id}`);
        console.log(`  Name: ${sampleAsset.name || 'N/A'}`);
        console.log(`  Unit Price: $${(sampleAsset.unitPrice || 0).toLocaleString()}`);
        
        // Check for different book value fields based on filter type
        if (test.url.includes('year=') && test.url.includes('month=')) {
          // Year + Month: Should have bookValue and accumulatedDepreciation
          console.log(`\n📊 Year+Month Filter Fields:`);
          console.log(`  Has bookValue: ${sampleAsset.bookValue !== undefined ? '✅ YES' : '❌ NO'}`);
          console.log(`  Has accumulatedDepreciation: ${sampleAsset.accumulatedDepreciation !== undefined ? '✅ YES' : '❌ NO'}`);
          console.log(`  Has bookValuesByMonth: ${sampleAsset.bookValuesByMonth !== undefined ? '❌ NO (correct)' : '✅ NO (correct)'}`);
          
          if (sampleAsset.bookValue !== undefined) {
            console.log(`    Book Value: $${Number(sampleAsset.bookValue).toLocaleString()}`);
          }
          if (sampleAsset.accumulatedDepreciation !== undefined) {
            console.log(`    Accumulated Depreciation: $${Number(sampleAsset.accumulatedDepreciation).toLocaleString()}`);
          }
          
        } else if (test.url.includes('year=') && !test.url.includes('month=')) {
          // Year Only: Should have bookValuesByMonth
          console.log(`\n📊 Year-Only Filter Fields:`);
          console.log(`  Has bookValuesByMonth: ${sampleAsset.bookValuesByMonth !== undefined ? '✅ YES' : '❌ NO'}`);
          console.log(`  Has bookValue: ${sampleAsset.bookValue !== undefined ? '❌ NO (correct)' : '✅ NO (correct)'}`);
          console.log(`  Has accumulatedDepreciation: ${sampleAsset.accumulatedDepreciation !== undefined ? '❌ NO (correct)' : '✅ NO (correct)'}`);
          
          if (sampleAsset.bookValuesByMonth) {
            const monthlyData = sampleAsset.bookValuesByMonth;
            const monthCount = Object.keys(monthlyData).length;
            console.log(`    Monthly data points: ${monthCount}/12`);
            
            if (monthCount > 0) {
              console.log(`    Sample monthly values:`);
              [1, 6, 12].forEach(month => {
                const value = monthlyData[month];
                const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'short' });
                console.log(`      ${monthName}: ${value !== undefined ? `$${Number(value).toLocaleString()}` : 'N/A'}`);
              });
              
              // Check if values are reasonable
              const values = Object.values(monthlyData).filter(v => v !== undefined && v !== null);
              const hasReasonableValues = values.length > 0 && values.every(v => Number(v) >= 0);
              console.log(`    Values reasonable: ${hasReasonableValues ? '✅ YES' : '❌ NO'}`);
              
              // Check for export readiness
              const exportReady = monthCount >= 6; // At least half the year
              console.log(`    Export ready: ${exportReady ? '✅ YES' : '⚠️ PARTIAL'}`);
              
              if (!exportReady) {
                console.log(`      ⚠️ Only ${monthCount} months available - exports may have blank columns`);
              }
            } else {
              console.log(`    ❌ No monthly data available - exports will be blank`);
            }
          } else {
            console.log(`    ❌ bookValuesByMonth field missing - exports will fail`);
          }
          
        } else {
          // No Filter: Should have currentBookValue
          console.log(`\n📊 No Filter Fields:`);
          console.log(`  Has currentBookValue: ${sampleAsset.currentBookValue !== undefined ? '✅ YES' : '❌ NO'}`);
          console.log(`  Has bookValue: ${sampleAsset.bookValue !== undefined ? '❌ NO (correct)' : '✅ NO (correct)'}`);
          console.log(`  Has bookValuesByMonth: ${sampleAsset.bookValuesByMonth !== undefined ? '❌ NO (correct)' : '✅ NO (correct)'}`);
          
          if (sampleAsset.currentBookValue !== undefined) {
            console.log(`    Current Book Value: $${Number(sampleAsset.currentBookValue).toLocaleString()}`);
          }
        }
        
        // Check debug fields if present
        if (sampleAsset._debug_hasMonthlyData !== undefined) {
          console.log(`\n🔍 Debug Information:`);
          console.log(`  Debug hasMonthlyData: ${sampleAsset._debug_hasMonthlyData}`);
          console.log(`  Debug monthlyDataKeys: ${sampleAsset._debug_monthlyDataKeys?.join(', ') || 'none'}`);
        }
        
        // Export simulation test
        console.log(`\n🔧 Export Simulation:`);
        if (test.url.includes('year=') && !test.url.includes('month=')) {
          // Simulate monthly export columns
          const monthlyExportData = [];
          if (sampleAsset.bookValuesByMonth) {
            for (let month = 1; month <= 12; month++) {
              const monthValue = sampleAsset.bookValuesByMonth[month];
              const exportValue = monthValue !== undefined && monthValue !== null 
                ? Number(monthValue).toFixed(2) 
                : '';
              monthlyExportData.push(exportValue);
            }
          }
          
          const nonEmptyColumns = monthlyExportData.filter(val => val !== '').length;
          console.log(`  Monthly export columns: ${nonEmptyColumns}/12 have data`);
          console.log(`  Sample export values: [${monthlyExportData.slice(0, 6).map(v => v || 'empty').join(', ')}...]`);
          
          if (nonEmptyColumns === 0) {
            console.log(`  ❌ EXPORT ISSUE: All monthly columns will be empty`);
          } else if (nonEmptyColumns < 6) {
            console.log(`  ⚠️ EXPORT WARNING: Many monthly columns will be empty`);
          } else {
            console.log(`  ✅ EXPORT OK: Monthly columns will have data`);
          }
        }
        
        // Check multiple assets for consistency
        if (assets.length > 1) {
          console.log(`\n📊 Multiple Assets Check:`);
          const assetsWithMonthlyData = assets.filter(asset => 
            asset.bookValuesByMonth && Object.keys(asset.bookValuesByMonth).length > 0
          ).length;
          
          console.log(`  Assets with monthly data: ${assetsWithMonthlyData}/${assets.length}`);
          
          if (test.url.includes('year=') && !test.url.includes('month=')) {
            const expectedMonthlyAssets = assets.filter(asset => 
              asset.sivDate && asset.unitPrice > 0
            ).length;
            
            console.log(`  Assets expected to have monthly data: ${expectedMonthlyAssets}`);
            console.log(`  Coverage: ${expectedMonthlyAssets > 0 ? Math.round((assetsWithMonthlyData / expectedMonthlyAssets) * 100) : 0}%`);
            
            if (assetsWithMonthlyData < expectedMonthlyAssets * 0.5) {
              console.log(`  ❌ LOW COVERAGE: Many assets missing monthly data`);
            } else {
              console.log(`  ✅ GOOD COVERAGE: Most assets have monthly data`);
            }
          }
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
  console.log('🎯 MONTHLY EXPORT FIX ANALYSIS');
  console.log('='.repeat(70));
  console.log('\n📊 Expected behavior:');
  console.log('• No filter: currentBookValue field → single "Book Value" column in export');
  console.log('• Year only: bookValuesByMonth field → 12 monthly columns in export');
  console.log('• Year + Month: bookValue + accumulatedDepreciation fields → 2 columns in export');
  console.log('\n🔧 Export column mapping:');
  console.log('• Year only filter: "Jan 2024 Book Value", "Feb 2024 Book Value", ..., "Dec 2024 Book Value"');
  console.log('• Year + Month filter: "Book Value", "Accumulated Depreciation (6/2024)"');
  console.log('\n🧪 To test exports:');
  console.log('1. Apply year-only filter (e.g., 2024)');
  console.log('2. Export to Excel/CSV');
  console.log('3. Verify 12 monthly book value columns have data');
  console.log('4. Apply year+month filter (e.g., 2024 + June)');
  console.log('5. Export to Excel/CSV');
  console.log('6. Verify book value and accumulated depreciation columns have data');
  console.log('\n💡 If monthly columns are empty:');
  console.log('1. Check server console for "bookValuesByAsset" debug logs');
  console.log('2. Verify assets have sivDate and unitPrice > 0');
  console.log('3. Check browser console for export debug logs');
  console.log('4. Ensure API is returning bookValuesByMonth field for year-only filters');
}

// Run the test
if (require.main === module) {
  testMonthlyExportFix().catch(console.error);
}

module.exports = { testMonthlyExportFix };
