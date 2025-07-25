// Debug script to test month shifting issue in depreciation calculation
const { calculateMonthlyDepreciation } = require('./src/utils/depreciation.ts');

function debugMonthShifting() {
  console.log('🔍 Debugging month shifting issue in depreciation calculation...\n');
  
  // Test case: Asset starts depreciation in April 2021
  const testAsset = {
    unitPrice: 5000,         // $5,000 purchase price
    sivDate: '2021-04-01',   // Started April 1, 2021
    usefulLifeYears: 5,      // 5 year useful life
    salvageValue: 500,       // $500 salvage value
    method: 'STRAIGHT_LINE'
  };

  console.log('Test Asset Details:');
  console.log('==================');
  console.log('Unit Price:', testAsset.unitPrice);
  console.log('SIV Date:', testAsset.sivDate);
  console.log('Useful Life:', testAsset.usefulLifeYears, 'years');
  console.log('Salvage Value:', testAsset.salvageValue);
  console.log('Depreciable Amount:', testAsset.unitPrice - testAsset.salvageValue);
  console.log('');

  try {
    const monthlyResults = calculateMonthlyDepreciation(testAsset);
    
    console.log('Expected calculation:');
    const depreciableAmount = testAsset.unitPrice - testAsset.salvageValue;
    const monthlyDepreciation = depreciableAmount / (testAsset.usefulLifeYears * 12);
    console.log('  Depreciable Amount: $' + depreciableAmount.toLocaleString());
    console.log('  Monthly Depreciation: $' + monthlyDepreciation.toFixed(2));
    console.log('');
    
    console.log('Calculated results for 2021:');
    console.log('============================');
    const year2021Results = monthlyResults.filter(r => r.year === 2021);
    
    if (year2021Results.length === 0) {
      console.log('❌ No results found for 2021!');
      console.log('Available years:', [...new Set(monthlyResults.map(r => r.year))]);
    } else {
      console.log('Found', year2021Results.length, 'months for 2021:');
      year2021Results.forEach(result => {
        const monthName = new Date(2021, result.month - 1, 1).toLocaleString('default', { month: 'long' });
        console.log(`  ${monthName} (${result.month}): Expense $${result.depreciationExpense.toFixed(2)}, Book Value $${result.bookValue.toFixed(2)}`);
      });
    }
    
    console.log('\nFirst 12 months of depreciation:');
    console.log('================================');
    monthlyResults.slice(0, 12).forEach((result, index) => {
      const monthName = new Date(result.year, result.month - 1, 1).toLocaleString('default', { month: 'long' });
      console.log(`  ${index + 1}. ${monthName} ${result.year} (${result.month}): Expense $${result.depreciationExpense.toFixed(2)}, Book Value $${result.bookValue.toFixed(2)}`);
    });

    // Test how the API would map this data
    console.log('\nAPI Mapping Test for 2021:');
    console.log('===========================');
    const yearlyDepreciationExpenses = {};
    monthlyResults.forEach(result => {
      if (result.year === 2021) {
        yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
      }
    });
    
    console.log('Yearly mapping object:', yearlyDepreciationExpenses);
    
    // Test how frontend would display this
    console.log('\nFrontend Display Test:');
    console.log('======================');
    for (let month = 1; month <= 12; month++) {
      const monthKey = month.toString();
      const monthValue = yearlyDepreciationExpenses[monthKey] || yearlyDepreciationExpenses[month];
      const monthName = new Date(2021, month - 1, 1).toLocaleString('default', { month: 'long' });
      
      if (monthValue !== undefined && monthValue !== null && monthValue !== '') {
        const numValue = Number(monthValue);
        if (!isNaN(numValue)) {
          console.log(`  ${monthName} (${month}): $${numValue.toFixed(2)} ✅`);
        } else {
          console.log(`  ${monthName} (${month}): Invalid value (${monthValue}) ❌`);
        }
      } else {
        console.log(`  ${monthName} (${month}): Empty/undefined ❌`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in calculation:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test with mid-month start date
function debugMidMonthStart() {
  console.log('\n\n🔍 Testing mid-month start date...\n');
  
  const testAsset = {
    unitPrice: 5000,
    sivDate: '2021-04-15',   // Started April 15, 2021 (mid-month)
    usefulLifeYears: 5,
    salvageValue: 500,
    method: 'STRAIGHT_LINE'
  };

  console.log('Test Asset (Mid-Month Start):');
  console.log('=============================');
  console.log('SIV Date:', testAsset.sivDate, '(April 15th)');
  
  try {
    const monthlyResults = calculateMonthlyDepreciation(testAsset);
    const year2021Results = monthlyResults.filter(r => r.year === 2021);
    
    console.log('2021 Results:');
    year2021Results.forEach(result => {
      const monthName = new Date(2021, result.month - 1, 1).toLocaleString('default', { month: 'long' });
      console.log(`  ${monthName} (${result.month}): Expense $${result.depreciationExpense.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the tests
debugMonthShifting();
debugMidMonthStart();

console.log('\n🎯 Summary:');
console.log('===========');
console.log('If April shows $0 but May shows the expense, the issue is likely:');
console.log('1. Month indexing mismatch (0-based vs 1-based)');
console.log('2. Date calculation error in depreciation logic');
console.log('3. API mapping issue between month numbers and values');
console.log('4. Frontend display logic using wrong month keys');
