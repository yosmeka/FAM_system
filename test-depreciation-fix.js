// Test script to verify the depreciation calculation fix
const { calculateMonthlyDepreciation } = require('./src/utils/depreciation.ts');

// Your example data
const testAsset = {
  unitPrice: 3400.00,
  sivDate: '2021-02-10',
  usefulLifeYears: 10,
  salvageValue: 34.00, // 1% of 3400
  method: 'STRAIGHT_LINE'
};

console.log('Testing depreciation calculation fix...');
console.log('Asset details:');
console.log(`- Unit Price: $${testAsset.unitPrice.toFixed(2)}`);
console.log(`- SIV Date: ${testAsset.sivDate}`);
console.log(`- Useful Life: ${testAsset.usefulLifeYears} years`);
console.log(`- Salvage Value: $${testAsset.salvageValue.toFixed(2)}`);
console.log(`- Depreciable Amount: $${(testAsset.unitPrice - testAsset.salvageValue).toFixed(2)}`);
console.log('');

try {
  const monthlyResults = calculateMonthlyDepreciation(testAsset);
  
  // Find June 2021 result
  const june2021 = monthlyResults.find(r => r.year === 2021 && r.month === 6);
  
  if (june2021) {
    console.log('June 2021 Results:');
    console.log(`- Depreciation Expense: $${june2021.depreciationExpense.toFixed(2)}`);
    console.log(`- Accumulated Depreciation: $${june2021.accumulatedDepreciation.toFixed(2)}`);
    console.log(`- Book Value: $${june2021.bookValue.toFixed(2)}`);
    console.log('');
    console.log(`Expected Book Value: $3,234.77`);
    console.log(`Actual Book Value: $${june2021.bookValue.toFixed(2)}`);
    console.log(`Difference: $${Math.abs(june2021.bookValue - 3234.77).toFixed(2)}`);
    
    if (Math.abs(june2021.bookValue - 3234.77) < 0.01) {
      console.log('✅ PASS: Book value matches expected result!');
    } else {
      console.log('❌ FAIL: Book value does not match expected result');
    }
  } else {
    console.log('❌ Could not find June 2021 result');
  }
  
  // Show first few months for verification
  console.log('\nFirst 6 months of depreciation:');
  console.log('Year | Month | Depreciation | Accumulated | Book Value');
  console.log('-----|-------|-------------|-------------|------------');
  
  const first6Months = monthlyResults.filter(r => r.year === 2021 && r.month <= 7);
  first6Months.forEach(r => {
    console.log(`${r.year} | ${r.month.toString().padStart(5)} | $${r.depreciationExpense.toFixed(2).padStart(10)} | $${r.accumulatedDepreciation.toFixed(2).padStart(10)} | $${r.bookValue.toFixed(2).padStart(9)}`);
  });
  
} catch (error) {
  console.error('Error calculating depreciation:', error);
}
