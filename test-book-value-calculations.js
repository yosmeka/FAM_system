// Test script to debug book value calculations in asset reports
const testBookValueCalculations = async () => {
  const baseUrl = 'http://localhost:3000/api/reports/assets';
  
  console.log('🧪 Testing book value calculations in asset reports...\n');
  
  // Test 1: Year + Month selection (should show single book value column)
  try {
    console.log('Test 1: Year + Month Selection (2024, June)');
    console.log('===========================================');
    const response1 = await fetch(`${baseUrl}?page=1&limit=3&year=2024&month=6`);
    
    if (!response1.ok) {
      const errorText = await response1.text();
      console.error('❌ API returned error:', response1.status, errorText);
      return;
    }
    
    const data1 = await response1.json();
    
    console.log('✅ API call successful!');
    console.log('📊 Assets returned:', data1.assets?.length || 0);
    
    if (data1.assets && data1.assets.length > 0) {
      data1.assets.forEach((asset, index) => {
        console.log(`\n📋 Asset ${index + 1}: ${asset.name || asset.itemDescription || 'Unknown'}`);
        console.log(`  - Unit Price: $${asset.unitPrice ? Number(asset.unitPrice).toLocaleString() : 'N/A'}`);
        console.log(`  - SIV Date: ${asset.sivDate || 'N/A'}`);
        console.log(`  - Useful Life: ${asset.usefulLifeYears || 'N/A'} years`);
        console.log(`  - Depreciation Method: ${asset.depreciationMethod || 'N/A'}`);
        console.log(`  - Salvage Value: $${asset.salvageValue ? Number(asset.salvageValue).toLocaleString() : 'N/A'}`);
        console.log(`  - Calculated Salvage: $${asset.calculatedSalvageValue ? Number(asset.calculatedSalvageValue).toLocaleString() : 'N/A'}`);
        console.log(`  - Book Value (June 2024): $${asset.bookValue ? Number(asset.bookValue).toLocaleString() : 'N/A'}`);
        
        // Check if book value equals unit price (the problem)
        if (asset.bookValue && asset.unitPrice) {
          const bookValue = Number(asset.bookValue);
          const unitPrice = Number(asset.unitPrice);
          if (Math.abs(bookValue - unitPrice) < 0.01) {
            console.log(`  ⚠️  WARNING: Book value equals unit price! (No depreciation calculated)`);
          } else {
            const depreciationAmount = unitPrice - bookValue;
            const depreciationPercent = (depreciationAmount / unitPrice) * 100;
            console.log(`  ✅ Depreciation applied: $${depreciationAmount.toLocaleString()} (${depreciationPercent.toFixed(1)}%)`);
          }
        }
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    return;
  }
  
  // Test 2: Year only selection (should show 12 monthly columns)
  try {
    console.log('Test 2: Year Only Selection (2024)');
    console.log('==================================');
    const response2 = await fetch(`${baseUrl}?page=1&limit=2&year=2024`);
    
    if (!response2.ok) {
      const errorText = await response2.text();
      console.error('❌ API returned error:', response2.status, errorText);
      return;
    }
    
    const data2 = await response2.json();
    
    console.log('✅ API call successful!');
    console.log('📊 Assets returned:', data2.assets?.length || 0);
    
    if (data2.assets && data2.assets.length > 0) {
      data2.assets.forEach((asset, index) => {
        console.log(`\n📋 Asset ${index + 1}: ${asset.name || asset.itemDescription || 'Unknown'}`);
        console.log(`  - Unit Price: $${asset.unitPrice ? Number(asset.unitPrice).toLocaleString() : 'N/A'}`);
        console.log(`  - SIV Date: ${asset.sivDate || 'N/A'}`);
        console.log(`  - Has bookValuesByMonth: ${!!asset.bookValuesByMonth}`);
        
        if (asset.bookValuesByMonth) {
          const monthCount = Object.keys(asset.bookValuesByMonth).length;
          console.log(`  - Monthly values count: ${monthCount}`);
          
          if (monthCount > 0) {
            console.log(`  - Monthly book values for 2024:`);
            
            // Show all 12 months with proper blank value analysis
            const sivDate = asset.sivDate ? new Date(asset.sivDate) : null;
            const sivYear = sivDate ? sivDate.getFullYear() : null;
            const sivMonth = sivDate ? sivDate.getMonth() + 1 : null;

            console.log(`    SIV Date: ${asset.sivDate} (${sivYear}-${sivMonth})`);
            console.log(`    Useful Life: ${asset.usefulLifeYears} years`);

            for (let month = 1; month <= 12; month++) {
              const value = asset.bookValuesByMonth[month];
              const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'short' });

              // Determine expected status
              let expectedStatus = 'active';
              if (sivYear && sivMonth) {
                if (2024 < sivYear || (2024 === sivYear && month < sivMonth)) {
                  expectedStatus = 'before-siv';
                } else if (asset.usefulLifeYears) {
                  const usefulLifeMonths = asset.usefulLifeYears * 12;
                  const endDate = new Date(sivDate);
                  endDate.setMonth(endDate.getMonth() + usefulLifeMonths);
                  const endYear = endDate.getFullYear();
                  const endMonth = endDate.getMonth() + 1;

                  if (2024 > endYear || (2024 === endYear && month >= endMonth)) {
                    expectedStatus = 'after-life';
                  }
                }
              }

              if (value !== undefined) {
                console.log(`    ${monthName}: $${Number(value).toLocaleString()} (${expectedStatus})`);

                // Check if monthly value equals unit price
                if (asset.unitPrice && Math.abs(Number(value) - Number(asset.unitPrice)) < 0.01) {
                  console.log(`      ⚠️  WARNING: ${monthName} value equals unit price!`);
                }
              } else {
                console.log(`    ${monthName}: BLANK (${expectedStatus})`);

                // Check if blank is expected
                if (expectedStatus === 'active') {
                  console.log(`      ⚠️  WARNING: ${monthName} should have a value but is blank!`);
                } else if (expectedStatus === 'before-siv') {
                  console.log(`      ✅ Correctly blank (before SIV date)`);
                }
              }
            }
            
            // Calculate depreciation trend
            const jan = asset.bookValuesByMonth[1];
            const dec = asset.bookValuesByMonth[12];
            if (jan && dec) {
              const depreciation = Number(jan) - Number(dec);
              console.log(`  - Annual depreciation: $${depreciation.toLocaleString()}`);
              if (depreciation <= 0) {
                console.log(`    ⚠️  WARNING: No depreciation or negative depreciation!`);
              }
            }
          }
        }
        
        // Show debug info if available
        if (asset._debug_bookValuesByMonth) {
          console.log(`  - Debug info available: ${!!asset._debug_hasBookValues}`);
        }
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    return;
  }
  
  // Test 3: No year/month selection (should show current values)
  try {
    console.log('Test 3: No Year/Month Selection (Current Values)');
    console.log('===============================================');
    const response3 = await fetch(`${baseUrl}?page=1&limit=2`);
    
    if (!response3.ok) {
      const errorText = await response3.text();
      console.error('❌ API returned error:', response3.status, errorText);
      return;
    }
    
    const data3 = await response3.json();
    
    console.log('✅ API call successful!');
    console.log('📊 Assets returned:', data3.assets?.length || 0);
    
    if (data3.assets && data3.assets.length > 0) {
      data3.assets.forEach((asset, index) => {
        console.log(`\n📋 Asset ${index + 1}: ${asset.name || asset.itemDescription || 'Unknown'}`);
        console.log(`  - Unit Price: $${asset.unitPrice ? Number(asset.unitPrice).toLocaleString() : 'N/A'}`);
        console.log(`  - Current Value: $${asset.currentValue ? Number(asset.currentValue).toLocaleString() : 'N/A'}`);
        console.log(`  - Has bookValue: ${asset.bookValue !== undefined}`);
        console.log(`  - Has bookValuesByMonth: ${!!asset.bookValuesByMonth}`);
        
        // In this case, neither bookValue nor bookValuesByMonth should be present
        if (asset.bookValue !== undefined || asset.bookValuesByMonth) {
          console.log(`  ⚠️  WARNING: Unexpected book value data when no year/month selected`);
        }
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    return;
  }
  
  console.log('🎯 Summary:');
  console.log('===========');
  console.log('Expected behavior:');
  console.log('  1. Year + Month: bookValue should be depreciated value for that month');
  console.log('  2. Year only: bookValuesByMonth should have 12 depreciated values');
  console.log('  3. No filters: no book value calculations');
  console.log('');
  console.log('If book values equal unit prices, check:');
  console.log('  - Asset sivDate is valid and in the past');
  console.log('  - Asset usefulLifeYears is > 0');
  console.log('  - Depreciation calculation is working correctly');
  console.log('  - Date parsing in the API');
};

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testBookValueCalculations;
} else if (typeof window !== 'undefined') {
  window.testBookValueCalculations = testBookValueCalculations;
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testBookValueCalculations();
}
