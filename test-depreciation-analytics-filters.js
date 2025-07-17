// Test script for Depreciation Analytics Filters: Asset Age, Useful Life, Residual Percentage
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDepreciationAnalyticsFilters() {
  console.log('🧪 Testing Depreciation Analytics Filters...\n');

  const testCases = [
    {
      name: 'Asset Age Filter - 0-1 Years',
      url: '/api/reports/assets?assetAge=0-1',
      description: 'Filter assets that are 0-1 years old',
      expectedBehavior: 'Should return only assets with age between 0-1 years'
    },
    {
      name: 'Asset Age Filter - 1-3 Years',
      url: '/api/reports/assets?assetAge=1-3',
      description: 'Filter assets that are 1-3 years old',
      expectedBehavior: 'Should return only assets with age between 1-3 years'
    },
    {
      name: 'Asset Age Filter - 3-5 Years',
      url: '/api/reports/assets?assetAge=3-5',
      description: 'Filter assets that are 3-5 years old',
      expectedBehavior: 'Should return only assets with age between 3-5 years'
    },
    {
      name: 'Asset Age Filter - 5+ Years',
      url: '/api/reports/assets?assetAge=5%2B',
      description: 'Filter assets that are 5+ years old',
      expectedBehavior: 'Should return only assets with age 5 years or more'
    },
    {
      name: 'Useful Life Filter - 1-3 Years',
      url: '/api/reports/assets?usefulLifeRange=1-3',
      description: 'Filter assets with useful life 1-3 years',
      expectedBehavior: 'Should return only assets with usefulLifeYears between 1-3'
    },
    {
      name: 'Useful Life Filter - 3-5 Years',
      url: '/api/reports/assets?usefulLifeRange=3-5',
      description: 'Filter assets with useful life 3-5 years',
      expectedBehavior: 'Should return only assets with usefulLifeYears between 3-5'
    },
    {
      name: 'Useful Life Filter - 5-10 Years',
      url: '/api/reports/assets?usefulLifeRange=5-10',
      description: 'Filter assets with useful life 5-10 years',
      expectedBehavior: 'Should return only assets with usefulLifeYears between 5-10'
    },
    {
      name: 'Useful Life Filter - 10+ Years',
      url: '/api/reports/assets?usefulLifeRange=10%2B',
      description: 'Filter assets with useful life 10+ years',
      expectedBehavior: 'Should return only assets with usefulLifeYears 10 or more'
    },
    {
      name: 'Residual Percentage Filter - 0-5%',
      url: '/api/reports/assets?residualPercentageRange=0-5',
      description: 'Filter assets with residual percentage 0-5%',
      expectedBehavior: 'Should return only assets with residualPercentage between 0-5%'
    },
    {
      name: 'Residual Percentage Filter - 5-10%',
      url: '/api/reports/assets?residualPercentageRange=5-10',
      description: 'Filter assets with residual percentage 5-10%',
      expectedBehavior: 'Should return only assets with residualPercentage between 5-10%'
    },
    {
      name: 'Residual Percentage Filter - 10-20%',
      url: '/api/reports/assets?residualPercentageRange=10-20',
      description: 'Filter assets with residual percentage 10-20%',
      expectedBehavior: 'Should return only assets with residualPercentage between 10-20%'
    },
    {
      name: 'Residual Percentage Filter - 20%+',
      url: '/api/reports/assets?residualPercentageRange=20%2B',
      description: 'Filter assets with residual percentage 20%+',
      expectedBehavior: 'Should return only assets with residualPercentage 20% or more'
    },
    {
      name: 'Combined Filters - Age + Useful Life',
      url: '/api/reports/assets?assetAge=1-3&usefulLifeRange=3-5',
      description: 'Combine asset age and useful life filters',
      expectedBehavior: 'Should return assets that match both criteria'
    },
    {
      name: 'Combined Filters - All Three',
      url: '/api/reports/assets?assetAge=1-3&usefulLifeRange=3-5&residualPercentageRange=5-10',
      description: 'Combine all three depreciation analytics filters',
      expectedBehavior: 'Should return assets that match all three criteria'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🎯 Expected: ${testCase.expectedBehavior}`);
    console.log(`🌐 ${testCase.url}`);
    console.log(`${'='.repeat(80)}`);

    try {
      const response = await fetch(`${BASE_URL}${testCase.url}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      // Extract filter parameters from URL
      const urlParams = new URLSearchParams(testCase.url.split('?')[1] || '');
      const assetAge = urlParams.get('assetAge');
      const usefulLifeRange = urlParams.get('usefulLifeRange');
      const residualPercentageRange = urlParams.get('residualPercentageRange');
      
      console.log('\n📊 Filter Analysis:');
      console.log(`  Asset Age Filter: ${assetAge || 'None'}`);
      console.log(`  Useful Life Filter: ${usefulLifeRange || 'None'}`);
      console.log(`  Residual % Filter: ${residualPercentageRange || 'None'}`);
      console.log(`  Total Assets Found: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets in Response: ${data.assets?.length || 0}`);
      
      if (data.assets && data.assets.length > 0) {
        console.log('\n🔍 Asset Validation:');
        
        let validAssets = 0;
        let invalidAssets = 0;
        const validationErrors = [];
        
        data.assets.forEach((asset, index) => {
          const assetName = asset.itemDescription || asset.name || `Asset ${index + 1}`;
          let isValid = true;
          const errors = [];
          
          // Calculate asset age
          const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
          const now = new Date();
          const assetAgeYears = sivDate ? Math.max(0, (now - sivDate) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
          
          // Validate Asset Age filter
          if (assetAge) {
            const ageRanges = {
              '0-1': [0, 1],
              '1-3': [1, 3],
              '3-5': [3, 5],
              '5+': [5, Infinity]
            };
            const [minAge, maxAge] = ageRanges[assetAge] || [0, Infinity];
            
            if (assetAgeYears < minAge || assetAgeYears > maxAge) {
              isValid = false;
              errors.push(`Age ${assetAgeYears.toFixed(1)}y not in range ${minAge}-${maxAge === Infinity ? '∞' : maxAge}y`);
            }
          }
          
          // Validate Useful Life filter
          if (usefulLifeRange) {
            const usefulLife = asset.usefulLifeYears || 0;
            const lifeRanges = {
              '1-3': [1, 3],
              '3-5': [3, 5],
              '5-10': [5, 10],
              '10+': [10, Infinity]
            };
            const [minLife, maxLife] = lifeRanges[usefulLifeRange] || [0, Infinity];
            
            if (usefulLife < minLife || usefulLife > maxLife) {
              isValid = false;
              errors.push(`Useful life ${usefulLife}y not in range ${minLife}-${maxLife === Infinity ? '∞' : maxLife}y`);
            }
          }
          
          // Validate Residual Percentage filter
          if (residualPercentageRange) {
            const residualPercentage = asset.residualPercentage || 0;
            const residualRanges = {
              '0-5': [0, 5],
              '5-10': [5, 10],
              '10-20': [10, 20],
              '20+': [20, Infinity]
            };
            const [minResidual, maxResidual] = residualRanges[residualPercentageRange] || [0, Infinity];
            
            if (residualPercentage < minResidual || residualPercentage > maxResidual) {
              isValid = false;
              errors.push(`Residual ${residualPercentage}% not in range ${minResidual}-${maxResidual === Infinity ? '∞' : maxResidual}%`);
            }
          }
          
          if (isValid) {
            validAssets++;
          } else {
            invalidAssets++;
            if (validationErrors.length < 3) { // Show only first 3 errors
              validationErrors.push(`${assetName}: ${errors.join(', ')}`);
            }
          }
          
          // Show details for first few assets
          if (index < 3) {
            console.log(`  Asset ${index + 1}: ${assetName}`);
            console.log(`    Age: ${assetAgeYears.toFixed(1)} years`);
            console.log(`    Useful Life: ${asset.usefulLifeYears || 'N/A'} years`);
            console.log(`    Residual %: ${asset.residualPercentage || 'N/A'}%`);
            console.log(`    SIV Date: ${asset.sivDate || 'N/A'}`);
            console.log(`    Validation: ${isValid ? '✅ Pass' : '❌ Fail'}`);
            if (!isValid) {
              console.log(`    Errors: ${errors.join(', ')}`);
            }
          }
        });
        
        console.log(`\n📊 Validation Summary:`);
        console.log(`  Valid Assets: ${validAssets}/${data.assets.length} (${((validAssets / data.assets.length) * 100).toFixed(1)}%)`);
        console.log(`  Invalid Assets: ${invalidAssets}/${data.assets.length} (${((invalidAssets / data.assets.length) * 100).toFixed(1)}%)`);
        
        if (invalidAssets > 0) {
          console.log(`\n❌ Validation Errors Found:`);
          validationErrors.forEach(error => console.log(`    ${error}`));
          if (invalidAssets > validationErrors.length) {
            console.log(`    ... and ${invalidAssets - validationErrors.length} more`);
          }
        }
        
        // Overall test result
        const testPassed = invalidAssets === 0;
        console.log(`\n🎯 Test Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
        
      } else {
        console.log('\n📋 No assets found matching the filter criteria');
        console.log('🎯 Test Result: ✅ PASS (No assets to validate)');
      }
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Depreciation Analytics Filters testing completed!');
  console.log('='.repeat(80));
}

// Run the tests
if (require.main === module) {
  testDepreciationAnalyticsFilters().catch(console.error);
}

module.exports = { testDepreciationAnalyticsFilters };
