// Test to verify React object rendering error fix
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testReactErrorFix() {
  console.log('🔧 Testing React Object Rendering Error Fix...\n');

  const tests = [
    {
      name: 'Basic API Response Structure',
      url: '/api/reports/assets',
      description: 'Test API returns proper data structure for React'
    },
    {
      name: 'Filter Options Structure',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test filter options are in correct format'
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await fetch(`${BASE_URL}${test.url}`, {
        timeout: 15000
      });

      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ API Response received successfully`);

      // Check data structure to prevent React errors
      console.log(`\n📊 Data Structure Validation:`);
      
      // Check required arrays
      const requiredArrays = ['assets', 'byCategory', 'statusDistribution', 'linkedAssets'];
      requiredArrays.forEach(arrayName => {
        const arrayData = data[arrayName];
        const isValid = Array.isArray(arrayData);
        console.log(`  ${arrayName}: ${isValid ? `✅ Array (${arrayData.length} items)` : `❌ ${typeof arrayData}`}`);
      });
      
      // Check stats object
      const hasStats = data.stats && typeof data.stats === 'object';
      console.log(`  stats: ${hasStats ? '✅ Object' : `❌ ${typeof data.stats}`}`);
      
      // Check filter options structure (this was causing the React error)
      console.log(`\n🔍 Filter Options Validation:`);
      const filterOptions = data.filterOptions;
      
      if (filterOptions && typeof filterOptions === 'object') {
        console.log(`  filterOptions: ✅ Object present`);
        
        // Check each filter option type
        const stringArrayFields = ['categories', 'departments', 'locations', 'depreciationMethods'];
        stringArrayFields.forEach(field => {
          const fieldData = filterOptions[field];
          const isStringArray = Array.isArray(fieldData) && fieldData.every(item => typeof item === 'string');
          console.log(`    ${field}: ${isStringArray ? `✅ String array (${fieldData.length})` : `❌ ${typeof fieldData} ${Array.isArray(fieldData) ? '(contains objects)' : ''}`}`);
          
          if (Array.isArray(fieldData) && fieldData.length > 0) {
            const sampleItem = fieldData[0];
            console.log(`      Sample: ${typeof sampleItem === 'string' ? `"${sampleItem}"` : JSON.stringify(sampleItem)}`);
          }
        });
        
        // Check object array fields (these should have {value, label} structure)
        const objectArrayFields = ['assetAge', 'usefulLifeRange', 'residualPercentageRange'];
        objectArrayFields.forEach(field => {
          const fieldData = filterOptions[field];
          const isObjectArray = Array.isArray(fieldData) && fieldData.every(item => 
            typeof item === 'object' && item.value && item.label
          );
          console.log(`    ${field}: ${isObjectArray ? `✅ Object array (${fieldData.length})` : `❌ ${typeof fieldData}`}`);
          
          if (Array.isArray(fieldData) && fieldData.length > 0) {
            const sampleItem = fieldData[0];
            console.log(`      Sample: ${JSON.stringify(sampleItem)}`);
          }
        });
      } else {
        console.log(`  filterOptions: ❌ Missing or invalid`);
      }
      
      // Check performance (asset count)
      const assetCount = data.assets ? data.assets.length : 0;
      console.log(`\n⚡ Performance Check:`);
      console.log(`  Asset count: ${assetCount}`);
      console.log(`  Performance: ${assetCount <= 1000 ? '✅ Good (≤1000)' : assetCount <= 5000 ? '⚠️ Moderate (≤5000)' : '❌ Poor (>5000)'}`);
      
      // Check book value fields
      if (data.assets && data.assets.length > 0) {
        const sampleAsset = data.assets[0];
        console.log(`\n📋 Book Value Fields Check:`);
        console.log(`  currentBookValue: ${sampleAsset.currentBookValue !== undefined ? '✅ Present' : '❌ Missing'}`);
        console.log(`  bookValue: ${sampleAsset.bookValue !== undefined ? '✅ Present' : '❌ Missing'}`);
        console.log(`  bookValuesByMonth: ${sampleAsset.bookValuesByMonth !== undefined ? '✅ Present' : '❌ Missing'}`);
      }
      
      // Validate React compatibility
      console.log(`\n⚛️ React Compatibility Check:`);
      let reactCompatible = true;
      let issues = [];
      
      // Check if any filter options contain objects that might be rendered directly
      if (filterOptions) {
        ['categories', 'departments', 'locations', 'depreciationMethods'].forEach(field => {
          const fieldData = filterOptions[field];
          if (Array.isArray(fieldData)) {
            const hasObjects = fieldData.some(item => typeof item === 'object');
            if (hasObjects) {
              reactCompatible = false;
              issues.push(`${field} contains objects instead of strings`);
            }
          }
        });
      }
      
      if (reactCompatible) {
        console.log(`  ✅ React compatible - no objects in string arrays`);
      } else {
        console.log(`  ❌ React compatibility issues:`);
        issues.forEach(issue => console.log(`    - ${issue}`));
      }
      
      console.log(`\n${reactCompatible ? '✅' : '❌'} ${test.name} ${reactCompatible ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔧 Server not running on ${BASE_URL}`);
      } else if (error.message.includes('timeout')) {
        console.log(`   ⏱️ Request timed out - API might be slow`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 React Error Fix Summary');
  console.log('='.repeat(60));
  console.log('\n✅ Applied fixes:');
  console.log('1. Limited API to 1000 assets for performance');
  console.log('2. Fixed filter options to return string arrays instead of object arrays');
  console.log('3. Added missing byCategory and statusDistribution data');
  console.log('4. Added proper data structure validation');
  console.log('\n💡 The React object rendering error should now be resolved!');
  console.log('\n🧪 To test:');
  console.log('1. Open the asset reports page in browser');
  console.log('2. Check browser console for React errors');
  console.log('3. Verify page loads without "Objects are not valid as a React child" error');
  console.log('4. Test filter functionality');
}

// Run the test
if (require.main === module) {
  testReactErrorFix().catch(console.error);
}

module.exports = { testReactErrorFix };
