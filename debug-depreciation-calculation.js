// Debug script to test depreciation calculations
const { calculateMonthlyDepreciation } = require('./src/utils/depreciation.ts');

function testDepreciationCalculation() {
  console.log('🧪 Testing depreciation calculations...\n');
  
  // Test case 1: Basic straight-line depreciation
  console.log('Test 1: Basic Straight-Line Depreciation');
  console.log('========================================');
  
  const testAsset = {
    unitPrice: 10000,        // $10,000 purchase price
    sivDate: '2023-01-01',   // Started depreciation Jan 1, 2023
    usefulLifeYears: 5,      // 5 year useful life
    salvageValue: 1000,      // $1,000 salvage value
    method: 'STRAIGHT_LINE'
  };
  
  console.log('Asset details:');
  console.log('  Purchase Price: $' + testAsset.unitPrice.toLocaleString());
  console.log('  SIV Date: ' + testAsset.sivDate);
  console.log('  Useful Life: ' + testAsset.usefulLifeYears + ' years');
  console.log('  Salvage Value: $' + testAsset.salvageValue.toLocaleString());
  console.log('  Method: ' + testAsset.method);
  console.log('');
  
  try {
    const monthlyResults = calculateMonthlyDepreciation(testAsset);
    
    console.log('Expected calculation:');
    const depreciableAmount = testAsset.unitPrice - testAsset.salvageValue;
    const monthlyDepreciation = depreciableAmount / (testAsset.usefulLifeYears * 12);
    console.log('  Depreciable Amount: $' + depreciableAmount.toLocaleString());
    console.log('  Monthly Depreciation: $' + monthlyDepreciation.toFixed(2));
    console.log('');
    
    console.log('Calculated results for 2024:');
    const year2024Results = monthlyResults.filter(r => r.year === 2024);
    
    if (year2024Results.length > 0) {
      console.log('  Month | Book Value | Depreciation | Accumulated');
      console.log('  ------|------------|--------------|------------');
      
      year2024Results.slice(0, 12).forEach(result => {
        const monthName = new Date(0, result.month - 1).toLocaleString('default', { month: 'short' });
        console.log(`  ${monthName.padEnd(5)} | $${result.bookValue.toFixed(2).padStart(9)} | $${result.depreciationExpense.toFixed(2).padStart(10)} | $${result.accumulatedDepreciation.toFixed(2).padStart(10)}`);
      });
    } else {
      console.log('  No results found for 2024');
    }
    
    console.log('');
    
    // Test specific month lookup
    console.log('Test 2: Specific Month Lookup (June 2024)');
    console.log('==========================================');
    
    const juneResult = monthlyResults.find(r => r.year === 2024 && r.month === 6);
    if (juneResult) {
      console.log('  June 2024 Book Value: $' + juneResult.bookValue.toFixed(2));
      console.log('  Expected vs Actual:');
      
      // Calculate expected book value for June 2024
      const monthsElapsed = (2024 - 2023) * 12 + (6 - 1); // 17 months
      const expectedAccumulated = monthlyDepreciation * monthsElapsed;
      const expectedBookValue = testAsset.unitPrice - expectedAccumulated;
      
      console.log('    Expected: $' + expectedBookValue.toFixed(2));
      console.log('    Actual:   $' + juneResult.bookValue.toFixed(2));
      console.log('    Match:    ' + (Math.abs(expectedBookValue - juneResult.bookValue) < 0.01 ? '✅' : '❌'));
    } else {
      console.log('  ❌ No result found for June 2024');
    }
    
    console.log('');
    
    // Test year-only results
    console.log('Test 3: Year-Only Results (All months of 2024)');
    console.log('===============================================');
    
    const yearlyValues = {};
    year2024Results.forEach(result => {
      yearlyValues[result.month] = result.bookValue;
    });
    
    console.log('  Monthly book values for 2024:');
    for (let month = 1; month <= 12; month++) {
      const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'short' });
      const value = yearlyValues[month];
      if (value !== undefined) {
        console.log(`    ${monthName}: $${value.toFixed(2)}`);
      } else {
        console.log(`    ${monthName}: No data`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in depreciation calculation:', error.message);
    console.error('Full error:', error);
  }
  
  console.log('\n🎯 Summary:');
  console.log('If the calculations above show:');
  console.log('  - Book values decreasing each month');
  console.log('  - Values different from unit price');
  console.log('  - Consistent monthly depreciation');
  console.log('Then the depreciation utility is working correctly.');
  console.log('');
  console.log('If book values equal unit price, there may be an issue with:');
  console.log('  - Date parsing');
  console.log('  - Asset data (missing sivDate, usefulLifeYears, etc.)');
  console.log('  - Calculation parameters');
}

// Run the test
testDepreciationCalculation();
