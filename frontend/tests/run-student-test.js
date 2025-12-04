#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set environment variable for headed mode
process.env.JEST_PUPPETEER_CONFIG = path.join(__dirname, 'jest-puppeteer-headed.config.js');

console.log('🚀 Starting Student Journey Tests with Visible Browser...\n');
console.log('📋 Test Configuration:');
console.log('  - Mode: Headed (visible browser)');
console.log('  - Browser: Chrome');
console.log('  - Window Size: 1920x1080');
console.log('  - Screenshots: Enabled\n');

// Ensure screenshots directory exists
const fs = require('fs');
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  console.log('📁 Created screenshots directory\n');
}

// Run the test
const testProcess = spawn('npx', [
  'jest',
  path.join(__dirname, 'student-journey.test.js'),
  '--config=' + path.join(__dirname, 'jest.config.js'),
  '--verbose',
  '--runInBand'
], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All tests completed successfully!');
    console.log('📸 Check the screenshots directory for captured images.');
  } else {
    console.log('\n❌ Tests failed with exit code:', code);
  }
  process.exit(code);
});