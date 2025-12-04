const TestUtils = require('./utils/testUtils');
const { 
  TEST_USERS, 
  BOUNDARY_TEST_VALUES,
  SECURITY_TEST_PAYLOADS 
} = require('./fixtures/testData');

describe('Comprehensive Form Validation Tests', () => {
  let testUtils;
  let page;

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    testUtils = new TestUtils(page);
  });

  afterAll(async () => {
    await page.close();
  });

  beforeEach(async () => {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  describe('Authentication Form Validation', () => {
    test('should validate login form with boundary values', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForSelector('form');

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

      const allResults = [...emailResults, ...passwordResults];
      await testUtils.generateTestReport(allResults, 'login_form_validation');
      
      const failedTests = allResults.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });

    test('should validate signup form with boundary values', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/signup`);
      await page.waitForSelector('form');

      const nameResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.NAME_TESTS.map(test => ({
          field: 'input[name="name"], input[placeholder*="name" i]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );

      const emailResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.EMAIL_TESTS.slice(0, 5).map(test => ({
          field: 'input[type="email"]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );

      const allResults = [...nameResults, ...emailResults];
      await testUtils.generateTestReport(allResults, 'signup_form_validation');
      
      const failedTests = allResults.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });
  });

  describe('Course Creation Form Validation', () => {
    beforeEach(async () => {
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForSelector('form');
    });

    test('should validate course form fields with boundary values', async () => {
      // Test course title
      const titleResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.COURSE_TITLE_TESTS.map(test => ({
          field: 'input[name="title"], input[placeholder*="title" i]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );

      // Test course description
      const descriptionResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.COURSE_DESCRIPTION_TESTS.map(test => ({
          field: 'textarea[name="description"], textarea[placeholder*="description" i]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );

      // Test price validation
      const priceResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.PRICE_TESTS.map(test => ({
          field: 'input[name="price"], input[type="number"]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );

      const allResults = [...titleResults, ...descriptionResults, ...priceResults];
      await testUtils.generateTestReport(allResults, 'course_form_validation');
      
      const failedTests = allResults.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });
  });

  describe('Security Validation Tests', () => {
    test('should prevent XSS attacks in all forms', async () => {
      const testPages = [
        { url: '/auth/login', fields: ['input[type="email"]', 'input[type="password"]'] },
        { url: '/auth/signup', fields: ['input[name="name"]', 'input[type="email"]'] }
      ];

      for (const testPage of testPages) {
        await page.goto(`${testUtils.baseUrl}${testPage.url}`);
        await page.waitForSelector('form');

        for (const field of testPage.fields) {
          const input = await page.$(field);
          if (input) {
            for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS.slice(0, 3)) {
              await input.click({ clickCount: 3 });
              await input.type(xssPayload);
              
              await page.click('button[type="submit"]');
              await page.waitForTimeout(500);
              
              // Should not execute script
              const alertTriggered = await page.evaluate(() => window.lastAlert || null);
              expect(alertTriggered).toBeNull();
              
              await input.click({ clickCount: 3 });
              await input.press('Backspace');
            }
          }
        }
      }
    });

    test('should prevent SQL injection in forms', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForSelector('form');

      for (const sqlPayload of SECURITY_TEST_PAYLOADS.SQL_INJECTION_ATTEMPTS.slice(0, 3)) {
        await testUtils.clearForm('form');
        
        await page.type('input[type="email"]', sqlPayload);
        await page.type('input[type="password"]', 'password123');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Should not be logged in
        const currentUrl = page.url();
        expect(currentUrl).toContain('/auth/login');
      }
    });
  });

  describe('File Upload Validation', () => {
    test('should validate file uploads', async () => {
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForTimeout(2000);
      
      const fileInput = await page.$('input[type="file"]');
      
      if (fileInput) {
        const invalidFiles = [
          { name: 'malware.exe', content: 'fake-exe-content' },
          { name: 'script.js', content: 'alert("xss")' },
          { name: 'large.jpg', content: Buffer.alloc(15 * 1024 * 1024) }
        ];
        
        for (const file of invalidFiles) {
          const tempPath = require('path').join(__dirname, 'temp', file.name);
          require('fs').writeFileSync(tempPath, file.content);
          
          try {
            await fileInput.uploadFile(tempPath);
            await page.waitForTimeout(2000);
            
            // Should show error
            const errorMessage = await page.$('.error, .text-red-500');
            expect(errorMessage).toBeTruthy();
            
            console.log(`File validation working for ${file.name}`);
          } finally {
            try {
              require('fs').unlinkSync(tempPath);
            } catch (e) {}
          }
        }
      } else {
        console.log('No file input found, skipping file upload validation');
      }
    });
  });

  describe('Form Accessibility and UX', () => {
    test('should provide proper form accessibility', async () => {
      const testPages = ['/auth/login', '/auth/signup'];
      
      for (const testPage of testPages) {
        await page.goto(`${testUtils.baseUrl}${testPage}`);
        await page.waitForTimeout(1000);
        
        // Check for form labels
        const inputs = await page.$$('input, textarea, select');
        let unlabeledInputs = 0;
        
        for (const input of inputs) {
          const id = await input.evaluate(el => el.id);
          const ariaLabel = await input.evaluate(el => el.getAttribute('aria-label'));
          const hasLabel = id ? await page.$(`label[for="${id}"]`) : null;
          
          if (!hasLabel && !ariaLabel) {
            unlabeledInputs++;
          }
        }
        
        console.log(`Page ${testPage}: ${unlabeledInputs} unlabeled inputs`);
        expect(unlabeledInputs).toBe(0);
      }
    });

    test('should provide real-time validation feedback', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/signup`);
      await page.waitForSelector('form');
      
      const emailInput = await page.$('input[type="email"]');
      
      if (emailInput) {
        // Type invalid email
        await emailInput.type('invalid');
        await emailInput.blur();
        await page.waitForTimeout(500);
        
        // Should show feedback
        const errorMessage = await page.$('.error, .text-red-500, .invalid');
        expect(errorMessage).toBeTruthy();
        
        // Clear and type valid email
        await emailInput.click({ clickCount: 3 });
        await emailInput.type('valid@example.com');
        await emailInput.blur();
        await page.waitForTimeout(500);
        
        // Error should clear
        const clearedError = await page.$('.error, .text-red-500, .invalid');
        expect(clearedError).toBeFalsy();
      }
    });
  });

  describe('Advanced Edge Cases', () => {
    test('should handle concurrent form submissions', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForSelector('form');
      
      await page.type('input[type="email"]', TEST_USERS.STUDENT.email);
      await page.type('input[type="password"]', TEST_USERS.STUDENT.password);
      
      // Submit multiple times quickly
      const submitButton = await page.$('button[type="submit"]');
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(submitButton.click());
      }
      
      await Promise.all(promises);
      await page.waitForTimeout(3000);
      
      // Should handle gracefully
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(learn|dashboard|auth\/login)/);
    });

    test('should maintain validation state across interactions', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForSelector('form');
      
      // Enter invalid email
      await page.type('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      // Check error appears
      let errorMessage = await page.$('.error, .text-red-500');
      expect(errorMessage).toBeTruthy();
      
      // Clear and enter valid email
      const emailInput = await page.$('input[type="email"]');
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('valid@example.com');
      
      // Error should clear
      await page.waitForTimeout(500);
      errorMessage = await page.$('.error, .text-red-500');
      expect(errorMessage).toBeFalsy();
    });
  });
});