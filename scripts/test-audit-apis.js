// Quick API test script for audit workflow endpoints
// Run with: node scripts/test-audit-apis.js

const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, options = {}) {
  try {
    console.log(`🔍 Testing ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${response.status} - Success`);
      if (Array.isArray(data)) {
        console.log(`   📊 Returned ${data.length} items`);
      } else if (data.stats) {
        console.log(`   📈 Stats: ${JSON.stringify(data.stats, null, 2)}`);
      }
    } else {
      console.log(`❌ ${response.status} - ${data.error || 'Error'}`);
      if (data.details) {
        console.log(`   📝 Details: ${data.details}`);
      }
    }
    
    return { response, data };
  } catch (error) {
    console.log(`💥 Network Error: ${error.message}`);
    return { error };
  }
}

async function runTests() {
  console.log('🧪 Testing Audit Workflow APIs\n');
  console.log('⚠️  Note: These tests will fail without proper authentication');
  console.log('   For full testing, use the browser or add session tokens\n');

  // Test audit assignments endpoint
  await testAPI('/api/audit-assignments');
  
  // Test audit requests endpoint  
  await testAPI('/api/audit-requests');
  
  // Test audit reports endpoint
  await testAPI('/api/reports/audits');
  
  // Test creating assignment (will fail without auth)
  await testAPI('/api/audit-assignments', {
    method: 'POST',
    body: {
      assetId: 'test-asset-id',
      assignedToId: 'test-user-id',
      title: 'Test Assignment',
      dueDate: new Date().toISOString()
    }
  });

  // Test creating request (will fail without auth)
  await testAPI('/api/audit-requests', {
    method: 'POST',
    body: {
      assetId: 'test-asset-id',
      title: 'Test Request',
      reason: 'Testing API',
      requestedDate: new Date().toISOString()
    }
  });

  console.log('\n✅ API tests completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: node scripts/seed-audit-test-data.js');
  console.log('2. Login to the app and test manually');
  console.log('3. Check Prisma Studio: http://localhost:5555');
  console.log('4. Test workflow: http://localhost:3000/audits/workflow');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or install node-fetch');
  console.log('   Alternative: Test APIs manually in browser or Postman');
} else {
  runTests();
}
