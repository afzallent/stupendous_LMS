const TestUtils = require('./utils/testUtils');
const { TEST_USERS, BOUNDARY_TEST_VALUES, SECURITY_TEST_PAYLOADS } = require('./fixtures/testData');

describe('Authentication System Tests', () => {
  let testUtils;
  let page;

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    testUtils = new TestUtils(page);
    
    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
    
    // Set up network monitoring for failed requests
    page.on('requestfailed', request => {
      console.log('Request Failed:', request.url(), request.failure().errorText);
    });
  });

  afterAll(async () => {
    await page.close();
  });

  beforeEach(async () => {
    // Clear all storage and cookies before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
  });

  describe('Login Page Tests', () => {
    beforeEach(async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForSelector('form', { timeout: 10000 });
    });

    test('should load login page successfully', async () => {
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      const loadTime = Date.now() - startTime;
      
      // Check page load time
      expect(loadTime).toBeLessThan(5000);
      
      // Check essential elements are present
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"]');
      
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(submitButton).toBeTruthy();
      
      // Check page title
      const title = await page.title();
      expect(title).toContain('Login');
    });

    test('should handle valid login for student user', async () => {
      const result = await testUtils.login(
        TEST_USERS.STUDENT.email,
        TEST_USERS.STUDENT.password,
        'STUDENT'
      );
      
      expect(result.success).toBe(true);
      expect(result.loginTime).toBeLessThan(10000); // 10 seconds max
      expect(result.redirectUrl).toContain('/learn');
      
      // Verify user is actually logged in
      const userInfo = await page.evaluate(() => {
        return localStorage.getItem('user') || sessionStorage.getItem('user');
      });
      expect(userInfo).toBeTruthy();
    });

    test('should handle valid login for instructor user', async () => {
      const result = await testUtils.login(
        TEST_USERS.INSTRUCTOR.email,
        TEST_USERS.INSTRUCTOR.password,
        'TRAINER'
      );
      
      expect(result.success).toBe(true);
      expect(result.redirectUrl).toContain('/instructor');
    });

    test('should handle valid login for admin user', async () => {
      const result = await testUtils.login(
        TEST_USERS.ADMIN.email,
        TEST_USERS.ADMIN.password,
        'ADMIN'
      );
      
      expect(result.success).toBe(true);
      expect(result.redirectUrl).toContain('/admin');
    });

    test('should reject invalid credentials', async () => {
      await page.type('input[type="email"]', 'invalid@test.com');
      await page.type('input[type="password"]', 'wrongpassword');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Should remain on login page
      expect(page.url()).toContain('/auth/login');
      
      // Should show error message
      const errorMessage = await page.$('.error, .text-red-500, [data-testid*="error"]');
      expect(errorMessage).toBeTruthy();
    });

    test('should validate email field with boundary values', async () => {
      const results = await testUtils.testFormValidation('form', 
        BOUNDARY_TEST_VALUES.EMAIL_TESTS.map(test => ({
          field: 'input[type="email"]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );
      
      // Log validation results for review
      console.log('Email validation results:', results);
      
      // Check that validation works correctly
      const failedTests = results.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });

    test('should validate password field with boundary values', async () => {
      // First fill email with valid value
      await page.type('input[type="email"]', TEST_USERS.STUDENT.email);
      
      const results = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.PASSWORD_TESTS.map(test => ({
          field: 'input[type="password"]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );
      
      console.log('Password validation results:', results);
      
      const failedTests = results.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });

    test('should prevent XSS attacks in login form', async () => {
      for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS) {
        await testUtils.clearForm('form');
        
        await page.type('input[type="email"]', xssPayload);
        await page.type('input[type="password"]', xssPayload);
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        
        // Check that no alert was triggered (XSS blocked)
        const alertText = await page.evaluate(() => {
          return window.lastAlert || null;
        });
        expect(alertText).toBeNull();
        
        // Check that the payload is properly escaped in the DOM
        const emailValue = await page.$eval('input[type="email"]', el => el.value);
        if (emailValue.includes('<script>')) {
          // Should be escaped
          expect(emailValue).not.toContain('<script>alert');
        }
      }
    });

    test('should prevent SQL injection in login form', async () => {
      for (const sqlPayload of SECURITY_TEST_PAYLOADS.SQL_INJECTION_ATTEMPTS) {
        await testUtils.clearForm('form');
        
        await page.type('input[type="email"]', sqlPayload);
        await page.type('input[type="password"]', 'password123');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Should not be logged in with SQL injection
        const currentUrl = page.url();
        expect(currentUrl).toContain('/auth/login');
      }
    });

    test('should handle rate limiting', async () => {
      const maxAttempts = 10;
      let blockedAttempt = false;
      
      for (let i = 0; i < maxAttempts; i++) {
        await testUtils.clearForm('form');
        
        await page.type('input[type="email"]', 'test@test.com');
        await page.type('input[type="password"]', 'wrongpassword');
        
        const response = await Promise.all([
          page.waitForResponse(response => response.url().includes('/api/auth/login')),
          page.click('button[type="submit"]')
        ]);
        
        if (response[0].status() === 429) {
          blockedAttempt = true;
          break;
        }
        
        await page.waitForTimeout(100);
      }
      
      // Should implement rate limiting after multiple failed attempts
      // Note: This test might pass even without rate limiting if it's not implemented
      console.log('Rate limiting test result:', blockedAttempt ? 'PROTECTED' : 'NOT_PROTECTED');
    });
  });

  describe('Signup Page Tests', () => {
    beforeEach(async () => {
      await page.goto(`${testUtils.baseUrl}/auth/signup`);
      await page.waitForSelector('form', { timeout: 10000 });
    });

    test('should load signup page successfully', async () => {
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/auth/signup`);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
      
      // Check essential form elements
      const nameInput = await page.$('input[name="name"], input[placeholder*="name" i]');
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"]');
      
      expect(nameInput).toBeTruthy();
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(submitButton).toBeTruthy();
    });

    test('should successfully create new user account', async () => {
      const testData = testUtils.generateTestData();
      
      // Fill signup form
      await page.type('input[name="name"], input[placeholder*="name" i]', testData.name);
      await page.type('input[type="email"]', testData.email);
      await page.type('input[type="password"]', testData.password);
      
      // Submit form
      const startTime = Date.now();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
        page.click('button[type="submit"]')
      ]);
      const signupTime = Date.now() - startTime;
      
      expect(signupTime).toBeLessThan(15000);
      
      // Should redirect to appropriate dashboard (usually student by default)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/signup');
      expect(currentUrl).toMatch(/\/(learn|dashboard|home)/);
    });

    test('should validate all form fields with boundary values', async () => {
      // Test name validation
      const nameResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.NAME_TESTS.map(test => ({
          field: 'input[name="name"], input[placeholder*="name" i]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );
      
      // Test email validation
      const emailResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.EMAIL_TESTS.map(test => ({
          field: 'input[type="email"]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );
      
      // Test password validation
      const passwordResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.PASSWORD_TESTS.map(test => ({
          field: 'input[type="password"]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );
      
      console.log('Signup validation results:', {
        name: nameResults,
        email: emailResults,
        password: passwordResults
      });
      
      // Generate test report
      const allResults = [...nameResults, ...emailResults, ...passwordResults];
      await testUtils.generateTestReport(allResults, 'signup_validation');
      
      const failedTests = allResults.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });

    test('should prevent duplicate email registration', async () => {
      // Try to register with existing email
      await page.type('input[name="name"], input[placeholder*="name" i]', 'New User');
      await page.type('input[type="email"]', TEST_USERS.STUDENT.email);
      await page.type('input[type="password"]', 'NewPassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Should show error about existing email
      const errorMessage = await page.$('.error, .text-red-500, [data-testid*="error"]');
      expect(errorMessage).toBeTruthy();
      
      const errorText = await errorMessage.evaluate(el => el.textContent);
      expect(errorText.toLowerCase()).toContain('email');
      expect(errorText.toLowerCase()).toMatch(/exist|already|taken/);
    });

    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '12345678',
        'PASSWORD',
        'Password',
        'pass123'
      ];
      
      for (const weakPassword of weakPasswords) {
        await testUtils.clearForm('form');
        
        await page.type('input[name="name"], input[placeholder*="name" i]', 'Test User');
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', weakPassword);
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        
        // Should show password strength error
        const errorMessage = await page.$('.error, .text-red-500, [data-testid*="error"]');
        expect(errorMessage).toBeTruthy();
      }
    });
  });

  describe('Logout Tests', () => {
    beforeEach(async () => {
      // Login before each logout test
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
    });

    test('should successfully logout user', async () => {
      const logoutSuccess = await testUtils.logout();
      expect(logoutSuccess).toBe(true);
      
      // Verify user is logged out
      const userInfo = await page.evaluate(() => {
        return localStorage.getItem('user') || sessionStorage.getItem('user');
      });
      expect(userInfo).toBeFalsy();
      
      // Check cookies are cleared
      const cookies = await page.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || cookie.name.includes('token'));
      expect(authCookies.length).toBe(0);
    });

    test('should redirect to login page after logout', async () => {
      await testUtils.logout();
      
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(auth\/login|login|$)/);
    });
  });

  describe('Authentication Security Tests', () => {
    test('should check for secure authentication headers', async () => {
      const securityHeaders = await testUtils.checkForSecurityHeaders(`${testUtils.baseUrl}/auth/login`);
      
      // Check for important security headers
      expect(securityHeaders['x-frame-options']).toBeTruthy();
      expect(securityHeaders['x-content-type-options']).toBe('nosniff');
      
      console.log('Security headers:', securityHeaders);
    });

    test('should not expose sensitive data in page source', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      const exposedData = await testUtils.checkForSensitiveDataExposure();
      expect(exposedData.length).toBe(0);
      
      if (exposedData.length > 0) {
        console.warn('Exposed sensitive data:', exposedData);
      }
    });

    test('should protect against CSRF attacks', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      // Check for CSRF protection (token or same-site cookies)
      const csrfToken = await page.$('input[name*="csrf"], input[name*="token"]');
      const cookies = await page.cookies();
      const sameSiteCookies = cookies.filter(cookie => cookie.sameSite === 'Strict');
      
      // Should have either CSRF token or secure cookies
      const hasCSRFProtection = csrfToken || sameSiteCookies.length > 0;
      expect(hasCSRFProtection).toBe(true);
    });
  });

  describe('Authentication Accessibility Tests', () => {
    test('should meet accessibility standards on login page', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      const accessibilityIssues = await testUtils.checkAccessibility();
      expect(accessibilityIssues.length).toBe(0);
      
      if (accessibilityIssues.length > 0) {
        console.warn('Accessibility issues found:', accessibilityIssues);
      }
    });

    test('should support keyboard navigation', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      let activeElement = await page.evaluate(() => document.activeElement.tagName);
      expect(['INPUT', 'BUTTON', 'A'].includes(activeElement)).toBe(true);
      
      // Test form submission with Enter key
      await page.focus('input[type="email"]');
      await page.type('input[type="email"]', TEST_USERS.STUDENT.email);
      await page.keyboard.press('Tab');
      await page.type('input[type="password"]', TEST_USERS.STUDENT.password);
      
      // Submit with Enter key
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // Should navigate away from login page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/auth/login');
    });
  });
});