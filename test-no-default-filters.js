// Test script to verify no default filters are applied
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testNoDefaultFilters() {
  console.log('🧪 Testing No Default Filters...\n');

  try {
    console.log('🔍 Testing API call without any parameters...');
    
    // Test 1: Call API with no parameters at all
    const response1 = await fetch(`${BASE_URL}/api/reports/assets`);
    
    if (!response1.ok) {
      console.log(`❌ HTTP Error: ${response1.status} ${response1.statusText}`);
      return;
    }

    const data1 = await response1.json();
    
    console.log('\n📊 API Response Analysis (No Parameters):');
    console.log(`  Total Assets: ${data1.stats?.totalAssets || 0}`);
    console.log(`  Assets in Response: ${data1.assets?.length || 0}`);
    
    // Test 2: Call API with only pagination parameters
    console.log('\n🔍 Testing API call with only pagination parameters...');
    
    const response2 = await fetch(`${BASE_URL}/api/reports/assets?page=1&limit=25`);
    
    if (!response2.ok) {
      console.log(`❌ HTTP Error: ${response2.status} ${response2.statusText}`);
      return;
    }

    const data2 = await response2.json();
    
    console.log('\n📊 API Response Analysis (Pagination Only):');
    console.log(`  Total Assets: ${data2.stats?.totalAssets || 0}`);
    console.log(`  Assets in Response: ${data2.assets?.length || 0}`);
    
    // Compare results
    const sameResults = data1.stats?.totalAssets === data2.stats?.totalAssets;
    console.log(`\n✅ Results Consistency: ${sameResults ? 'PASS' : 'FAIL'}`);
    
    if (!sameResults) {
      console.log('⚠️ Different results suggest default filters are being applied');
    }
    
    // Test 3: Check if any filters are being applied by default
    console.log('\n🔍 Checking for default filters in response...');
    
    if (data1.filterOptions) {
      console.log('  Available filter options received ✅');
    }
    
    // Check if response indicates any active filters
    const hasActiveFilters = data1.activeFilters && data1.activeFilters.length > 0;
    console.log(`  Active filters in response: ${hasActiveFilters ? 'YES ❌' : 'NO ✅'}`);
    
    if (hasActiveFilters) {
      console.log(`  Active filters: ${data1.activeFilters.join(', ')}`);
    }
    
    // Test 4: Check individual asset data
    if (data1.assets && data1.assets.length > 0) {
      console.log('\n📋 Sample Asset Analysis:');
      const sampleAsset = data1.assets[0];
      
      console.log(`  Asset: ${sampleAsset.itemDescription || sampleAsset.name || 'Unknown'}`);
      console.log(`  Status: ${sampleAsset.status || 'Unknown'}`);
      console.log(`  Category: ${sampleAsset.category || 'Unknown'}`);
      console.log(`  Department: ${sampleAsset.currentDepartment || 'Unknown'}`);
      console.log(`  Has currentBookValue: ${sampleAsset.currentBookValue !== undefined ? 'YES ✅' : 'NO'}`);
      
      if (sampleAsset.currentBookValue !== undefined) {
        console.log(`  Current Book Value: $${sampleAsset.currentBookValue.toLocaleString()}`);
      }
    }
    
    // Test 5: Verify no status filter is applied by checking asset statuses
    if (data1.assets && data1.assets.length > 0) {
      const statuses = [...new Set(data1.assets.map(asset => asset.status))];
      console.log(`\n📊 Asset Statuses Found: ${statuses.join(', ')}`);
      
      if (statuses.length === 1 && statuses[0] === 'ACTIVE') {
        console.log('⚠️ Only ACTIVE assets found - might indicate default status filter');
      } else if (statuses.length > 1) {
        console.log('✅ Multiple statuses found - no default status filter applied');
      }
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Error details: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testNoDefaultFilters().catch(console.error);
}

module.exports = { testNoDefaultFilters };
