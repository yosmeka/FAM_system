// Simple test script to verify filtering functionality
const testFiltering = async () => {
  const baseUrl = 'http://localhost:3000/api/reports/assets';
  
  console.log('🧪 Testing Asset Reports API Filtering...\n');

  // Test scenarios
  const testCases = [
    {
      name: 'No Filters (Baseline)',
      url: baseUrl,
      expected: 'Should return all assets'
    },
    {
      name: 'Category Filter',
      url: `${baseUrl}?category=Electronics`,
      expected: 'Should return only Electronics assets'
    },
    {
      name: 'Status Filter',
      url: `${baseUrl}?status=ACTIVE`,
      expected: 'Should return only active assets'
    },
    {
      name: 'Multiple Filters',
      url: `${baseUrl}?category=Electronics&status=ACTIVE`,
      expected: 'Should return only active Electronics assets'
    },
    {
      name: 'Date Range Filter',
      url: `${baseUrl}?startDate=2023-01-01&endDate=2023-12-31`,
      expected: 'Should return assets purchased in 2023'
    },
    {
      name: 'Value Range Filter',
      url: `${baseUrl}?minValue=1000&maxValue=5000`,
      expected: 'Should return assets valued between $1,000-$5,000'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 ${testCase.name}`);
      console.log(`🔗 URL: ${testCase.url}`);
      console.log(`📝 Expected: ${testCase.expected}`);
      
      const response = await fetch(testCase.url);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Results:`);
      console.log(`   - Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`   - Active Assets: ${data.stats?.activeAssets || 0}`);
      console.log(`   - Categories: ${data.byCategory?.length || 0}`);
      console.log(`   - Depreciation Points: ${data.depreciation?.length || 0}`);
      
      if (data.byCategory && data.byCategory.length > 0) {
        console.log(`   - Sample Categories: ${data.byCategory.slice(0, 3).map(c => c.category).join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Filtering test completed!');
};

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testFiltering().catch(console.error);
} else {
  // Browser environment
  window.testFiltering = testFiltering;
  console.log('Test function available as window.testFiltering()');
}

module.exports = { testFiltering };
