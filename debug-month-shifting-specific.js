// Debug script for the specific month shifting issue
// Asset SIV Date: 6/25/2025
// Expected: Month 6 = $12.38, Month 7 = $61.88
// Actual: Month 6 shows $61.88 (Month 7's value)

function debugMonthShifting() {
  console.log('🔍 Debugging Month Shifting Issue');
  console.log('================================');
  
  // Test the addMonths function logic
  function addMonths(date, months) {
    const startYear = date.getFullYear();
    const startMonth = date.getMonth(); // 0-based
    const startDay = date.getDate();

    // Calculate target year and month
    const totalMonths = startMonth + months;
    const targetYear = startYear + Math.floor(totalMonths / 12);
    const targetMonth = totalMonths % 12;

    // Create new date with target year/month, keeping original day
    const result = new Date(targetYear, targetMonth, startDay);

    // Handle day overflow (e.g., Jan 31 + 1 month should be Feb 28, not Mar 3)
    if (result.getMonth() !== targetMonth) {
      // Day overflowed, set to last day of the target month
      result.setDate(0);
    }

    return result;
  }

  // Test case: Asset starts 6/25/2025
  const sivDate = new Date('2025-06-25');
  console.log('SIV Date:', sivDate.toISOString().split('T')[0]);
  console.log('SIV Month (0-based):', sivDate.getMonth()); // Should be 5 (June)
  console.log('SIV Month (1-based):', sivDate.getMonth() + 1); // Should be 6 (June)
  
  console.log('\nMonth Calculation Test:');
  console.log('======================');
  
  // Test first 6 months of depreciation
  for (let m = 0; m < 6; m++) {
    const date = addMonths(sivDate, m);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based month
    
    console.log(`m=${m}: ${date.toISOString().split('T')[0]} -> Year ${year}, Month ${month}`);
  }
  
  console.log('\nExpected vs Actual:');
  console.log('==================');
  console.log('Expected: Month 6 = $12.38 (prorated), Month 7 = $61.88 (full)');
  console.log('Actual:   Month 6 = $61.88 (showing Month 7 value)');
  
  console.log('\nPossible Issues:');
  console.log('===============');
  console.log('1. addMonths function returns wrong month');
  console.log('2. Month calculation off by one');
  console.log('3. API stores data with wrong month key');
  console.log('4. Frontend looks up wrong month key');
  
  // Test the specific case
  console.log('\nSpecific Case Analysis:');
  console.log('======================');
  
  const start = new Date('2025-06-25');
  console.log('Start date:', start.toISOString().split('T')[0]);
  
  // First month (m=0)
  const firstMonthDate = addMonths(start, 0);
  const firstMonth = firstMonthDate.getMonth() + 1;
  console.log('First month calculation (m=0):', {
    date: firstMonthDate.toISOString().split('T')[0],
    month: firstMonth,
    expected: 6
  });
  
  // Second month (m=1)
  const secondMonthDate = addMonths(start, 1);
  const secondMonth = secondMonthDate.getMonth() + 1;
  console.log('Second month calculation (m=1):', {
    date: secondMonthDate.toISOString().split('T')[0],
    month: secondMonth,
    expected: 7
  });
  
  // Check if there's an off-by-one error
  if (firstMonth === 6 && secondMonth === 7) {
    console.log('✅ Month calculation is correct');
    console.log('❌ Issue is likely in API storage or frontend lookup');
  } else {
    console.log('❌ Month calculation is wrong');
    console.log('🔧 Issue is in the addMonths function or month calculation');
  }
  
  // Test proration calculation
  console.log('\nProration Test:');
  console.log('==============');
  
  const startDay = start.getDate(); // 25
  const daysInJune = 30;
  const daysUsed = daysInJune - (startDay - 1); // 30 - 24 = 6 days
  const monthlyDepreciation = 61.88; // Full month amount
  const proratedAmount = monthlyDepreciation * daysUsed / daysInJune;
  
  console.log('Start day:', startDay);
  console.log('Days in June:', daysInJune);
  console.log('Days used:', daysUsed);
  console.log('Monthly depreciation:', monthlyDepreciation);
  console.log('Prorated amount:', proratedAmount.toFixed(2));
  console.log('Expected prorated:', '12.38');
  
  if (Math.abs(proratedAmount - 12.38) < 0.01) {
    console.log('✅ Proration calculation is correct');
  } else {
    console.log('❌ Proration calculation is wrong');
  }
}

// Test API mapping simulation
function testAPIMapping() {
  console.log('\n🔍 API Mapping Simulation');
  console.log('=========================');
  
  // Simulate what the depreciation calculation should return
  const mockMonthlyResults = [
    { year: 2025, month: 6, depreciationExpense: 12.38 },
    { year: 2025, month: 7, depreciationExpense: 61.88 },
    { year: 2025, month: 8, depreciationExpense: 61.88 },
    { year: 2025, month: 9, depreciationExpense: 61.88 },
    { year: 2025, month: 10, depreciationExpense: 61.88 },
    { year: 2025, month: 11, depreciationExpense: 61.88 },
    { year: 2025, month: 12, depreciationExpense: 61.88 }
  ];
  
  console.log('Mock monthly results:', mockMonthlyResults);
  
  // Simulate API mapping
  const yearlyDepreciationExpenses = {};
  const year = 2025;
  
  mockMonthlyResults.forEach(result => {
    if (result.year === year) {
      yearlyDepreciationExpenses[result.month] = result.depreciationExpense;
    }
  });
  
  console.log('API mapping result:', yearlyDepreciationExpenses);
  
  // Simulate frontend lookup
  console.log('\nFrontend Lookup Simulation:');
  console.log('===========================');
  
  for (let month = 6; month <= 12; month++) {
    const monthKey = month.toString();
    const monthValue = yearlyDepreciationExpenses[monthKey] || yearlyDepreciationExpenses[month];
    console.log(`Month ${month} lookup: ${monthValue}`);
  }
  
  // Check if Month 6 gets the right value
  const month6Value = yearlyDepreciationExpenses[6] || yearlyDepreciationExpenses['6'];
  console.log('\nMonth 6 value check:');
  console.log('Expected: 12.38');
  console.log('Actual:', month6Value);
  
  if (month6Value === 12.38) {
    console.log('✅ API mapping and frontend lookup are correct');
    console.log('❌ Issue must be in the depreciation calculation');
  } else {
    console.log('❌ Issue is in API mapping or frontend lookup');
  }
}

// Run the tests
debugMonthShifting();
testAPIMapping();

console.log('\n🎯 Summary:');
console.log('===========');
console.log('If month calculation is correct but Month 6 shows $61.88:');
console.log('1. Check if depreciation calculation returns wrong month numbers');
console.log('2. Check if API stores data with wrong keys');
console.log('3. Check if frontend looks up wrong keys');
console.log('4. Check if there\'s an off-by-one error somewhere in the chain');
