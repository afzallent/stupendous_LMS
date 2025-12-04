#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test suites in order of execution
  testSuites: [
    { name: 'Authentication Tests', file: 'auth.test.js', critical: true },
    { name: 'Form Validation Tests', file: 'formValidation.test.js', critical: true },
    { name: 'Security Tests', file: 'security.test.js', critical: true },
    { name: 'Course Management Tests', file: 'courseManagement.test.js', critical: false },
    { name: 'Student Learning Tests', file: 'studentLearning.test.js', critical: false },
    { name: 'Admin Dashboard Tests', file: 'adminDashboard.test.js', critical: false },
    { name: 'Performance Tests', file: 'performance.test.js', critical: false }
  ],
  
  // Test environments
  environments: {
    local: 'http://localhost:3000',
    staging: process.env.STAGING_URL || 'https://staging.coursecompass.com',
    production: process.env.PRODUCTION_URL || 'https://coursecompass.com'
  },
  
  // Browser configurations
  browsers: ['chromium'], // Add 'firefox', 'webkit' for cross-browser testing
  
  // Test modes
  modes: {
    smoke: ['auth.test.js', 'formValidation.test.js'],
    regression: ['auth.test.js', 'security.test.js', 'courseManagement.test.js'],
    full: 'all'
  }
};

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: []
    };
    this.startTime = Date.now();
  }

  async run(options = {}) {
    const {
      environment = 'local',
      mode = 'full',
      browser = 'chromium',
      headless = true,
      parallel = false,
      generateReport = true
    } = options;

    console.log('\n🚀 Starting CourseCompass V2 Test Suite');
    console.log('=====================================');
    console.log(`Environment: ${environment}`);
    console.log(`Mode: ${mode}`);
    console.log(`Browser: ${browser}`);
    console.log(`Headless: ${headless}`);
    console.log(`Base URL: ${TEST_CONFIG.environments[environment]}`);
    console.log('=====================================\n');

    // Set environment variables
    process.env.BASE_URL = TEST_CONFIG.environments[environment];
    process.env.CI = headless ? 'true' : 'false';

    // Determine which tests to run
    const testsToRun = this.getTestsToRun(mode);
    
    try {
      // Ensure test directories exist
      this.ensureDirectories();
      
      // Start development server if testing locally
      let serverProcess;
      if (environment === 'local') {
        serverProcess = await this.startDevServer();
      }

      // Run tests
      if (parallel && testsToRun.length > 1) {
        await this.runTestsInParallel(testsToRun);
      } else {
        await this.runTestsSequentially(testsToRun);
      }

      // Stop development server
      if (serverProcess) {
        this.stopDevServer(serverProcess);
      }

      // Generate reports
      if (generateReport) {
        await this.generateReports();
      }

      // Print summary
      this.printSummary();

      // Exit with appropriate code
      process.exit(this.results.failed > 0 ? 1 : 0);

    } catch (error) {
      console.error('\n❌ Test execution failed:', error.message);
      process.exit(1);
    }
  }

  getTestsToRun(mode) {
    if (mode === 'full') {
      return TEST_CONFIG.testSuites;
    }
    
    if (TEST_CONFIG.modes[mode]) {
      const testFiles = TEST_CONFIG.modes[mode];
      return TEST_CONFIG.testSuites.filter(suite => 
        testFiles.includes(suite.file));
    }
    
    throw new Error(`Unknown test mode: ${mode}`);
  }

  ensureDirectories() {
    const directories = [
      'tests/screenshots',
      'tests/reports', 
      'tests/temp',
      'tests/coverage'
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async startDevServer() {
    console.log('🔧 Checking if development server is running...');
    
    // First check if server is already running
    try {
      const response = await fetch(`${process.env.BASE_URL}`);
      if (response.ok) {
        console.log('✅ Development server is already running\n');
        return null; // Server already running
      }
    } catch (error) {
      // Server not running, need to start it
    }
    
    console.log('🔧 Starting development server...');
    
    const { spawn } = require('child_process');
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npm.cmd' : 'npm';
    
    const serverProcess = spawn(command, ['run', 'dev'], {
      stdio: 'pipe',
      detached: false,
      shell: isWindows
    });

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Development server failed to start'));
      }, 60000);

      const checkServer = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.BASE_URL}`);
          if (response.ok) {
            clearTimeout(timeout);
            clearInterval(checkServer);
            console.log('✅ Development server is ready\n');
            resolve(serverProcess);
          }
        } catch (error) {
          // Server not ready yet
        }
      }, 2000);
    });
  }

  stopDevServer(serverProcess) {
    if (serverProcess) {
      console.log('\n🔧 Stopping development server...');
      serverProcess.kill('SIGTERM');
    }
  }

  async runTestsSequentially(testSuites) {
    console.log('📋 Running tests sequentially...\n');
    
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }
  }

  async runTestsInParallel(testSuites) {
    console.log('📋 Running tests in parallel...\n');
    
    const promises = testSuites.map(suite => this.runTestSuite(suite));
    await Promise.all(promises);
  }

  async runTestSuite(suite) {
    const startTime = Date.now();
    console.log(`🧪 Running ${suite.name}...`);
    
    try {
      const isWindows = process.platform === 'win32';
      const npxCommand = isWindows ? 'npx.cmd' : 'npx';
      const command = `${npxCommand} jest tests/${suite.file} --config=tests/jest.config.js --verbose`;
      
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      });
      
      const duration = Date.now() - startTime;
      const result = this.parseJestOutput(output);
      
      result.name = suite.name;
      result.file = suite.file;
      result.duration = duration;
      result.critical = suite.critical;
      
      this.results.suites.push(result);
      this.results.total += result.total;
      this.results.passed += result.passed;
      this.results.failed += result.failed;
      this.results.skipped += result.skipped;
      
      if (result.failed > 0) {
        console.log(`❌ ${suite.name} failed (${result.failed}/${result.total})`);
        if (suite.critical) {
          console.log(`⚠️  Critical test suite failed. Consider stopping execution.`);
        }
      } else {
        console.log(`✅ ${suite.name} passed (${result.passed}/${result.total})`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`💥 ${suite.name} crashed: ${error.message}`);
      
      this.results.suites.push({
        name: suite.name,
        file: suite.file,
        duration,
        critical: suite.critical,
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        error: error.message
      });
      
      this.results.failed += 1;
      this.results.total += 1;
    }
  }

  parseJestOutput(output) {
    // Parse Jest output to extract test results
    const lines = output.split('\n');
    const summary = lines.find(line => line.includes('Test Suites:')) || '';
    
    // Default result structure
    let result = {
      total: 0,
      passed: 0, 
      failed: 0,
      skipped: 0
    };
    
    // Try to parse Jest summary
    const testMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      result = {
        failed: parseInt(testMatch[1]),
        passed: parseInt(testMatch[2]),
        total: parseInt(testMatch[3]),
        skipped: 0
      };
    } else {
      // Fallback parsing
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      
      if (passedMatch) result.passed = parseInt(passedMatch[1]);
      if (failedMatch) result.failed = parseInt(failedMatch[1]);
      result.total = result.passed + result.failed + result.skipped;
    }
    
    return result;
  }

  async generateReports() {
    console.log('\n📊 Generating test reports...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.BASE_URL,
      duration: Date.now() - this.startTime,
      summary: this.results,
      suites: this.results.suites.map(suite => ({
        name: suite.name,
        file: suite.file,
        duration: suite.duration,
        critical: suite.critical,
        passed: suite.passed,
        failed: suite.failed,
        total: suite.total,
        successRate: suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(2) : 0
      }))
    };
    
    // Generate JSON report
    const jsonReportPath = path.join('tests/reports', `test-report-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlReportPath = path.join('tests/reports', `test-report-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`📄 JSON Report: ${jsonReportPath}`);
    console.log(`🌐 HTML Report: ${htmlReportPath}`);
  }

  generateHTMLReport(data) {
    const successRate = data.summary.total > 0 ? 
      ((data.summary.passed / data.summary.total) * 100).toFixed(2) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>CourseCompass V2 Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9f7ef; padding: 15px; border-radius: 5px; text-align: center; }
        .metric.failed { background: #fadbd8; }
        .metric.warning { background: #fef9e7; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .passed { color: #27ae60; }
        .failed { color: #e74c3c; }
        .critical { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CourseCompass V2 Test Report</h1>
        <p><strong>Generated:</strong> ${data.timestamp}</p>
        <p><strong>Environment:</strong> ${data.environment}</p>
        <p><strong>Duration:</strong> ${Math.round(data.duration / 1000)}s</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div style="font-size: 24px;">${data.summary.total}</div>
        </div>
        <div class="metric ${data.summary.passed > 0 ? '' : 'warning'}">
            <h3>Passed</h3>
            <div style="font-size: 24px; color: #27ae60;">${data.summary.passed}</div>
        </div>
        <div class="metric ${data.summary.failed > 0 ? 'failed' : ''}">
            <h3>Failed</h3>
            <div style="font-size: 24px; color: #e74c3c;">${data.summary.failed}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div style="font-size: 24px;">${successRate}%</div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Test Suite</th>
                <th>Status</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Total</th>
                <th>Success Rate</th>
                <th>Duration</th>
            </tr>
        </thead>
        <tbody>
            ${data.suites.map(suite => `
                <tr>
                    <td class="${suite.critical ? 'critical' : ''}">${suite.name}</td>
                    <td class="${suite.failed > 0 ? 'failed' : 'passed'}">
                        ${suite.failed > 0 ? 'FAILED' : 'PASSED'}
                    </td>
                    <td>${suite.passed}</td>
                    <td>${suite.failed}</td>
                    <td>${suite.total}</td>
                    <td>${suite.successRate}%</td>
                    <td>${Math.round(suite.duration / 1000)}s</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  printSummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const successRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(2) : 0;
    
    console.log('\n📊 Test Execution Summary');
    console.log('=========================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Skipped: ${this.results.skipped}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}s`);
    console.log('=========================');
    
    if (this.results.failed > 0) {
      console.log('\n❌ Some tests failed. Check the reports for details.');
      
      const criticalFailures = this.results.suites.filter(s => s.critical && s.failed > 0);
      if (criticalFailures.length > 0) {
        console.log('\n⚠️  Critical test failures detected:');
        criticalFailures.forEach(suite => {
          console.log(`   - ${suite.name}`);
        });
      }
    } else {
      console.log('\n✅ All tests passed successfully!');
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--env':
      case '--environment':
        options.environment = args[++i];
        break;
      case '--mode':
        options.mode = args[++i];
        break;
      case '--browser':
        options.browser = args[++i];
        break;
      case '--headed':
        options.headless = false;
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--no-report':
        options.generateReport = false;
        break;
      case '--help':
        console.log(`
CourseCompass V2 Test Runner

Usage: node test-runner.js [options]

Options:
  --env <environment>    Test environment (local, staging, production)
  --mode <mode>         Test mode (smoke, regression, full)
  --browser <browser>   Browser to use (chromium, firefox, webkit)
  --headed              Run tests in headed mode (visible browser)
  --parallel            Run test suites in parallel
  --no-report           Skip report generation
  --help                Show this help message

Examples:
  node test-runner.js --env local --mode smoke
  node test-runner.js --env staging --mode regression --headed
  node test-runner.js --env production --mode full --parallel
        `);
        process.exit(0);
        break;
    }
  }
  
  const runner = new TestRunner();
  runner.run(options).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;