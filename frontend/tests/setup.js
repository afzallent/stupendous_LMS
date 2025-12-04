const fs = require('fs');
const path = require('path');

// Global test setup
beforeAll(async () => {
  // Ensure we have a clean environment before tests
  await setupTestEnvironment();
});

afterAll(async () => {
  // Cleanup after all tests
  await cleanupTestEnvironment();
});

beforeEach(async () => {
  // Reset page state before each test
  if (global.page) {
    await global.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear cookies
    const client = await global.page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
  }
});

afterEach(async () => {
  // Take screenshot on test failure
  if (global.page && expect.getState().currentTestName) {
    const testName = expect.getState().currentTestName.replace(/[^a-z0-9]/gi, '_');
    const screenshotPath = path.join(__dirname, 'screenshots', `${testName}_${Date.now()}.png`);
    
    // Ensure screenshot directory exists
    const screenshotDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    try {
      await global.page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      console.log(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }
});

async function setupTestEnvironment() {
  console.log('Setting up test environment...');
  
  // Create necessary directories
  const directories = [
    path.join(__dirname, 'screenshots'),
    path.join(__dirname, 'reports'),
    path.join(__dirname, 'temp')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Set up global variables
  global.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  global.TEST_TIMEOUT = 30000;
  global.PAGE_LOAD_TIMEOUT = 10000;
  
  console.log('Test environment setup complete');
}

async function cleanupTestEnvironment() {
  console.log('Cleaning up test environment...');
  
  // Clean up temporary files if needed
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(tempDir, file));
      } catch (error) {
        console.warn(`Failed to delete temp file ${file}:`, error.message);
      }
    });
  }
  
  console.log('Test environment cleanup complete');
}

// Export utility functions for tests
global.testUtils = {
  BASE_URL: global.BASE_URL,
  
  // Wait for element with timeout
  waitForElement: async (page, selector, timeout = 10000) => {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`Element ${selector} not found within ${timeout}ms`);
      return false;
    }
  },
  
  // Wait for navigation with loading states
  waitForNavigation: async (page, timeout = 10000) => {
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout }),
        page.waitForLoadState?.('networkidle') // For newer versions
      ]);
      return true;
    } catch (error) {
      console.error('Navigation timeout:', error.message);
      return false;
    }
  },
  
  // Take screenshot with timestamp
  takeScreenshot: async (page, name) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, 'screenshots', `${name}_${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  },
  
  // Check for console errors
  getConsoleErrors: (page) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  },
  
  // Measure page load time
  measurePageLoadTime: async (page, url) => {
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const endTime = Date.now();
    return endTime - startTime;
  }
};