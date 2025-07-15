// Debug script to test monthly depreciation calculation issues
const { calculateMonthlyDepreciation } = require('./src/utils/depreciation.ts');

function debugMonthlyCalculation() {
  console.log('🔍 Debugging monthly depreciation calculation...\n');
  
  // Test with an asset similar to the one shown in the images
  const testAsset = {
    unitPrice: 1700,         // $1,700 purchase price
    sivDate: '2016-01-01',   // Started in 2016 as shown in the image
    usefulLifeYears: 5,      // 5 year useful life
    salvageValue: 200,       // $200 salvage value
    method: 'STRAIGHT_LINE'
  };

  // Also test with a mid-month start date to check proration
  const testAssetMidMonth = {
    unitPrice: 1700,
    sivDate: '2016-03-15',   // Started mid-March
    usefulLifeYears: 5,
    salvageValue: 200,
    method: 'STRAIGHT_LINE'
  };
  
  console.log('Test Asset Details:');
  console.log('  Purchase Price: $' + testAsset.unitPrice.toLocaleString());
  console.log('  SIV Date: ' + testAsset.sivDate);
  console.log('  Useful Life: ' + testAsset.usefulLifeYears + ' years');
  console.log('  Salvage Value: $' + testAsset.salvageValue.toLocaleString());
  console.log('  Method: ' + testAsset.method);
  console.log('');
  
  try {
    console.log('='.repeat(60));
    console.log('TEST 1: Asset starting January 1st');
    console.log('='.repeat(60));

    const monthlyResults = calculateMonthlyDepreciation(testAsset);
    
    console.log('Total monthly results generated:', monthlyResults.length);
    console.log('Expected results:', testAsset.usefulLifeYears * 12, 'months');
    console.log('');
    
    // Group results by year
    const resultsByYear = {};
    monthlyResults.forEach(result => {
      if (!resultsByYear[result.year]) {
        resultsByYear[result.year] = [];
      }
      resultsByYear[result.year].push(result);
    });
    
    console.log('Results by year:');
    Object.keys(resultsByYear).sort().forEach(year => {
      const yearResults = resultsByYear[year];
      console.log(`\n${year}: ${yearResults.length} results`);
      
      // Check for duplicates or missing months
      const monthsSeen = new Set();
      const duplicates = [];
      const months = [];
      
      yearResults.forEach(result => {
        if (monthsSeen.has(result.month)) {
          duplicates.push(result.month);
        }
        monthsSeen.add(result.month);
        months.push(result.month);
      });
      
      months.sort((a, b) => a - b);
      console.log(`  Months: [${months.join(', ')}]`);
      
      if (duplicates.length > 0) {
        console.log(`  ⚠️  DUPLICATES: [${duplicates.join(', ')}]`);
      }
      
      // Check for missing months (1-12)
      const missing = [];
      for (let m = 1; m <= 12; m++) {
        if (!monthsSeen.has(m)) {
          missing.push(m);
        }
      }
      
      if (missing.length > 0) {
        console.log(`  ⚠️  MISSING: [${missing.join(', ')}]`);
      }
      
      // Show detailed results for 2016 (the year from the image)
      if (year === '2016') {
        console.log('\n  Detailed 2016 results:');
        console.log('  Month | Book Value | Depreciation | Accumulated');
        console.log('  ------|------------|--------------|------------');
        
        yearResults.forEach(result => {
          const monthName = new Date(0, result.month - 1).toLocaleString('default', { month: 'short' });
          console.log(`  ${monthName.padEnd(5)} | $${result.bookValue.toFixed(2).padStart(9)} | $${result.depreciationExpense.toFixed(2).padStart(10)} | $${result.accumulatedDepreciation.toFixed(2).padStart(10)}`);
        });
      }
    });
    
    // Test the addMonths function specifically
    console.log('\n🔍 Testing addMonths function:');
    const startDate = new Date('2016-01-01');
    console.log('Start date:', startDate.toISOString().split('T')[0]);
    
    for (let m = 0; m < 12; m++) {
      const date = addMonths(startDate, m);
      console.log(`  +${m} months: ${date.toISOString().split('T')[0]} (Year: ${date.getFullYear()}, Month: ${date.getMonth() + 1})`);
    }

    // Test 2: Mid-month start date
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Asset starting March 15th (mid-month)');
    console.log('='.repeat(60));

    const midMonthResults = calculateMonthlyDepreciation(testAssetMidMonth);
    console.log('Total monthly results generated:', midMonthResults.length);

    // Show first few months to check proration
    console.log('\nFirst 6 months (checking proration):');
    console.log('Month | Book Value | Depreciation | Note');
    console.log('------|------------|--------------|-----');

    midMonthResults.slice(0, 6).forEach(result => {
      const monthName = new Date(0, result.month - 1).toLocaleString('default', { month: 'short' });
      const note = result === midMonthResults[0] ? '(prorated)' : '';
      console.log(`${monthName} ${result.year} | $${result.bookValue.toFixed(2).padStart(9)} | $${result.depreciationExpense.toFixed(2).padStart(10)} | ${note}`);
    });

  } catch (error) {
    console.error('❌ Error in monthly calculation:', error.message);
    console.error('Full error:', error);
  }
}

// Copy the addMonths function to test it
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Run the debug
debugMonthlyCalculation();
