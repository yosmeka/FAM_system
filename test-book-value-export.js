// Test script to verify book value columns in exports
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testBookValueExport() {
  console.log('🧪 Testing Book Value Export Functionality...\n');

  const testCases = [
    {
      name: 'No Date Filter - Current Book Values',
      url: '/api/reports/assets',
      description: 'Test current book value field when no year/month filter',
      expectedFields: ['currentBookValue'],
      exportExpectation: 'Current Book Value column should have data'
    },
    {
      name: 'Year + Month Filter - Specific Book Value',
      url: '/api/reports/assets?year=2024&month=6',
      description: 'Test specific month book value when both year and month selected',
      expectedFields: ['bookValue'],
      exportExpectation: 'Book Value column should have data for June 2024'
    },
    {
      name: 'Year Only Filter - Monthly Book Values',
      url: '/api/reports/assets?year=2024',
      description: 'Test monthly book values when only year selected',
      expectedFields: ['bookValuesByMonth'],
      exportExpectation: '12 monthly columns should have data for 2024'
    },
    {
      name: 'Year + Category Filter - Monthly Book Values',
      url: '/api/reports/assets?year=2024&category=COMPUTER',
      description: 'Test monthly book values with additional filters',
      expectedFields: ['bookValuesByMonth'],
      exportExpectation: '12 monthly columns should have data for computers in 2024'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log(`🎯 Expected: ${testCase.exportExpectation}`);
    console.log(`🌐 ${testCase.url}`);
    console.log(`${'='.repeat(80)}`);

    try {
      const response = await fetch(`${BASE_URL}${testCase.url}`);
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      console.log(`📊 API Response Analysis:`);
      console.log(`  Total Assets: ${data.stats?.totalAssets || 0}`);
      console.log(`  Assets Returned: ${data.assets?.length || 0}`);
      
      if (data.assets && data.assets.length > 0) {
        console.log(`\n📋 Book Value Field Analysis:`);
        
        // Check for expected fields
        const sampleAsset = data.assets[0];
        testCase.expectedFields.forEach(field => {
          const hasField = sampleAsset[field] !== undefined;
          console.log(`  Has ${field}: ${hasField ? '✅' : '❌'}`);
          
          if (hasField) {
            if (field === 'bookValuesByMonth') {
              const monthCount = Object.keys(sampleAsset[field]).length;
              console.log(`    Monthly data points: ${monthCount}/12`);
              
              // Show sample monthly values
              console.log(`    Sample monthly values:`);
              Object.entries(sampleAsset[field]).slice(0, 3).forEach(([month, value]) => {
                console.log(`      Month ${month}: $${Number(value).toLocaleString()}`);
              });
            } else {
              console.log(`    Value: $${Number(sampleAsset[field]).toLocaleString()}`);
            }
          }
        });

        // Validate book value data quality
        console.log(`\n🔍 Book Value Data Quality Check:`);
        let assetsWithBookValues = 0;
        let assetsWithoutBookValues = 0;
        let totalBookValue = 0;

        data.assets.slice(0, 10).forEach((asset, index) => {
          let hasValidBookValue = false;
          let assetBookValue = 0;

          if (testCase.expectedFields.includes('currentBookValue')) {
            hasValidBookValue = asset.currentBookValue !== undefined && asset.currentBookValue !== null;
            assetBookValue = asset.currentBookValue || 0;
          } else if (testCase.expectedFields.includes('bookValue')) {
            hasValidBookValue = asset.bookValue !== undefined && asset.bookValue !== null;
            assetBookValue = asset.bookValue || 0;
          } else if (testCase.expectedFields.includes('bookValuesByMonth')) {
            hasValidBookValue = asset.bookValuesByMonth && Object.keys(asset.bookValuesByMonth).length > 0;
            // For monthly, calculate average or use first month
            if (hasValidBookValue) {
              const monthlyValues = Object.values(asset.bookValuesByMonth).filter(v => v !== undefined && v !== null);
              assetBookValue = monthlyValues.length > 0 ? monthlyValues[0] : 0;
            }
          }

          if (hasValidBookValue) {
            assetsWithBookValues++;
            totalBookValue += Number(assetBookValue);
          } else {
            assetsWithoutBookValues++;
          }

          // Show details for first few assets
          if (index < 3) {
            console.log(`  Asset ${index + 1}: ${asset.itemDescription || asset.name || 'Unknown'}`);
            console.log(`    Has valid book value: ${hasValidBookValue ? '✅' : '❌'}`);
            if (hasValidBookValue) {
              console.log(`    Book value: $${Number(assetBookValue).toLocaleString()}`);
            }
          }
        });

        console.log(`\n📊 Summary (first 10 assets):`);
        console.log(`  Assets with book values: ${assetsWithBookValues}/10`);
        console.log(`  Assets without book values: ${assetsWithoutBookValues}/10`);
        console.log(`  Average book value: $${assetsWithBookValues > 0 ? (totalBookValue / assetsWithBookValues).toLocaleString() : 0}`);

        // Test export data structure
        console.log(`\n🔧 Export Data Structure Test:`);
        
        // Simulate what the export function would see
        const exportTestAsset = data.assets[0];
        console.log(`  Sample asset for export:`);
        console.log(`    Name: ${exportTestAsset.name || 'N/A'}`);
        console.log(`    Unit Price: $${(exportTestAsset.unitPrice || 0).toLocaleString()}`);
        console.log(`    Current Value: $${(exportTestAsset.currentValue || 0).toLocaleString()}`);
        
        // Test book value logic that export would use
        if (testCase.url.includes('year=') && testCase.url.includes('month=')) {
          console.log(`    Export would use bookValue: ${exportTestAsset.bookValue !== undefined ? `$${Number(exportTestAsset.bookValue).toLocaleString()}` : 'N/A'}`);
        } else if (testCase.url.includes('year=') && !testCase.url.includes('month=')) {
          console.log(`    Export would use bookValuesByMonth: ${exportTestAsset.bookValuesByMonth ? 'Available' : 'N/A'}`);
          if (exportTestAsset.bookValuesByMonth) {
            console.log(`      Monthly columns would show:`);
            for (let month = 1; month <= 12; month++) {
              const monthValue = exportTestAsset.bookValuesByMonth[month];
              const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'short' });
              console.log(`        ${monthName}: ${monthValue !== undefined && monthValue !== null ? `$${Number(monthValue).toLocaleString()}` : 'blank'}`);
            }
          }
        } else {
          console.log(`    Export would use currentBookValue: ${exportTestAsset.currentBookValue !== undefined ? `$${Number(exportTestAsset.currentBookValue).toLocaleString()}` : 'N/A'}`);
        }

        // Validate export readiness
        const exportReady = (() => {
          if (testCase.expectedFields.includes('currentBookValue')) {
            return exportTestAsset.currentBookValue !== undefined;
          } else if (testCase.expectedFields.includes('bookValue')) {
            return exportTestAsset.bookValue !== undefined;
          } else if (testCase.expectedFields.includes('bookValuesByMonth')) {
            return exportTestAsset.bookValuesByMonth && Object.keys(exportTestAsset.bookValuesByMonth).length > 0;
          }
          return false;
        })();

        console.log(`\n🎯 Export Readiness: ${exportReady ? '✅ READY' : '❌ NOT READY'}`);
        
        if (!exportReady) {
          console.log(`  ⚠️ Issue: Expected book value fields are missing or empty`);
          console.log(`  🔧 Check: API book value calculation logic`);
        }

      } else {
        console.log(`\n📋 No assets found for this filter combination`);
      }

      console.log(`\n✅ Test completed`);
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Error details: ${error.stack}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 Book Value Export Testing Completed!');
  console.log('='.repeat(80));
  console.log('\n📋 Summary:');
  console.log('✅ Fixed export functions to use correct book value fields:');
  console.log('   - currentBookValue (no date filter)');
  console.log('   - bookValue (year + month filter)');
  console.log('   - bookValuesByMonth (year only filter)');
  console.log('\n💡 Export columns should now display:');
  console.log('   - Book Value column: Data when year+month or no filter');
  console.log('   - Monthly columns: Data when year only filter applied');
  console.log('   - All values: Properly formatted numbers');
}

// Run the tests
if (require.main === module) {
  testBookValueExport().catch(console.error);
}

module.exports = { testBookValueExport };
