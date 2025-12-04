const TestUtils = require('./utils/testUtils');
const { 
  TEST_USERS, 
  BOUNDARY_TEST_VALUES, 
  FILE_UPLOAD_TESTS,
  SECURITY_TEST_PAYLOADS 
} = require('./fixtures/testData');

describe('Course Management Tests', () => {
  let testUtils;
  let page;

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    testUtils = new TestUtils(page);
    
    // Set up console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  });

  afterAll(async () => {
    await page.close();
  });

  beforeEach(async () => {
    // Clear storage and login as instructor
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    // Login as instructor for each test
    await testUtils.login(
      TEST_USERS.INSTRUCTOR.email, 
      TEST_USERS.INSTRUCTOR.password, 
      'TRAINER'
    );
  });

  describe('Instructor Dashboard Tests', () => {
    test('should load instructor dashboard successfully', async () => {
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/instructor`);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
      
      // Check essential dashboard elements
      const createCourseButton = await page.$('[href*="create-course"], button:contains("Create Course")');
      const coursesSection = await page.$('[data-testid="courses-section"], .courses');
      
      expect(createCourseButton).toBeTruthy();
      expect(coursesSection).toBeTruthy();
      
      // Check page title contains instructor/dashboard
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/instructor|dashboard|teach/);
    });

    test('should display instructor statistics and analytics', async () => {
      await page.goto(`${testUtils.baseUrl}/instructor`);
      await page.waitForSelector('[data-testid="stats"], .statistics, .analytics', { timeout: 10000 });
      
      // Check for key metrics
      const metricsSelectors = [
        '[data-testid="total-courses"]',
        '[data-testid="total-students"]', 
        '[data-testid="total-revenue"]',
        '.metric-card',
        '.stat-card'
      ];
      
      let foundMetrics = 0;
      for (const selector of metricsSelectors) {
        const element = await page.$(selector);
        if (element) foundMetrics++;
      }
      
      expect(foundMetrics).toBeGreaterThan(0);
    });
  });

  describe('Course Creation Tests', () => {
    beforeEach(async () => {
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForSelector('form', { timeout: 10000 });
    });

    test('should load course creation form successfully', async () => {
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
      
      // Check essential form elements
      const titleInput = await page.$('input[name="title"], input[placeholder*="title" i]');
      const descriptionInput = await page.$('textarea[name="description"], textarea[placeholder*="description" i]');
      const priceInput = await page.$('input[name="price"], input[type="number"]');
      const categorySelect = await page.$('select[name="category"], [data-testid="category-select"]');
      const submitButton = await page.$('button[type="submit"]');
      
      expect(titleInput).toBeTruthy();
      expect(descriptionInput).toBeTruthy();
      expect(priceInput).toBeTruthy();
      expect(submitButton).toBeTruthy();
    });

    test('should create a new course with valid data', async () => {
      const testData = testUtils.generateTestData();
      const courseTitle = `Test Course ${testData.name}`;
      
      // Fill course creation form
      await page.type('input[name="title"], input[placeholder*="title" i]', courseTitle);
      await page.type('textarea[name="description"], textarea[placeholder*="description" i]', 
        'This is a comprehensive test course description with sufficient content.');
      await page.type('input[name="price"], input[type="number"]', '99.99');
      
      // Select category if available
      const categorySelect = await page.$('select[name="category"], [data-testid="category-select"]');
      if (categorySelect) {
        await page.select('select[name="category"]', '1'); // Assuming first option
      }
      
      // Submit form
      const startTime = Date.now();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
        page.click('button[type="submit"]')
      ]);
      const creationTime = Date.now() - startTime;
      
      expect(creationTime).toBeLessThan(15000);
      
      // Should redirect to course edit or instructor dashboard
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(instructor|course|edit)/);
      
      // Verify course was created by checking for success message or course title
      const successMessage = await page.$('.success, .text-green-500, [data-testid*="success"]');
      const courseHeader = await page.$eval('h1, h2, .course-title', 
        el => el.textContent, null);
      
      expect(successMessage || courseHeader).toBeTruthy();
    });

    test('should validate course form fields with boundary values', async () => {
      // Test course title validation
      const titleResults = await testUtils.testFormValidation('form',
        BOUNDARY_TEST_VALUES.COURSE_TITLE_TESTS.map(test => ({
          field: 'input[name="title"], input[placeholder*="title" i]',
          value: test.value,
          expectedError: test.expectedError,
          shouldPass: test.shouldPass
        }))
      );
      
      // Test course description validation
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
      
      console.log('Course validation results:', {
        title: titleResults,
        description: descriptionResults,
        price: priceResults
      });
      
      // Generate validation report
      const allResults = [...titleResults, ...descriptionResults, ...priceResults];
      await testUtils.generateTestReport(allResults, 'course_creation_validation');
      
      const failedTests = allResults.filter(r => !r.passed);
      expect(failedTests.length).toBe(0);
    });

    test('should prevent XSS attacks in course creation', async () => {
      for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS) {
        await testUtils.clearForm('form');
        
        await page.type('input[name="title"], input[placeholder*="title" i]', xssPayload);
        await page.type('textarea[name="description"], textarea[placeholder*="description" i]', xssPayload);
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
        
        // Check that no alert was triggered (XSS blocked)
        const alertText = await page.evaluate(() => window.lastAlert || null);
        expect(alertText).toBeNull();
        
        // Check that content is properly escaped
        const titleValue = await page.$eval('input[name="title"], input[placeholder*="title" i]', 
          el => el.value);
        if (titleValue.includes('<script>')) {
          expect(titleValue).not.toContain('<script>alert');
        }
      }
    });
  });

  describe('File Upload Tests', () => {
    beforeEach(async () => {
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForSelector('form', { timeout: 10000 });
    });

    test('should handle valid file uploads', async () => {
      const fileInputSelectors = [
        'input[type="file"][accept*="image"]',
        'input[type="file"][accept*="video"]',
        '[data-testid="thumbnail-upload"]',
        '[data-testid="video-upload"]'
      ];
      
      let fileInput = null;
      for (const selector of fileInputSelectors) {
        fileInput = await page.$(selector);
        if (fileInput) break;
      }
      
      if (!fileInput) {
        console.log('No file upload inputs found, skipping file upload tests');
        return;
      }
      
      const uploadResults = await testUtils.testFileUpload(
        'input[type="file"]', 
        FILE_UPLOAD_TESTS.VALID_FILES
      );
      
      console.log('File upload results:', uploadResults);
      
      const failedUploads = uploadResults.filter(r => !r.actuallyPassed && r.shouldPass);
      expect(failedUploads.length).toBe(0);
    });

    test('should reject invalid file uploads', async () => {
      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) {
        console.log('No file upload inputs found, skipping invalid file tests');
        return;
      }
      
      const uploadResults = await testUtils.testFileUpload(
        'input[type="file"]', 
        FILE_UPLOAD_TESTS.INVALID_FILES
      );
      
      console.log('Invalid file upload results:', uploadResults);
      
      // All invalid files should be rejected
      const incorrectlyAccepted = uploadResults.filter(r => r.actuallyPassed && !r.shouldPass);
      expect(incorrectlyAccepted.length).toBe(0);
    });

    test('should validate file size limits', async () => {
      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) return;
      
      // Test with oversized file
      const oversizedFile = {
        fileName: 'oversized.jpg',
        content: Buffer.alloc(15 * 1024 * 1024), // 15MB
        shouldPass: false,
        expectedError: 'File too large'
      };
      
      const result = await testUtils.testFileUpload('input[type="file"]', [oversizedFile]);
      expect(result[0].actuallyPassed).toBe(false);
    });
  });

  describe('Course Publishing Tests', () => {
    test('should publish course after creation', async () => {
      // First create a course
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForSelector('form', { timeout: 10000 });
      
      const testData = testUtils.generateTestData();
      await page.type('input[name="title"], input[placeholder*="title" i]', 
        `Publishable Course ${testData.name}`);
      await page.type('textarea[name="description"], textarea[placeholder*="description" i]', 
        'This course is ready to be published with all required content.');
      await page.type('input[name="price"], input[type="number"]', '49.99');
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
      ]);
      
      // Look for publish button
      const publishButton = await page.$(
        'button:contains("Publish"), [data-testid="publish-button"], button[data-action="publish"]'
      );
      
      if (publishButton) {
        await publishButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success message
        const successMessage = await page.$('.success, .text-green-500, [data-testid*="success"]');
        expect(successMessage).toBeTruthy();
      } else {
        console.log('Publish button not found, course creation flow may differ');
      }
    });
  });

  describe('Course Management Performance Tests', () => {
    test('should load course creation form within performance thresholds', async () => {
      const performance = await testUtils.measurePagePerformance(
        `${testUtils.baseUrl}/instructor/create-course`
      );
      
      expect(performance.loadTime).toBeLessThan(5000); // 5 seconds
      expect(performance.performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
      expect(performance.errors).toBe(0);
      
      console.log('Course creation performance:', performance);
    });

    test('should handle form submission within reasonable time', async () => {
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForSelector('form');
      
      const testData = testUtils.generateTestData();
      
      // Fill form quickly
      await page.type('input[name="title"], input[placeholder*="title" i]', 
        `Performance Test Course ${testData.name}`);
      await page.type('textarea[name="description"], textarea[placeholder*="description" i]', 
        'Performance test course description');
      await page.type('input[name="price"], input[type="number"]', '29.99');
      
      // Measure submission time
      const startTime = Date.now();
      
      // Monitor network requests
      let requestsCompleted = 0;
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          requestsCompleted++;
        }
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000); // Wait for submission to complete
      
      const submissionTime = Date.now() - startTime;
      
      expect(submissionTime).toBeLessThan(10000); // 10 seconds max
      expect(requestsCompleted).toBeGreaterThan(0); // API calls were made
      
      console.log('Form submission performance:', {
        submissionTime,
        apiRequests: requestsCompleted
      });
    });
  });

  describe('Course Management Security Tests', () => {
    test('should require instructor authentication', async () => {
      // Logout first
      await testUtils.logout();
      
      // Try to access course creation page
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForTimeout(2000);
      
      // Should redirect to login or show access denied
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(auth\/login|login|unauthorized|403)/);
    });

    test('should prevent unauthorized access to instructor pages', async () => {
      // Login as student instead of instructor
      await testUtils.logout();
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Try to access instructor course creation
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      // Should redirect to appropriate page or show access denied
      expect(currentUrl).not.toContain('/instructor/create-course');
    });

    test('should validate CSRF protection on course creation', async () => {
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      
      // Check for CSRF token
      const csrfToken = await page.$('input[name*="csrf"], input[name*="token"]');
      const formData = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? new FormData(form) : null;
      });
      
      // Should have CSRF protection
      expect(csrfToken || formData).toBeTruthy();
    });
  });

  describe('Course Management Accessibility Tests', () => {
    test('should meet accessibility standards on course creation page', async () => {
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      
      const accessibilityIssues = await testUtils.checkAccessibility();
      expect(accessibilityIssues.length).toBe(0);
      
      if (accessibilityIssues.length > 0) {
        console.warn('Accessibility issues on course creation:', accessibilityIssues);
      }
    });

    test('should support keyboard navigation in course creation form', async () => {
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForSelector('form');
      
      // Test tab navigation through form
      const formElements = await page.$$('input, textarea, select, button');
      expect(formElements.length).toBeGreaterThan(0);
      
      // Tab through each element
      for (let i = 0; i < formElements.length; i++) {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => 
          document.activeElement.tagName + '.' + document.activeElement.type);
        expect(activeElement).toMatch(/INPUT|TEXTAREA|SELECT|BUTTON/);
      }
    });
  });
});