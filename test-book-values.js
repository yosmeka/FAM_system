// Test script for book value calculation in asset reports
const testBookValues = async () => {
  const baseUrl = 'http://localhost:3000/api/reports/assets';
  
  console.log('🧪 Testing book value calculation functionality...\n');
  
  // Test 1: No year/month filters (should show current book value)
  try {
    console.log('Test 1: No year/month filters (current book value)');
    const response1 = await fetch(`${baseUrl}?page=1&limit=5`);
    const data1 = await response1.json();
    
    console.log('✅ Response received');
    console.log('📋 Assets returned:', data1.assets?.length || 0);
    
    if (data1.assets && data1.assets.length > 0) {
      const firstAsset = data1.assets[0];
      console.log('📊 First asset book value info:');
      console.log('  - Has bookValue:', !!firstAsset.bookValue);
      console.log('  - Has currentValue:', !!firstAsset.currentValue);
      console.log('  - Has bookValuesByMonth:', !!firstAsset.bookValuesByMonth);
      console.log('  - Book value:', firstAsset.bookValue || firstAsset.currentValue);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Year only (should show 12 monthly columns)
  try {
    console.log('Test 2: Year only filter (2024) - should show 12 monthly columns');
    const response2 = await fetch(`${baseUrl}?page=1&limit=5&year=2024`);
    const data2 = await response2.json();
    
    console.log('✅ Response received');
    console.log('📋 Assets returned:', data2.assets?.length || 0);
    
    if (data2.assets && data2.assets.length > 0) {
      const firstAsset = data2.assets[0];
      console.log('📊 First asset monthly book values:');
      console.log('  - Has bookValuesByMonth:', !!firstAsset.bookValuesByMonth);
      console.log('  - Monthly values count:', firstAsset.bookValuesByMonth ? Object.keys(firstAsset.bookValuesByMonth).length : 0);
      
      if (firstAsset.bookValuesByMonth) {
        console.log('  - Monthly breakdown:');
        for (let month = 1; month <= 12; month++) {
          const value = firstAsset.bookValuesByMonth[month];
          const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'short' });
          console.log(`    ${monthName}: ${value ? `$${Number(value).toFixed(2)}` : 'N/A'}`);
        }
      }
      
      // Check debug info if available
      if (firstAsset._debug_bookValuesByMonth) {
        console.log('  - Debug info available:', !!firstAsset._debug_hasBookValues);
      }
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Year + Month (should show single book value column)
  try {
    console.log('Test 3: Year + Month filter (2024-06) - should show single book value');
    const response3 = await fetch(`${baseUrl}?page=1&limit=5&year=2024&month=06`);
    const data3 = await response3.json();
    
    console.log('✅ Response received');
    console.log('📋 Assets returned:', data3.assets?.length || 0);
    
    if (data3.assets && data3.assets.length > 0) {
      const firstAsset = data3.assets[0];
      console.log('📊 First asset specific month book value:');
      console.log('  - Has bookValue:', !!firstAsset.bookValue);
      console.log('  - Book value for June 2024:', firstAsset.bookValue ? `$${Number(firstAsset.bookValue).toFixed(2)}` : 'N/A');
      console.log('  - Has bookValuesByMonth:', !!firstAsset.bookValuesByMonth);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  // Test 4: Different year (should calculate values)
  try {
    console.log('Test 4: Different year (2023) - should calculate monthly values');
    const response4 = await fetch(`${baseUrl}?page=1&limit=3&year=2023`);
    const data4 = await response4.json();
    
    console.log('✅ Response received');
    console.log('📋 Assets returned:', data4.assets?.length || 0);
    
    if (data4.assets && data4.assets.length > 0) {
      data4.assets.forEach((asset, index) => {
        console.log(`📊 Asset ${index + 1} (${asset.name || asset.itemDescription || 'Unknown'}):`);
        console.log('  - Unit Price:', asset.unitPrice ? `$${Number(asset.unitPrice).toFixed(2)}` : 'N/A');
        console.log('  - Useful Life:', asset.usefulLifeYears || 'N/A', 'years');
        console.log('  - Depreciation Method:', asset.depreciationMethod || 'N/A');
        console.log('  - SIV Date:', asset.sivDate || 'N/A');
        console.log('  - Has monthly values:', !!asset.bookValuesByMonth);
        
        if (asset.bookValuesByMonth) {
          const monthCount = Object.keys(asset.bookValuesByMonth).length;
          console.log('  - Monthly values count:', monthCount);
          
          if (monthCount > 0) {
            // Show first few months as example
            const months = Object.keys(asset.bookValuesByMonth).sort((a, b) => Number(a) - Number(b));
            console.log('  - Sample values:');
            months.slice(0, 3).forEach(month => {
              const monthName = new Date(0, Number(month) - 1).toLocaleString('default', { month: 'short' });
              const value = asset.bookValuesByMonth[month];
              console.log(`    ${monthName}: $${Number(value).toFixed(2)}`);
            });
          }
        }
        console.log('');
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
  }
  
  console.log('🎉 Book value tests completed!');
};

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testBookValues;
} else if (typeof window !== 'undefined') {
  window.testBookValues = testBookValues;
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testBookValues();
}
