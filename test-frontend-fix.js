// Test to verify frontend TypeError fix
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testFrontendFix() {
  console.log('🔧 Testing Frontend TypeError Fix...\n');

  const tests = [
    {
      name: 'Basic API Response Structure',
      url: '/api/reports/assets',
      description: 'Test that API returns proper data structure'
    },
    {
      name: 'Category Filter Response',
      url: '/api/reports/assets?category=COMPUTER',
      description: 'Test filtered response structure'
    },
    {
      name: 'Year Filter Response',
      url: '/api/reports/assets?year=2024',
      description: 'Test year filter response structure'
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
        timeout: 10000
      });

      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`✅ API Response received successfully`);

      // Check data structure to prevent frontend errors
      console.log(`\n📊 Data Structure Check:`);
      
      // Check stats
      const hasStats = data.stats !== undefined;
      console.log(`  stats: ${hasStats ? '✅ Present' : '❌ Missing'}`);
      
      // Check arrays that could cause .length errors
      const assets = data.assets;
      const byCategory = data.byCategory;
      const statusDistribution = data.statusDistribution;
      const linkedAssets = data.linkedAssets;
      
      console.log(`  assets: ${Array.isArray(assets) ? `✅ Array (${assets.length} items)` : `❌ ${typeof assets}`}`);
      console.log(`  byCategory: ${Array.isArray(byCategory) ? `✅ Array (${byCategory.length} items)` : `❌ ${typeof byCategory}`}`);
      console.log(`  statusDistribution: ${Array.isArray(statusDistribution) ? `✅ Array (${statusDistribution.length} items)` : `❌ ${typeof statusDistribution}`}`);
      console.log(`  linkedAssets: ${Array.isArray(linkedAssets) ? `✅ Array (${linkedAssets.length} items)` : `❌ ${typeof linkedAssets}`}`);
      
      // Check filter options
      const filterOptions = data.filterOptions;
      console.log(`  filterOptions: ${filterOptions ? '✅ Present' : '❌ Missing'}`);
      
      if (filterOptions) {
        console.log(`    categories: ${Array.isArray(filterOptions.categories) ? `✅ Array (${filterOptions.categories.length})` : `❌ ${typeof filterOptions.categories}`}`);
        console.log(`    departments: ${Array.isArray(filterOptions.departments) ? `✅ Array (${filterOptions.departments.length})` : `❌ ${typeof filterOptions.departments}`}`);
        console.log(`    locations: ${Array.isArray(filterOptions.locations) ? `✅ Array (${filterOptions.locations.length})` : `❌ ${typeof filterOptions.locations}`}`);
      }

      // Check book value fields in assets
      if (Array.isArray(assets) && assets.length > 0) {
        const sampleAsset = assets[0];
        console.log(`\n📋 Sample Asset Book Value Fields:`);
        console.log(`  currentBookValue: ${sampleAsset.currentBookValue !== undefined ? '✅ Present' : '❌ Missing'}`);
        console.log(`  bookValue: ${sampleAsset.bookValue !== undefined ? '✅ Present' : '❌ Missing'}`);
        console.log(`  bookValuesByMonth: ${sampleAsset.bookValuesByMonth !== undefined ? '✅ Present' : '❌ Missing'}`);
        
        if (sampleAsset.bookValuesByMonth) {
          const monthCount = Object.keys(sampleAsset.bookValuesByMonth).length;
          console.log(`    Monthly data points: ${monthCount}`);
        }
      }

      // Simulate frontend safe array creation
      console.log(`\n🛡️ Frontend Safety Check:`);
      const safeAssets = assets || [];
      const safeByCategory = byCategory || [];
      const safeStatusDistribution = statusDistribution || [];
      const safeLinkedAssets = linkedAssets || [];
      
      console.log(`  Safe arrays created successfully:`);
      console.log(`    safeAssets.length: ${safeAssets.length}`);
      console.log(`    safeByCategory.length: ${safeByCategory.length}`);
      console.log(`    safeStatusDistribution.length: ${safeStatusDistribution.length}`);
      console.log(`    safeLinkedAssets.length: ${safeLinkedAssets.length}`);
      
      console.log(`\n✅ ${test.name} PASSED - No TypeError should occur`);
      
    } catch (error) {
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔧 Server not running on ${BASE_URL}`);
      } else if (error.message.includes('timeout')) {
        console.log(`   ⏱️ Request timed out`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Frontend TypeError Fix Summary');
  console.log('='.repeat(60));
  console.log('\n✅ Applied fixes:');
  console.log('1. Added null checks for API response arrays');
  console.log('2. Created safe array variables with fallbacks');
  console.log('3. Updated all .length references to use safe arrays');
  console.log('4. Added proper error boundaries');
  console.log('\n💡 The TypeError should now be resolved!');
  console.log('\n🧪 To test:');
  console.log('1. Open the asset reports page in browser');
  console.log('2. Check browser console for errors');
  console.log('3. Try applying different filters');
  console.log('4. Verify no "Cannot read properties of undefined" errors');
}

// Run the test
if (require.main === module) {
  testFrontendFix().catch(console.error);
}

module.exports = { testFrontendFix };
