// Test script for depreciation-focused filtering and reporting
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDepreciationFilters() {
  console.log('🧪 Testing Depreciation-Focused Filters and Analytics...\n');

  const testCases = [
    {
      name: 'Basic Asset Reports (No Filters)',
      url: '/api/reports/assets',
      description: 'Test basic asset reports with depreciation analytics'
    },
    {
      name: 'Depreciation Status Filter - Active',
      url: '/api/reports/assets?depreciationStatus=active',
      description: 'Filter assets that are actively depreciating'
    },
    {
      name: 'Depreciation Status Filter - Fully Depreciated',
      url: '/api/reports/assets?depreciationStatus=fully_depreciated',
      description: 'Filter assets that are fully depreciated'
    },
    {
      name: 'Asset Age Filter - 1-3 Years',
      url: '/api/reports/assets?assetAge=1-3',
      description: 'Filter assets that are 1-3 years old'
    },
    {
      name: 'Book Value Range Filter',
      url: '/api/reports/assets?minBookValue=1000&maxBookValue=5000',
      description: 'Filter assets with book value between $1,000 and $5,000'
    },
    {
      name: 'Depreciation Rate Filter',
      url: '/api/reports/assets?minDepreciationRate=20&maxDepreciationRate=80',
      description: 'Filter assets with depreciation rate between 20% and 80%'
    },
    {
      name: 'Useful Life Range Filter',
      url: '/api/reports/assets?usefulLifeRange=3-5',
      description: 'Filter assets with useful life between 3-5 years'
    },
    {
      name: 'SIV Date Range Filter',
      url: '/api/reports/assets?sivDateFrom=2020-01-01&sivDateTo=2023-12-31',
      description: 'Filter assets with SIV date between 2020 and 2023'
    },
    {
      name: 'Depreciation Ending Soon',
      url: '/api/reports/assets?depreciationEndingSoon=true',
      description: 'Filter assets with depreciation ending in next 12 months'
    },
    {
      name: 'Residual Percentage Range',
      url: '/api/reports/assets?residualPercentageRange=5-10',
      description: 'Filter assets with residual percentage between 5-10%'
    },
    {
      name: 'Combined Depreciation Filters',
      url: '/api/reports/assets?depreciationStatus=active&assetAge=1-3&minBookValue=500&depreciationMethod=STRAIGHT_LINE',
      description: 'Test multiple depreciation filters combined'
    },
    {
      name: 'Year-based Book Value Report',
      url: '/api/reports/assets?year=2024',
      description: 'Test monthly book value columns for a specific year'
    },
    {
      name: 'Month-specific Book Value Report',
      url: '/api/reports/assets?year=2024&month=06',
      description: 'Test single book value column for specific month'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🌐 ${testCase.url}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await fetch(`${BASE_URL}${testCase.url}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      // Analyze the response
      console.log('\n📊 Response Analysis:');
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets Found: ${data.assets?.length || 0}`);
      
      // Check depreciation-specific analytics
      if (data.stats) {
        console.log('\n💰 Financial Metrics:');
        console.log(`  Total Purchase Value: $${(data.stats.totalPurchaseValue || 0).toLocaleString()}`);
        console.log(`  Current Book Value: $${(data.stats.totalCurrentBookValue || 0).toLocaleString()}`);
        console.log(`  Accumulated Depreciation: $${(data.stats.totalAccumulatedDepreciation || 0).toLocaleString()}`);
        console.log(`  Average Depreciation Rate: ${(data.stats.averageDepreciationRate || 0).toFixed(1)}%`);
        
        console.log('\n📈 Depreciation Status:');
        console.log(`  Actively Depreciating: ${data.stats.assetsActivelyDepreciating || 0}`);
        console.log(`  Fully Depreciated: ${data.stats.assetsFullyDepreciated || 0}`);
        console.log(`  Not Started: ${data.stats.assetsNotStarted || 0}`);
        console.log(`  Ending in 12 Months: ${data.stats.depreciationEndingIn12Months || 0}`);
        
        if (data.stats.depreciationByMethod && Array.isArray(data.stats.depreciationByMethod)) {
          console.log('\n🔧 By Depreciation Method:');
          data.stats.depreciationByMethod.forEach(method => {
            console.log(`  ${method.method}: ${method.count} assets, $${method.totalValue.toLocaleString()} value, ${method.averageDepreciationRate.toFixed(1)}% avg rate`);
          });
        }
      }
      
      // Check filter options
      if (data.filterOptions) {
        console.log('\n🔍 Available Filter Options:');
        if (data.filterOptions.depreciationStatus) {
          console.log(`  Depreciation Status: ${data.filterOptions.depreciationStatus.map(s => s.label).join(', ')}`);
        }
        if (data.filterOptions.assetAge) {
          console.log(`  Asset Age: ${data.filterOptions.assetAge.map(a => a.label).join(', ')}`);
        }
        if (data.filterOptions.usefulLifeRange) {
          console.log(`  Useful Life: ${data.filterOptions.usefulLifeRange.map(l => l.label).join(', ')}`);
        }
        if (data.filterOptions.residualPercentageRange) {
          console.log(`  Residual %: ${data.filterOptions.residualPercentageRange.map(r => r.label).join(', ')}`);
        }
      }
      
      // Check book value data structure
      if (data.assets && data.assets.length > 0) {
        const firstAsset = data.assets[0];
        console.log('\n📋 Sample Asset Data:');
        console.log(`  Name: ${firstAsset.itemDescription || 'N/A'}`);
        console.log(`  Purchase Price: $${(firstAsset.unitPrice || 0).toLocaleString()}`);
        console.log(`  Current Value: $${(firstAsset.currentValue || 0).toLocaleString()}`);
        console.log(`  Depreciation Method: ${firstAsset.depreciationMethod || 'N/A'}`);
        console.log(`  Useful Life: ${firstAsset.usefulLifeYears || 'N/A'} years`);
        console.log(`  Age: ${firstAsset.age || 'N/A'} years`);
        console.log(`  Depreciation Rate: ${firstAsset.depreciationRate || 'N/A'}%`);
        
        if (firstAsset.bookValue !== undefined) {
          console.log(`  Book Value (specific month): $${(firstAsset.bookValue || 0).toLocaleString()}`);
        }
        
        if (firstAsset.bookValuesByMonth) {
          console.log(`  Monthly Book Values: Available for ${Object.keys(firstAsset.bookValuesByMonth).length} months`);
          const monthlyValues = Object.entries(firstAsset.bookValuesByMonth)
            .slice(0, 3)
            .map(([month, value]) => `Month ${month}: $${Number(value).toLocaleString()}`)
            .join(', ');
          if (monthlyValues) {
            console.log(`    Sample: ${monthlyValues}...`);
          }
        }
      }
      
      // Check pagination
      if (data.pagination) {
        console.log('\n📄 Pagination:');
        console.log(`  Page: ${data.pagination.page} of ${data.pagination.totalPages}`);
        console.log(`  Total Records: ${data.pagination.total}`);
        console.log(`  Per Page: ${data.pagination.limit}`);
      }
      
      console.log('\n✅ Test completed successfully');
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All depreciation filter tests completed!');
  console.log('='.repeat(60));
}

// Run the tests
if (require.main === module) {
  testDepreciationFilters().catch(console.error);
}

module.exports = { testDepreciationFilters };
