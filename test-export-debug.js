// Test to debug why monthly export columns are empty
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testExportDebug() {
  console.log('🔧 Testing Export Debug - Why Monthly Columns Are Empty...\n');

  const test = {
    name: 'Year Only Filter - Monthly Data Check',
    url: '/api/reports/assets?year=2024',
    description: 'Debug why monthly export columns are empty despite table showing data'
  };

  console.log(`${'='.repeat(70)}`);
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
      return;
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
      console.log(`\n🔍 Detailed Monthly Data Analysis:`);
      
      // Check first 5 assets for monthly data
      const assetsToCheck = assets.slice(0, 5);
      
      assetsToCheck.forEach((asset, index) => {
        console.log(`\n📋 Asset ${index + 1}: ${asset.name || 'Unnamed'} (ID: ${asset.id})`);
        console.log(`  Unit Price: $${(asset.unitPrice || 0).toLocaleString()}`);
        console.log(`  SIV Date: ${asset.sivDate || 'N/A'}`);
        console.log(`  Useful Life: ${asset.usefulLifeYears || 'N/A'} years`);
        
        // Check bookValuesByMonth field
        console.log(`  Has bookValuesByMonth: ${asset.bookValuesByMonth !== undefined ? '✅ YES' : '❌ NO'}`);
        
        if (asset.bookValuesByMonth) {
          const monthlyData = asset.bookValuesByMonth;
          const monthCount = Object.keys(monthlyData).length;
          console.log(`  Monthly data points: ${monthCount}/12`);
          console.log(`  Monthly data type: ${typeof monthlyData}`);
          console.log(`  Monthly data keys: [${Object.keys(monthlyData).join(', ')}]`);
          
          // Show all 12 months
          console.log(`  Monthly values:`);
          for (let month = 1; month <= 12; month++) {
            const value = monthlyData[month];
            const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'short' });
            const displayValue = value !== undefined && value !== null 
              ? `$${Number(value).toLocaleString()}` 
              : 'undefined';
            console.log(`    ${monthName}: ${displayValue}`);
          }
          
          // Simulate export logic
          console.log(`\n  🔧 Export Simulation:`);
          const exportValues = [];
          for (let i = 0; i < 12; i++) {
            const monthValue = monthlyData[i + 1];
            const exportValue = monthValue !== undefined && monthValue !== null 
              ? Number(monthValue).toFixed(2) 
              : '';
            exportValues.push(exportValue);
          }
          
          const nonEmptyValues = exportValues.filter(v => v !== '').length;
          console.log(`    Export values: [${exportValues.slice(0, 6).map(v => v || 'empty').join(', ')}...]`);
          console.log(`    Non-empty export values: ${nonEmptyValues}/12`);
          
          if (nonEmptyValues === 0) {
            console.log(`    ❌ PROBLEM: All export values are empty!`);
            console.log(`    🔍 Checking data types:`);
            Object.entries(monthlyData).forEach(([month, value]) => {
              console.log(`      Month ${month}: ${typeof value} = ${value}`);
            });
          } else {
            console.log(`    ✅ Export values look good`);
          }
          
        } else {
          console.log(`  ❌ No bookValuesByMonth field - export will be empty`);
          
          // Check for debug fields
          if (asset._debug_hasMonthlyData !== undefined) {
            console.log(`  Debug hasMonthlyData: ${asset._debug_hasMonthlyData}`);
            console.log(`  Debug monthlyDataKeys: ${asset._debug_monthlyDataKeys?.join(', ') || 'none'}`);
            console.log(`  Debug usedFallback: ${asset._debug_usedFallback}`);
          }
        }
      });
      
      // Summary statistics
      console.log(`\n📊 Summary Statistics:`);
      const assetsWithMonthlyData = assets.filter(asset => 
        asset.bookValuesByMonth && Object.keys(asset.bookValuesByMonth).length > 0
      ).length;
      
      const assetsWithCompleteMonthlyData = assets.filter(asset => {
        if (!asset.bookValuesByMonth) return false;
        const monthCount = Object.keys(asset.bookValuesByMonth).length;
        return monthCount >= 6; // At least half the year
      }).length;
      
      const assetsWithValidMonthlyData = assets.filter(asset => {
        if (!asset.bookValuesByMonth) return false;
        const values = Object.values(asset.bookValuesByMonth);
        return values.some(v => v !== undefined && v !== null && Number(v) > 0);
      }).length;
      
      console.log(`  Assets with bookValuesByMonth field: ${assetsWithMonthlyData}/${assets.length}`);
      console.log(`  Assets with complete monthly data (≥6 months): ${assetsWithCompleteMonthlyData}/${assets.length}`);
      console.log(`  Assets with valid monthly values: ${assetsWithValidMonthlyData}/${assets.length}`);
      
      // Export readiness assessment
      console.log(`\n🔧 Export Readiness Assessment:`);
      if (assetsWithValidMonthlyData === 0) {
        console.log(`  ❌ CRITICAL: No assets have valid monthly data - all export columns will be empty`);
        console.log(`  🔍 Possible causes:`);
        console.log(`    1. API not calculating monthly values correctly`);
        console.log(`    2. bookValuesByMonth field not being populated`);
        console.log(`    3. Monthly calculation timeout/limit issues`);
        console.log(`    4. Data type conversion issues`);
      } else if (assetsWithValidMonthlyData < assets.length * 0.5) {
        console.log(`  ⚠️ WARNING: Only ${Math.round((assetsWithValidMonthlyData / assets.length) * 100)}% of assets have valid monthly data`);
        console.log(`  📊 Export will have many empty cells`);
      } else {
        console.log(`  ✅ GOOD: ${Math.round((assetsWithValidMonthlyData / assets.length) * 100)}% of assets have valid monthly data`);
        console.log(`  📊 Export should work correctly`);
      }
      
      // Specific recommendations
      console.log(`\n💡 Recommendations:`);
      if (assetsWithMonthlyData === 0) {
        console.log(`  1. Check server console for "bookValuesByAsset" debug logs`);
        console.log(`  2. Verify API is running year-only calculation logic`);
        console.log(`  3. Check if calculation timeout is preventing monthly calculations`);
      } else if (assetsWithValidMonthlyData === 0) {
        console.log(`  1. Check data types in bookValuesByMonth (should be numbers, not strings)`);
        console.log(`  2. Verify monthly calculation logic is producing valid values`);
        console.log(`  3. Check for null/undefined values in monthly data`);
      } else {
        console.log(`  1. Monthly data looks good - export should work`);
        console.log(`  2. If export is still empty, check frontend export logic`);
        console.log(`  3. Verify browser console for export debug logs`);
      }
    }
    
    console.log(`\n✅ Export Debug Analysis COMPLETED`);
    
  } catch (error) {
    console.log(`❌ Export Debug FAILED: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`   🔧 Server not running on ${BASE_URL}`);
    } else if (error.message.includes('timeout')) {
      console.log(`   ⏱️ Request timed out`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎯 EXPORT DEBUG SUMMARY');
  console.log('='.repeat(70));
  console.log('\n🔍 This test checks:');
  console.log('1. Whether API returns bookValuesByMonth field for year-only filters');
  console.log('2. Whether monthly data contains valid values');
  console.log('3. Whether export simulation produces non-empty values');
  console.log('4. Coverage of assets with valid monthly data');
  console.log('\n📊 Expected for working exports:');
  console.log('• bookValuesByMonth field present on assets');
  console.log('• Monthly data contains 12 months (1-12) with numeric values');
  console.log('• Export simulation produces non-empty strings');
  console.log('• Most assets have valid monthly data');
  console.log('\n🔧 Next steps:');
  console.log('1. Run this test with year-only filter');
  console.log('2. Check the detailed analysis output');
  console.log('3. Follow the specific recommendations');
  console.log('4. Test actual export after fixing any issues found');
}

// Run the test
testExportDebug().catch(console.error);
