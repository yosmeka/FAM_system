// Test the book value calculation fix for Ethiopian budget year 2020/2021
// Based on the user's example:
// Unit Price: $3,400, Residual: 1%, SIV Date: 2/10/2021, Useful Life: 10 years
// Expected Book Value for 2020/2021: $3,234.77

const testAsset = {
  unitPrice: 3400.00,
  sivDate: '2021-02-10',
  usefulLifeYears: 10,
  residualPercentage: 1,
  depreciationMethod: 'STRAIGHT_LINE'
};

console.log('Testing Book Value Calculation Fix');
console.log('==================================');
console.log(`Asset: Unit Price $${testAsset.unitPrice}, Residual ${testAsset.residualPercentage}%, SIV Date ${testAsset.sivDate}`);

// Calculate salvage value
const salvageValue = testAsset.unitPrice * (testAsset.residualPercentage / 100);
const depreciableAmount = testAsset.unitPrice - salvageValue;

console.log(`Salvage Value: $${salvageValue.toFixed(2)}`);
console.log(`Depreciable Amount: $${depreciableAmount.toFixed(2)}`);
console.log('');

// Simulate the book value calculation logic from the asset report
function calculateBookValueForBudgetYear(asset, budgetYear) {
  const unitPrice = asset.unitPrice;
  const residualPercentage = asset.residualPercentage || 0;
  const salvageValue = unitPrice * (residualPercentage / 100);
  
  // Parse budget year (e.g., "2020/2021" -> 2020)
  let startYear = parseInt(budgetYear);
  if (budgetYear.includes('/')) {
    startYear = parseInt(budgetYear.split('/')[0]);
  }
  
  // For this test, simulate the accumulated depreciation calculation
  // Ethiopian budget year 2020/2021 = July 2020 to June 2021
  // SIV Date: Feb 10, 2021, so depreciation starts in Feb 2021
  
  // Months in 2020/2021 budget year where depreciation occurs:
  // Feb 2021 (partial), Mar 2021, Apr 2021, May 2021, Jun 2021
  
  const monthlyDepreciation = depreciableAmount / (asset.usefulLifeYears * 12);
  console.log(`Monthly Depreciation: $${monthlyDepreciation.toFixed(2)}`);
  
  // Calculate depreciation for each month in the budget year
  let totalAccumulatedDepreciation = 0;
  
  // February 2021 (partial month - from 10th to end of month)
  const febDays = 28; // 2021 is not a leap year
  const febDaysUsed = febDays - 10 + 1; // From 10th to 28th = 19 days
  const febDepreciation = monthlyDepreciation * (febDaysUsed / febDays);
  totalAccumulatedDepreciation += febDepreciation;
  console.log(`Feb 2021 (partial): $${febDepreciation.toFixed(2)} (${febDaysUsed}/${febDays} days)`);
  
  // March, April, May, June 2021 (full months)
  const fullMonthDepreciation = monthlyDepreciation * 4; // 4 full months
  totalAccumulatedDepreciation += fullMonthDepreciation;
  console.log(`Mar-Jun 2021 (4 months): $${fullMonthDepreciation.toFixed(2)}`);
  
  console.log(`Total Accumulated Depreciation for 2020/2021: $${totalAccumulatedDepreciation.toFixed(2)}`);
  
  // Apply the fixed book value calculation
  const depreciableAmount = unitPrice - salvageValue;
  const cappedAccumulatedDepreciation = Math.min(totalAccumulatedDepreciation, depreciableAmount);
  const bookValue = Math.max(unitPrice - cappedAccumulatedDepreciation, salvageValue);
  
  return {
    totalAccumulatedDepreciation,
    cappedAccumulatedDepreciation,
    bookValue
  };
}

// Test the calculation
const result = calculateBookValueForBudgetYear(testAsset, '2020/2021');

console.log('');
console.log('Results:');
console.log('========');
console.log(`Total Accumulated Depreciation: $${result.totalAccumulatedDepreciation.toFixed(2)}`);
console.log(`Capped Accumulated Depreciation: $${result.cappedAccumulatedDepreciation.toFixed(2)}`);
console.log(`Calculated Book Value: $${result.bookValue.toFixed(2)}`);
console.log(`Expected Book Value: $3,234.77`);
console.log(`Difference: $${Math.abs(result.bookValue - 3234.77).toFixed(2)}`);

if (Math.abs(result.bookValue - 3234.77) < 1.0) {
  console.log('✅ PASS: Book value is close to expected result!');
} else {
  console.log('❌ FAIL: Book value does not match expected result');
  console.log('');
  console.log('Debug Information:');
  console.log(`- Unit Price: $${testAsset.unitPrice}`);
  console.log(`- Salvage Value: $${salvageValue.toFixed(2)}`);
  console.log(`- Depreciable Amount: $${depreciableAmount.toFixed(2)}`);
  console.log(`- Monthly Depreciation: $${(depreciableAmount / (testAsset.usefulLifeYears * 12)).toFixed(2)}`);
}
