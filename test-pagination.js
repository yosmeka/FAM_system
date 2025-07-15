// Simple test script to verify pagination API endpoint
const testPagination = async () => {
  const baseUrl = 'http://localhost:3000/api/reports/assets';
  
  console.log('🧪 Testing pagination implementation...\n');
  
  // Test 1: Default pagination (page 1, limit 25)
  try {
    console.log('Test 1: Default pagination');
    const response1 = await fetch(`${baseUrl}?page=1&limit=25`);
    const data1 = await response1.json();
    
    console.log('✅ Response received');
    console.log('📊 Pagination info:', data1.pagination);
    console.log('📋 Assets returned:', data1.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Different page size
  try {
    console.log('Test 2: Different page size (limit 10)');
    const response2 = await fetch(`${baseUrl}?page=1&limit=10`);
    const data2 = await response2.json();
    
    console.log('✅ Response received');
    console.log('📊 Pagination info:', data2.pagination);
    console.log('📋 Assets returned:', data2.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Second page
  try {
    console.log('Test 3: Second page');
    const response3 = await fetch(`${baseUrl}?page=2&limit=10`);
    const data3 = await response3.json();
    
    console.log('✅ Response received');
    console.log('📊 Pagination info:', data3.pagination);
    console.log('📋 Assets returned:', data3.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  // Test 4: With filters
  try {
    console.log('Test 4: With filters (category filter)');
    const response4 = await fetch(`${baseUrl}?page=1&limit=5&category=COMPUTER`);
    const data4 = await response4.json();
    
    console.log('✅ Response received');
    console.log('📊 Pagination info:', data4.pagination);
    console.log('📋 Assets returned:', data4.assets?.length || 0);
    console.log('');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
  }
  
  console.log('🎉 Pagination tests completed!');
};

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testPagination;
} else if (typeof window !== 'undefined') {
  window.testPagination = testPagination;
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testPagination();
}
