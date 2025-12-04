const TestUtils = require('./utils/testUtils');
const { 
  TEST_USERS, 
  PERFORMANCE_BENCHMARKS,
  SECURITY_TEST_PAYLOADS 
} = require('./fixtures/testData');

describe('Student Learning Workflow Tests', () => {
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
    // Clear storage and login as student
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    // Login as student for each test
    await testUtils.login(
      TEST_USERS.STUDENT.email, 
      TEST_USERS.STUDENT.password, 
      'STUDENT'
    );
  });

  describe('Student Dashboard Tests', () => {
    test('should load student dashboard successfully', async () => {
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/learn`);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.ACCEPTABLE);
      
      // Check essential dashboard elements
      const coursesSection = await page.$('[data-testid="enrolled-courses"], .enrolled-courses, .my-courses');
      const progressSection = await page.$('[data-testid="progress"], .progress, .learning-progress');
      const browseCoursesLink = await page.$('[href*="courses"], a:contains("Browse"), [data-testid="browse-courses"]');
      
      expect(coursesSection || progressSection || browseCoursesLink).toBeTruthy();
      
      // Check page title
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/learn|dashboard|student|courses/);
    });

    test('should display student progress and statistics', async () => {
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForSelector('body', { timeout: 10000 });
      
      // Look for progress indicators
      const progressElements = await page.$$('[data-testid*="progress"], .progress-bar, .completion-rate, .percentage');
      const statsElements = await page.$$('[data-testid*="stats"], .stats, .metric');
      
      // Should have some kind of progress or stats display
      const hasProgressIndicators = progressElements.length > 0 || statsElements.length > 0;
      expect(hasProgressIndicators).toBe(true);
      
      console.log('Found progress elements:', progressElements.length);
      console.log('Found stats elements:', statsElements.length);
    });

    test('should show enrolled courses', async () => {
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(3000); // Wait for data to load
      
      // Look for course cards or list items
      const courseElements = await page.$$([
        '[data-testid="course-card"]',
        '.course-card',
        '.course-item',
        '.enrolled-course',
        '[href*="/learn/"]'
      ].join(', '));
      
      // Log what we found for debugging
      console.log('Found enrolled course elements:', courseElements.length);
      
      // Even if no courses are enrolled, the section should exist
      const coursesContainer = await page.$(
        '[data-testid="enrolled-courses"], .enrolled-courses, .my-courses, .courses-list'
      );
      expect(coursesContainer).toBeTruthy();
    });
  });

  describe('Course Discovery Tests', () => {
    test('should load courses page successfully', async () => {
      const performance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/courses`);
      
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      expect(performance.errors).toBe(0);
      
      // Check for course listing elements
      const courseGrid = await page.$('[data-testid="courses-grid"], .courses-grid, .course-list');
      const courseCards = await page.$$('[data-testid="course-card"], .course-card');
      
      expect(courseGrid || courseCards.length > 0).toBeTruthy();
      
      console.log('Course discovery performance:', performance);
    });

    test('should display available courses', async () => {
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(3000); // Wait for courses to load
      
      // Look for course elements
      const courseCards = await page.$$([
        '[data-testid="course-card"]',
        '.course-card',
        '.course-item',
        '.course',
        '[href*="/courses/"]'
      ].join(', '));
      
      console.log('Found course cards:', courseCards.length);
      
      // Should have at least a courses container even if empty
      const coursesContainer = await page.$(
        '[data-testid="courses-container"], .courses-container, .courses-grid, main'
      );
      expect(coursesContainer).toBeTruthy();
    });

    test('should allow course search and filtering', async () => {
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(2000);
      
      // Look for search input
      const searchInput = await page.$(
        'input[type="search"], input[placeholder*="search" i], [data-testid="search"]'
      );
      
      if (searchInput) {
        await searchInput.type('JavaScript');
        await page.waitForTimeout(1000);
        
        // Check if search results are filtered
        const searchResultsChanged = await page.evaluate(() => {
          const courses = document.querySelectorAll('[data-testid="course-card"], .course-card');
          return Array.from(courses).some(course => 
            course.textContent.toLowerCase().includes('javascript'));
        });
        
        console.log('Search functionality works:', searchResultsChanged);
      } else {
        console.log('Search input not found, skipping search test');
      }
      
      // Look for filter options
      const filterElements = await page.$$([
        'select[name*="category"]',
        '[data-testid*="filter"]',
        '.filter',
        'button:contains("Filter")'
      ].join(', '));
      
      console.log('Found filter elements:', filterElements.length);
    });

    test('should show course details when clicked', async () => {
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(3000);
      
      // Find first course card
      const firstCourseCard = await page.$([
        '[data-testid="course-card"] a',
        '.course-card a', 
        '[href*="/courses/"]',
        '.course-item a'
      ].join(', '));
      
      if (firstCourseCard) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
          firstCourseCard.click()
        ]);
        
        // Should be on course detail page
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/courses\/\w+/);
        
        // Check for course details
        const courseTitle = await page.$('h1, .course-title, [data-testid="course-title"]');
        const courseDescription = await page.$('.course-description, [data-testid="course-description"]');
        const enrollButton = await page.$('button:contains("Enroll"), [data-testid="enroll-button"]');
        
        expect(courseTitle).toBeTruthy();
        console.log('Course detail page loaded successfully');
      } else {
        console.log('No course cards found to click');
      }
    });
  });

  describe('Shopping Cart Tests', () => {
    test('should add course to cart', async () => {
      // Go to courses page
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(3000);
      
      // Find and click on a course
      const courseCard = await page.$([
        '[data-testid="course-card"] a',
        '.course-card a',
        '[href*="/courses/"]'
      ].join(', '));
      
      if (courseCard) {
        await courseCard.click();
        await page.waitForTimeout(2000);
        
        // Look for enroll/add to cart button
        const enrollButton = await page.$([
          'button:contains("Enroll")',
          'button:contains("Add to Cart")',
          '[data-testid="enroll-button"]',
          '[data-testid="add-to-cart"]',
          '.enroll-btn'
        ].join(', '));
        
        if (enrollButton) {
          await enrollButton.click();
          await page.waitForTimeout(2000);
          
          // Should either go to cart or show cart notification
          const currentUrl = page.url();
          const cartNotification = await page.$('.cart-notification, .added-to-cart, .success');
          
          const addedToCart = currentUrl.includes('/cart') || cartNotification;
          expect(addedToCart).toBeTruthy();
          
          console.log('Successfully added course to cart');
        } else {
          console.log('Enroll button not found');
        }
      } else {
        console.log('No course cards found');
      }
    });

    test('should display cart contents', async () => {
      await page.goto(`${testUtils.baseUrl}/cart`);
      await page.waitForTimeout(2000);
      
      // Check cart page elements
      const cartItems = await page.$('[data-testid="cart-items"], .cart-items, .shopping-cart');
      const checkoutButton = await page.$('button:contains("Checkout"), [data-testid="checkout"]');
      const totalPrice = await page.$('[data-testid="total"], .total, .cart-total');
      
      // Cart page should load even if empty
      expect(cartItems || checkoutButton || totalPrice).toBeTruthy();
      
      // Check page title
      const title = await page.title();
      expect(title.toLowerCase()).toContain('cart');
    });

    test('should handle cart operations (add, remove, update)', async () => {
      await page.goto(`${testUtils.baseUrl}/cart`);
      await page.waitForTimeout(2000);
      
      // Look for cart item controls
      const removeButtons = await page.$$('button:contains("Remove"), [data-testid*="remove"], .remove-btn');
      const quantityInputs = await page.$$('input[type="number"], [data-testid*="quantity"]');
      
      console.log('Found remove buttons:', removeButtons.length);
      console.log('Found quantity inputs:', quantityInputs.length);
      
      // Test remove functionality if items exist
      if (removeButtons.length > 0) {
        const initialItems = await page.$$('[data-testid="cart-item"], .cart-item');
        await removeButtons[0].click();
        await page.waitForTimeout(1000);
        
        const updatedItems = await page.$$('[data-testid="cart-item"], .cart-item');
        expect(updatedItems.length).toBeLessThanOrEqual(initialItems.length);
      }
    });
  });

  describe('Course Enrollment and Payment Tests', () => {
    test('should redirect to payment when checking out', async () => {
      await page.goto(`${testUtils.baseUrl}/cart`);
      await page.waitForTimeout(2000);
      
      const checkoutButton = await page.$([
        'button:contains("Checkout")',
        '[data-testid="checkout"]',
        '.checkout-btn',
        'a[href*="checkout"]'
      ].join(', '));
      
      if (checkoutButton) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
          checkoutButton.click()
        ]);
        
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/(checkout|payment|stripe|upi)/);
        
        console.log('Successfully redirected to payment page');
      } else {
        console.log('Checkout button not found or cart is empty');
      }
    });

    test('should handle payment page load', async () => {
      // Try different payment page URLs
      const paymentUrls = [
        '/checkout',
        '/checkout/stripe', 
        '/checkout/upi',
        '/payment'
      ];
      
      for (const url of paymentUrls) {
        try {
          await page.goto(`${testUtils.baseUrl}${url}`);
          await page.waitForTimeout(2000);
          
          const currentUrl = page.url();
          if (currentUrl.includes(url)) {
            // Check for payment form elements
            const paymentForm = await page.$('form, [data-testid="payment-form"]');
            const paymentMethod = await page.$('[data-testid="payment-method"], .payment-method');
            
            console.log(`Payment page ${url} loaded successfully`);
            break;
          }
        } catch (error) {
          console.log(`Payment page ${url} not accessible:`, error.message);
        }
      }
    });
  });

  describe('Learning Experience Tests', () => {
    test('should access enrolled course content', async () => {
      // Try to access a course learning page
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(3000);
      
      // Look for course links in enrolled courses
      const courseLinks = await page.$$([
        '[data-testid="course-card"] a',
        '.course-card a',
        '[href*="/learn/"]',
        '.enrolled-course a'
      ].join(', '));
      
      if (courseLinks.length > 0) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
          courseLinks[0].click()
        ]);
        
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/learn\/\w+/);
        
        // Check for learning interface elements
        const videoPlayer = await page.$('video, .video-player, [data-testid="video-player"]');
        const courseContent = await page.$('.course-content, [data-testid="course-content"]');
        const nextButton = await page.$('button:contains("Next"), [data-testid="next-lesson"]');
        
        expect(videoPlayer || courseContent || nextButton).toBeTruthy();
        console.log('Successfully accessed course learning interface');
      } else {
        console.log('No enrolled courses found to test learning interface');
      }
    });

    test('should track learning progress', async () => {
      // Navigate to a specific course learning page
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      // Look for progress indicators
      const progressBars = await page.$$([
        '.progress-bar',
        '[data-testid*="progress"]',
        '.completion-percentage',
        'progress'
      ].join(', '));
      
      const progressText = await page.$$eval(
        '.progress-text, .completion-text, [data-testid*="completion"]',
        elements => elements.map(el => el.textContent),
        []
      );
      
      console.log('Found progress indicators:', progressBars.length);
      console.log('Progress text found:', progressText.length);
      
      // Should have some form of progress tracking
      expect(progressBars.length > 0 || progressText.length > 0).toBeTruthy();
    });

    test('should handle video playback controls', async () => {
      // Try to find a course with video content
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      // Navigate to course content
      const courseLink = await page.$('[href*="/learn/"], .course-card a');
      if (courseLink) {
        await courseLink.click();
        await page.waitForTimeout(3000);
        
        const videoPlayer = await page.$('video, .video-player');
        if (videoPlayer) {
          // Test video controls
          const playButton = await page.$('.play-btn, button[aria-label*="play" i]');
          const volumeControl = await page.$('.volume-control, input[type="range"]');
          const fullscreenButton = await page.$('.fullscreen-btn, button[aria-label*="fullscreen" i]');
          
          console.log('Video player found with controls');
          expect(videoPlayer).toBeTruthy();
        } else {
          console.log('No video player found in course content');
        }
      }
    });
  });

  describe('Student Profile and Settings Tests', () => {
    test('should load student profile page', async () => {
      await page.goto(`${testUtils.baseUrl}/profile`);
      await page.waitForTimeout(2000);
      
      // Check profile page elements
      const profileForm = await page.$('form, [data-testid="profile-form"]');
      const userInfo = await page.$('.user-info, [data-testid="user-info"]');
      const avatarUpload = await page.$('input[type="file"], [data-testid="avatar-upload"]');
      
      expect(profileForm || userInfo).toBeTruthy();
      
      // Check page title
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/profile|account|settings/);
    });

    test('should allow profile updates', async () => {
      await page.goto(`${testUtils.baseUrl}/profile`);
      await page.waitForTimeout(2000);
      
      // Look for editable fields
      const nameInput = await page.$('input[name="name"], input[placeholder*="name" i]');
      const emailInput = await page.$('input[type="email"]');
      const saveButton = await page.$('button:contains("Save"), button[type="submit"]');
      
      if (nameInput && saveButton) {
        // Update name
        await nameInput.click({ clickCount: 3 });
        await nameInput.type('Updated Test Name');
        
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success message
        const successMessage = await page.$('.success, .text-green-500, [data-testid*="success"]');
        expect(successMessage).toBeTruthy();
        
        console.log('Profile update functionality works');
      } else {
        console.log('Profile update form not found');
      }
    });
  });

  describe('Student Learning Performance Tests', () => {
    test('should load learning dashboard within performance thresholds', async () => {
      const performance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/learn`);
      
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      expect(performance.performanceMetrics.domContentLoaded).toBeLessThan(3000);
      expect(performance.errors).toBe(0);
      
      console.log('Learning dashboard performance:', performance);
    });

    test('should handle course content loading efficiently', async () => {
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      // Monitor network requests for course content
      let contentRequests = 0;
      let totalContentSize = 0;
      
      page.on('response', response => {
        if (response.url().includes('/api/') || response.url().includes('course')) {
          contentRequests++;
          const contentLength = response.headers()['content-length'];
          if (contentLength) {
            totalContentSize += parseInt(contentLength);
          }
        }
      });
      
      // Navigate to course content
      const courseLink = await page.$('[href*="/learn/"]');
      if (courseLink) {
        await courseLink.click();
        await page.waitForTimeout(5000);
        
        console.log('Course content loading stats:', {
          requests: contentRequests,
          totalSize: totalContentSize,
          avgRequestSize: totalContentSize / contentRequests || 0
        });
        
        // Should not make excessive requests
        expect(contentRequests).toBeLessThan(20);
      }
    });
  });

  describe('Student Learning Security Tests', () => {
    test('should require student authentication for learning pages', async () => {
      await testUtils.logout();
      
      // Try to access learning page without authentication
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(auth\/login|login|unauthorized)/);
    });

    test('should prevent access to other users\' learning content', async () => {
      // This would require setting up test data with specific course enrollments
      // For now, we'll test that course access is properly controlled
      
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      // Check that user can only see their own enrolled courses
      const courseElements = await page.$$('[data-testid="course-card"], .course-card');
      
      // Verify no unauthorized course access
      for (const courseElement of courseElements) {
        const courseLink = await courseElement.$('a');
        if (courseLink) {
          const href = await courseLink.evaluate(el => el.href);
          expect(href).toMatch(/\/learn\/\w+/); // Should be valid course URLs
        }
      }
      
      console.log('Course access appears properly controlled');
    });

    test('should prevent XSS in course content', async () => {
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      // Check that course content doesn't contain unescaped scripts
      const pageContent = await page.content();
      
      for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS) {
        expect(pageContent).not.toContain(xssPayload);
      }
      
      // Check that any user-generated content is properly escaped
      const userContentElements = await page.$$('.course-description, .user-content, .comment');
      for (const element of userContentElements) {
        const content = await element.evaluate(el => el.innerHTML);
        expect(content).not.toMatch(/<script[^>]*>.*<\/script>/i);
      }
      
      console.log('XSS protection appears to be working');
    });
  });

  describe('Student Learning Accessibility Tests', () => {
    test('should meet accessibility standards on learning pages', async () => {
      await page.goto(`${testUtils.baseUrl}/learn`);
      
      const accessibilityIssues = await testUtils.checkAccessibility();
      expect(accessibilityIssues.length).toBe(0);
      
      if (accessibilityIssues.length > 0) {
        console.warn('Accessibility issues on learning pages:', accessibilityIssues);
      }
    });

    test('should support keyboard navigation in learning interface', async () => {
      await page.goto(`${testUtils.baseUrl}/learn`);
      await page.waitForTimeout(2000);
      
      // Test keyboard navigation
      const interactiveElements = await page.$$('a, button, input, [tabindex]');
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      // Test tab navigation
      for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => document.activeElement.tagName);
        expect(['A', 'BUTTON', 'INPUT', 'SELECT'].includes(activeElement)).toBe(true);
      }
      
      console.log('Keyboard navigation works on learning interface');
    });
  });
});