const fs = require('fs');
const path = require('path');

class TestUtils {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  // Authentication helpers
  async login(email, password, role = 'STUDENT') {
    await this.page.goto(`${this.baseUrl}/auth/login`);
    await this.page.waitForSelector('input[type="email"]');
    
    await this.page.type('input[type="email"]', email);
    await this.page.type('input[type="password"]', password);
    
    const startTime = Date.now();
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
      this.page.click('button[type="submit"]')
    ]);
    const loginTime = Date.now() - startTime;
    
    // Verify successful login based on role
    const expectedUrls = {
      'STUDENT': '/learn',
      'TRAINER': '/instructor', 
      'ADMIN': '/admin'
    };
    
    const currentUrl = this.page.url();
    const isLoggedIn = currentUrl.includes(expectedUrls[role] || '/');
    
    return { success: isLoggedIn, loginTime, redirectUrl: currentUrl };
  }

  async logout() {
    const logoutButton = await this.page.$('[data-testid="logout-button"]') || 
                        await this.page.$('button:contains("Logout")') ||
                        await this.page.$('a[href*="logout"]');
    
    if (logoutButton) {
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        logoutButton.click()
      ]);
    }
    
    return this.page.url().includes('/auth/login') || this.page.url() === `${this.baseUrl}/`;
  }

  // Form validation helpers
  async testFormValidation(formSelector, testCases) {
    const results = [];
    
    for (const testCase of testCases) {
      const { field, value, expectedError, shouldPass } = testCase;
      
      // Clear form
      await this.clearForm(formSelector);
      
      // Fill field with test value
      await this.page.type(`${formSelector} ${field}`, value);
      
      // Try to submit or trigger validation
      await this.page.click(`${formSelector} button[type="submit"]`);
      
      // Wait for validation
      await this.page.waitForTimeout(500);
      
      // Check for error messages
      const errorElements = await this.page.$$('.error, .text-red-500, [data-testid*="error"]');
      const hasError = errorElements.length > 0;
      
      const errorText = hasError ? 
        await errorElements[0].evaluate(el => el.textContent) : null;
      
      results.push({
        field,
        value,
        expectedError,
        shouldPass,
        actualError: errorText,
        passed: shouldPass ? !hasError : hasError
      });
    }
    
    return results;
  }

  async clearForm(formSelector) {
    const inputs = await this.page.$$(`${formSelector} input, ${formSelector} textarea`);
    for (const input of inputs) {
      await input.click({ clickCount: 3 });
      await input.press('Backspace');
    }
  }

  // Performance testing helpers
  async measurePagePerformance(url) {
    const startTime = Date.now();
    
    // Start monitoring network requests
    const responses = [];
    this.page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        type: response.request().resourceType()
      });
    });
    
    // Navigate to page
    await this.page.goto(url, { waitUntil: 'networkidle0' });
    
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceMetrics = await this.page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
      };
    });
    
    // Get Lighthouse-style metrics if available
    const metrics = await this.page.metrics();
    
    return {
      loadTime,
      performanceMetrics,
      metrics,
      responses: responses.length,
      errors: responses.filter(r => r.status >= 400).length
    };
  }

  // Security testing helpers
  async checkForSecurityHeaders(url) {
    const response = await this.page.goto(url);
    const headers = response.headers();
    
    const securityHeaders = {
      'content-security-policy': headers['content-security-policy'],
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'strict-transport-security': headers['strict-transport-security'],
      'referrer-policy': headers['referrer-policy']
    };
    
    return securityHeaders;
  }

  async checkForSensitiveDataExposure() {
    // Check for exposed sensitive data in page source
    const content = await this.page.content();
    const sensitivePatterns = [
      /password\s*[:=]\s*["'][^"']+["']/i,
      /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
      /secret\s*[:=]\s*["'][^"']+["']/i,
      /token\s*[:=]\s*["'][^"']+["']/i,
      /jwt\s*[:=]\s*["'][^"']+["']/i
    ];
    
    const exposedData = [];
    sensitivePatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        exposedData.push({
          type: ['password', 'api_key', 'secret', 'token', 'jwt'][index],
          match: matches[0]
        });
      }
    });
    
    return exposedData;
  }

  // Accessibility helpers
  async checkAccessibility() {
    const issues = [];
    
    // Check for missing alt text on images
    const images = await this.page.$$('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images missing alt text`);
    }
    
    // Check for missing form labels
    const unlabeledInputs = await this.page.$$('input:not([aria-label]):not([aria-labelledby])');
    const inputsWithoutLabels = [];
    
    for (const input of unlabeledInputs) {
      const id = await input.evaluate(el => el.id);
      const hasLabel = await this.page.$(`label[for="${id}"]`);
      if (!hasLabel) {
        inputsWithoutLabels.push(input);
      }
    }
    
    if (inputsWithoutLabels.length > 0) {
      issues.push(`${inputsWithoutLabels.length} form inputs missing labels`);
    }
    
    // Check for proper heading structure
    const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', 
      headings => headings.map(h => h.tagName));
    
    if (headings.filter(h => h === 'H1').length !== 1) {
      issues.push('Page should have exactly one H1 heading');
    }
    
    return issues;
  }

  // Data generation helpers
  generateTestData() {
    const timestamp = Date.now();
    return {
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123!',
      name: `Test User ${timestamp}`,
      weakPassword: '123',
      strongPassword: 'VeryStrongP@ssw0rd123!',
      invalidEmail: 'invalid-email',
      longText: 'A'.repeat(1000),
      sqlInjection: "'; DROP TABLE users; --",
      xssAttempt: '<script>alert("XSS")</script>',
      specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      unicodeText: '测试数据 🎉 العربية',
      emptyString: '',
      whitespaceOnly: '   \t\n   ',
      maxLength: 'A'.repeat(255),
      overMaxLength: 'A'.repeat(256)
    };
  }

  // File upload helpers
  async testFileUpload(fileInputSelector, testFiles) {
    const results = [];
    
    for (const testFile of testFiles) {
      const { fileName, content, shouldPass, expectedError } = testFile;
      
      // Create temporary test file
      const tempFilePath = path.join(__dirname, 'temp', fileName);
      fs.writeFileSync(tempFilePath, content);
      
      try {
        // Upload file
        const input = await this.page.$(fileInputSelector);
        await input.uploadFile(tempFilePath);
        
        // Wait for upload result
        await this.page.waitForTimeout(2000);
        
        // Check for success/error indicators
        const errorElement = await this.page.$('.error, .text-red-500');
        const successElement = await this.page.$('.success, .text-green-500');
        
        const hasError = !!errorElement;
        const hasSuccess = !!successElement;
        
        results.push({
          fileName,
          shouldPass,
          expectedError,
          actuallyPassed: hasSuccess && !hasError,
          actualError: hasError ? await errorElement.textContent() : null
        });
        
      } catch (error) {
        results.push({
          fileName,
          shouldPass,
          expectedError,
          actuallyPassed: false,
          actualError: error.message
        });
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }
    
    return results;
  }

  // Report generation
  async generateTestReport(testResults, testName) {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      results: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.passed || r.actuallyPassed).length,
        failed: testResults.filter(r => !r.passed && !r.actuallyPassed).length
      }
    };
    
    const reportPath = path.join(__dirname, 'reports', `${testName}_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }
}

module.exports = TestUtils;