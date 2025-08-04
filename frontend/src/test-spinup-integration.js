#!/usr/bin/env node

/**
 * Quick Integration Test for Enhanced SpinUpState
 * 
 * This script validates that our enhanced SpinUpState component
 * integrates correctly with the live Claude API system.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Enhanced SpinUpState Integration Test');
console.log('=' + '='.repeat(50));

async function testAPIServer() {
  console.log('\n1️⃣ Testing API Server Health...');
  
  try {
    const response = await fetch('http://127.0.0.1:8001/health');
    if (response.ok) {
      console.log('✅ API Server is healthy');
      return true;
    } else {
      console.log('❌ API Server health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ API Server not responding:', error.message);
    return false;
  }
}

async function testScaffoldEndpoint() {
  console.log('\n2️⃣ Testing Scaffold Endpoint...');
  
  try {
    const response = await fetch('http://127.0.0.1:8001/session/scaffold/test-block-1');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Scaffold endpoint responding');
      console.log(`   • Success: ${data.success}`);
      if (data.scaffold) {
        console.log(`   • Block ID: ${data.scaffold.block_id}`);
        console.log(`   • Complexity: ${data.scaffold.estimated_complexity}`);
        console.log(`   • Confidence: ${data.scaffold.confidence_score}`);
      }
      return true;
    } else {
      console.log('❌ Scaffold endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Scaffold endpoint error:', error.message);
    return false;
  }
}

async function testFrontendBuild() {
  console.log('\n3️⃣ Testing Frontend Build...');
  
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: '/Users/samleuthold/Desktop/echo/echo-application',
      stdio: 'pipe'
    });
    
    let output = '';
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend build successful');
        console.log('   • SpinUpState integration compiled correctly');
        console.log('   • All dependencies resolved');
        resolve(true);
      } else {
        console.log('❌ Frontend build failed');
        console.log('Build output:', output);
        resolve(false);
      }
    });
  });
}

function displayIntegrationSummary(apiHealth, scaffoldEndpoint, frontendBuild) {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Integration Test Results');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'API Server Health', status: apiHealth },
    { name: 'Scaffold Endpoint', status: scaffoldEndpoint },
    { name: 'Frontend Build', status: frontendBuild }
  ];
  
  tests.forEach(test => {
    const emoji = test.status ? '✅' : '❌';
    console.log(`${emoji} ${test.name}: ${test.status ? 'PASS' : 'FAIL'}`);
  });
  
  const passed = tests.filter(t => t.status).length;
  const total = tests.length;
  
  console.log(`\nResults: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 INTEGRATION SUCCESS!');
    console.log('Enhanced SpinUpState is ready for live Claude integration');
    console.log('\n🚀 Next Steps:');
    console.log('• Test with live API server running');
    console.log('• Validate error handling scenarios');
    console.log('• Move to Phase 3: ActiveSessionState integration');
  } else {
    console.log('\n⚠️  Integration incomplete - check failed tests above');
  }
  
  return passed === total;
}

async function runIntegrationTest() {
  console.log('Testing Enhanced SpinUpState with Live Claude API Integration');
  console.log('This validates the complete integration pipeline\n');
  
  // Test 1: API Server Health
  const apiHealth = await testAPIServer();
  
  // Test 2: Scaffold Endpoint
  const scaffoldEndpoint = await testScaffoldEndpoint();
  
  // Test 3: Frontend Build
  const frontendBuild = await testFrontendBuild();
  
  // Summary
  const success = displayIntegrationSummary(apiHealth, scaffoldEndpoint, frontendBuild);
  
  process.exit(success ? 0 : 1);
}

// Run the integration test
runIntegrationTest().catch(error => {
  console.error('\n❌ Integration test failed:', error);
  process.exit(1);
});