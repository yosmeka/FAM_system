// Test script for asset report filtering functionality
const testFilters = async () => {
  const baseUrl = 'http://localhost:3000/api/reports/assets';
  
  console.log('🧪 Testing asset report filtering functionality...\n');
  
  // Test 1: No filters (baseline)
  try {
    console.log('Test 1: No filters (baseline)');
    const response1 = await fetch(`${baseUrl}?page=1&limit=10`);
    const data1 = await response1.json();
    
    console.log('✅ Response received');
    console.log('📊 Total assets:', data1.stats?.totalAssets || 0);
    console.log('📋 Assets returned:', data1.assets?.length || 0);
    console.log('🎛️ Filter options available:');
    console.log('  - Categories:', data1.filterOptions?.categories?.length || 0);
    console.log('  - Departments:', data1.filterOptions?.departments?.length || 0);
    console.log('  - Locations:', data1.filterOptions?.locations?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Category filter
  try {
    console.log('Test 2: Category filter (COMPUTER)');
    const response2 = await fetch(`${baseUrl}?page=1&limit=10&category=COMPUTER`);
    const data2 = await response2.json();
    
    console.log('✅ Response received');
    console.log('📊 Total assets:', data2.stats?.totalAssets || 0);
    console.log('📋 Assets returned:', data2.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Department filter
  try {
    console.log('Test 3: Department filter');
    // First get available departments
    const response3a = await fetch(`${baseUrl}?page=1&limit=1`);
    const data3a = await response3a.json();
    const firstDept = data3a.filterOptions?.departments?.[0];
    
    if (firstDept) {
      console.log(`Using department: ${firstDept}`);
      const response3 = await fetch(`${baseUrl}?page=1&limit=10&currentDepartment=${encodeURIComponent(firstDept)}`);
      const data3 = await response3.json();
      
      console.log('✅ Response received');
      console.log('📊 Total assets:', data3.stats?.totalAssets || 0);
      console.log('📋 Assets returned:', data3.assets?.length || 0);
    } else {
      console.log('⚠️ No departments available for testing');
    }
    console.log('');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  // Test 4: Status filter
  try {
    console.log('Test 4: Status filter (ACTIVE)');
    const response4 = await fetch(`${baseUrl}?page=1&limit=10&status=ACTIVE`);
    const data4 = await response4.json();
    
    console.log('✅ Response received');
    console.log('📊 Total assets:', data4.stats?.totalAssets || 0);
    console.log('📋 Assets returned:', data4.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
  }
  
  // Test 5: Value range filter
  try {
    console.log('Test 5: Value range filter (1000-10000)');
    const response5 = await fetch(`${baseUrl}?page=1&limit=10&minValue=1000&maxValue=10000`);
    const data5 = await response5.json();
    
    console.log('✅ Response received');
    console.log('📊 Total assets:', data5.stats?.totalAssets || 0);
    console.log('📋 Assets returned:', data5.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 5 failed:', error.message);
  }
  
  // Test 6: Date range filter
  try {
    console.log('Test 6: Date range filter (2023-01-01 to 2024-12-31)');
    const response6 = await fetch(`${baseUrl}?page=1&limit=10&startDate=2023-01-01&endDate=2024-12-31`);
    const data6 = await response6.json();
    
    console.log('✅ Response received');
    console.log('📊 Total assets:', data6.stats?.totalAssets || 0);
    console.log('📋 Assets returned:', data6.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 6 failed:', error.message);
  }
  
  // Test 7: Combined filters
  try {
    console.log('Test 7: Combined filters (ACTIVE status + value range)');
    const response7 = await fetch(`${baseUrl}?page=1&limit=10&status=ACTIVE&minValue=500&maxValue=50000`);
    const data7 = await response7.json();
    
    console.log('✅ Response received');
    console.log('📊 Total assets:', data7.stats?.totalAssets || 0);
    console.log('📋 Assets returned:', data7.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 7 failed:', error.message);
  }
  
  console.log('🎉 Filter tests completed!');
};

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testFilters;
} else if (typeof window !== 'undefined') {
  window.testFilters = testFilters;
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testFilters();
}
