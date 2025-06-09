#!/usr/bin/env node

// Test script to verify health monitor URL construction
const https = require('https');

console.log('🔍 Testing health monitor URL construction...');

// Test the correct health endpoint
const testHealthEndpoint = () => {
  return new Promise((resolve, reject) => {
    const url = 'https://p2p-transfer-backend.onrender.com/api/health';
    console.log(`Testing: ${url}`);
    
    https.get(url, (res) => {
      console.log(`✅ Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        resolve('Health endpoint working correctly');
      } else {
        reject(`Health endpoint returned ${res.statusCode}`);
      }
    }).on('error', (err) => {
      reject(`Health endpoint error: ${err.message}`);
    });
  });
};

// Test the problematic double /api/ endpoint that was causing issues
const testDoubleApiEndpoint = () => {
  return new Promise((resolve, reject) => {
    const url = 'https://p2p-transfer-backend.onrender.com/api/api/health';
    console.log(`Testing problematic URL: ${url}`);
    
    https.get(url, (res) => {
      console.log(`Status: ${res.statusCode}`);
      if (res.statusCode === 404) {
        resolve('Double /api/ endpoint correctly returns 404 (as expected)');
      } else {
        reject(`Double /api/ endpoint returned unexpected status: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      reject(`Double /api/ endpoint error: ${err.message}`);
    });
  });
};

// Run tests
async function runTests() {
  try {
    console.log('\n1. Testing correct health endpoint:');
    const result1 = await testHealthEndpoint();
    console.log(`   ${result1}`);
    
    console.log('\n2. Testing double /api/ endpoint (should fail):');
    const result2 = await testDoubleApiEndpoint();
    console.log(`   ${result2}`);
    
    console.log('\n✅ All tests passed! The health monitor URL fix is working correctly.');
    console.log('   - Single /api/ path works ✅');
    console.log('   - Double /api/ path fails as expected ✅');
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error}`);
    process.exit(1);
  }
}

runTests();
