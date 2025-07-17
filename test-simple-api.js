// Simple test to check basic API functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testSimpleApi() {
  console.log('🔧 Testing Simple API...\n');

  try {
    console.log('⏱️ Testing basic API call...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${BASE_URL}/api/reports/assets`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`📄 Error: ${errorText.substring(0, 200)}`);
      return;
    }

    console.log(`✅ HTTP Status: ${response.status}`);
    
    const data = await response.json();
    console.log(`✅ JSON parsed successfully`);
    
    console.log(`\n📊 Basic Response Check:`);
    console.log(`  Has stats: ${data.stats ? '✅' : '❌'}`);
    console.log(`  Has assets: ${data.assets ? '✅' : '❌'}`);
    console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
    console.log(`  Assets Returned: ${data.assets?.length || 0}`);
    
    if (data.assets && data.assets.length > 0) {
      const asset = data.assets[0];
      console.log(`\n📋 Sample Asset:`);
      console.log(`  ID: ${asset.id}`);
      console.log(`  Name: ${asset.name || 'N/A'}`);
      console.log(`  Category: ${asset.category || 'N/A'}`);
      console.log(`  Unit Price: $${(asset.unitPrice || 0).toLocaleString()}`);
      console.log(`  Current Value: $${(asset.currentValue || 0).toLocaleString()}`);
      
      // Check book value fields
      console.log(`\n📊 Book Value Fields:`);
      console.log(`  currentBookValue: ${asset.currentBookValue !== undefined ? `$${Number(asset.currentBookValue).toLocaleString()}` : 'Not present'}`);
      console.log(`  bookValue: ${asset.bookValue !== undefined ? `$${Number(asset.bookValue).toLocaleString()}` : 'Not present'}`);
      console.log(`  bookValuesByMonth: ${asset.bookValuesByMonth ? 'Present' : 'Not present'}`);
    }
    
    console.log(`\n✅ Basic API test PASSED`);
    
    // Test with simple filter
    console.log(`\n⏱️ Testing with category filter...`);
    
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
    
    const response2 = await fetch(`${BASE_URL}/api/reports/assets?category=COMPUTER`, {
      signal: controller2.signal
    });
    
    clearTimeout(timeoutId2);
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`✅ Category filter test PASSED`);
      console.log(`  Filtered Assets: ${data2.assets?.length || 0}`);
    } else {
      console.log(`❌ Category filter test FAILED: ${response2.status}`);
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ Request timed out - API is hanging`);
      console.log(`🔧 Possible causes:`);
      console.log(`   - Infinite loop in book value calculations`);
      console.log(`   - Database connection issues`);
      console.log(`   - Memory issues with large datasets`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ Server not running on ${BASE_URL}`);
      console.log(`🔧 Start the server with: npm run dev`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testSimpleApi().catch(console.error);
}

module.exports = { testSimpleApi };
