// Quick diagnostic test for depreciation analytics filters
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function quickFilterCheck() {
  console.log('🔍 Quick Depreciation Analytics Filter Check...\n');

  const tests = [
    {
      name: 'No Filters (Baseline)',
      url: '/api/reports/assets',
      description: 'Get baseline data without filters'
    },
    {
      name: 'Asset Age 1-3 Years',
      url: '/api/reports/assets?assetAge=1-3',
      description: 'Test asset age filter'
    },
    {
      name: 'Useful Life 3-5 Years',
      url: '/api/reports/assets?usefulLifeRange=3-5',
      description: 'Test useful life filter'
    },
    {
      name: 'Residual 5-10%',
      url: '/api/reports/assets?residualPercentageRange=5-10',
      description: 'Test residual percentage filter'
    }
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log(`🌐 ${test.url}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await fetch(`${BASE_URL}${test.url}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      console.log(`📊 Results:`);
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets Returned: ${data.assets?.length || 0}`);
      
      // Check filter options
      if (data.filterOptions) {
        console.log(`\n🔧 Available Filter Options:`);
        if (data.filterOptions.assetAge) {
          console.log(`  Asset Age: ${data.filterOptions.assetAge.map(o => o.label).join(', ')}`);
        }
        if (data.filterOptions.usefulLifeRange) {
          console.log(`  Useful Life: ${data.filterOptions.usefulLifeRange.map(o => o.label).join(', ')}`);
        }
        if (data.filterOptions.residualPercentageRange) {
          console.log(`  Residual %: ${data.filterOptions.residualPercentageRange.map(o => o.label).join(', ')}`);
        }
      }
      
      // Show sample asset data
      if (data.assets && data.assets.length > 0) {
        console.log(`\n📋 Sample Assets (first 2):`);
        data.assets.slice(0, 2).forEach((asset, i) => {
          const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
          const now = new Date();
          const ageYears = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
          
          console.log(`  Asset ${i + 1}: ${asset.itemDescription || asset.name || 'Unknown'}`);
          console.log(`    Age: ${ageYears.toFixed(1)} years`);
          console.log(`    Useful Life: ${asset.usefulLifeYears || 'N/A'} years`);
          console.log(`    Residual %: ${asset.residualPercentage || 'N/A'}%`);
          console.log(`    SIV Date: ${asset.sivDate || 'N/A'}`);
        });
      }
      
      console.log(`\n✅ Test completed`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Quick check completed!');
  console.log('='.repeat(60));
}

// Run the test
if (require.main === module) {
  quickFilterCheck().catch(console.error);
}

module.exports = { quickFilterCheck };
