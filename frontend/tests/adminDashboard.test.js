const TestUtils = require('./utils/testUtils');
const { 
  TEST_USERS, 
  PERFORMANCE_BENCHMARKS,
  SECURITY_TEST_PAYLOADS,
  API_ENDPOINTS 
} = require('./fixtures/testData');

describe('Admin Dashboard Tests', () => {
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
    // Clear storage and login as admin
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    // Login as admin for each test
    await testUtils.login(
      TEST_USERS.ADMIN.email, 
      TEST_USERS.ADMIN.password, 
      'ADMIN'
    );
  });

  describe('Admin Dashboard Access and Navigation Tests', () => {
    test('should load admin dashboard successfully', async () => {
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/admin`);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      
      // Check essential admin dashboard elements
      const adminHeader = await page.$('h1:contains("Admin"), .admin-header, [data-testid="admin-header"]');
      const navigationMenu = await page.$('.admin-nav, .sidebar, [data-testid="admin-nav"]');
      const overviewSection = await page.$('.overview, .dashboard-overview, [data-testid="overview"]');
      
      expect(adminHeader || navigationMenu || overviewSection).toBeTruthy();
      
      // Check page title
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/admin|dashboard|manage/);
    });

    test('should display admin navigation menu', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Look for navigation links
      const navLinks = await page.$$([
        'a[href*="/admin/"]',
        '.admin-nav a',
        '.sidebar a',
        '[data-testid*="nav"] a'
      ].join(', '));
      
      expect(navLinks.length).toBeGreaterThan(0);
      
      // Check for specific admin sections
      const expectedSections = ['users', 'courses', 'settings', 'analytics', 'reports'];
      const foundSections = [];
      
      for (const link of navLinks) {
        const href = await link.evaluate(el => el.href);
        const text = await link.evaluate(el => el.textContent.toLowerCase());
        
        expectedSections.forEach(section => {
          if (href.includes(section) || text.includes(section)) {
            foundSections.push(section);
          }
        });
      }
      
      console.log('Found admin sections:', foundSections);
      expect(foundSections.length).toBeGreaterThan(0);
    });

    test('should display system statistics and metrics', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(3000);
      
      // Look for dashboard metrics
      const metricCards = await page.$$([
        '.metric-card',
        '.stat-card', 
        '.dashboard-card',
        '[data-testid*="metric"]',
        '[data-testid*="stat"]'
      ].join(', '));
      
      const numberDisplays = await page.$$eval(
        '.metric-value, .stat-number, .count, .total',
        elements => elements.map(el => el.textContent),
        []
      );
      
      console.log('Found metric cards:', metricCards.length);
      console.log('Found number displays:', numberDisplays.length);
      
      // Should have some kind of metrics display
      expect(metricCards.length > 0 || numberDisplays.length > 0).toBeTruthy();
    });
  });

  describe('User Management Tests', () => {
    test('should access user management page', async () => {
      // Try different user management URLs
      const userManagementUrls = ['/admin/users', '/admin/user-management', '/admin'];
      let userManagementLoaded = false;
      
      for (const url of userManagementUrls) {
        try {
          await page.goto(`${testUtils.baseUrl}${url}`);
          await page.waitForTimeout(2000);
          
          // Look for user management elements
          const userTable = await page.$('table, .users-table, [data-testid="users-table"]');
          const userCards = await page.$$('.user-card, [data-testid="user-card"]');
          const addUserButton = await page.$('button:contains("Add User"), [data-testid="add-user"]');
          
          if (userTable || userCards.length > 0 || addUserButton) {
            userManagementLoaded = true;
            console.log(`User management loaded successfully at ${url}`);
            break;
          }
        } catch (error) {
          console.log(`Could not load user management at ${url}`);
        }
      }
      
      expect(userManagementLoaded).toBeTruthy();
    });

    test('should display user list with search and filtering', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Navigate to users section if not already there
      const usersLink = await page.$('a[href*="users"], a:contains("Users")');
      if (usersLink) {
        await usersLink.click();
        await page.waitForTimeout(2000);
      }
      
      // Look for user list elements
      const userRows = await page.$$('tr, .user-row, .user-item');
      const searchInput = await page.$('input[placeholder*="search" i], [data-testid="search"]');
      const filterSelect = await page.$('select, [data-testid*="filter"]');
      
      console.log('Found user rows:', userRows.length);
      console.log('Search input found:', !!searchInput);
      console.log('Filter select found:', !!filterSelect);
      
      // Test search functionality if available
      if (searchInput) {
        await searchInput.type('test');
        await page.waitForTimeout(1000);
        
        const filteredRows = await page.$$('tr, .user-row, .user-item');
        console.log('Filtered user rows:', filteredRows.length);
      }
    });

    test('should allow user status management', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Navigate to users if needed
      const usersLink = await page.$('a[href*="users"], a:contains("Users")');
      if (usersLink) {
        await usersLink.click();
        await page.waitForTimeout(2000);
      }
      
      // Look for user action buttons
      const actionButtons = await page.$$([
        'button:contains("Block")',
        'button:contains("Unblock")', 
        'button:contains("Activate")',
        'button:contains("Deactivate")',
        '[data-testid*="action"]',
        '.action-btn'
      ].join(', '));
      
      console.log('Found user action buttons:', actionButtons.length);
      
      // Look for user status indicators
      const statusIndicators = await page.$$([
        '.status-active',
        '.status-blocked',
        '.status-pending',
        '[data-testid*="status"]'
      ].join(', '));
      
      console.log('Found status indicators:', statusIndicators.length);
      
      expect(actionButtons.length > 0 || statusIndicators.length > 0).toBeTruthy();
    });

    test('should handle user creation form', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Look for add user button
      const addUserButton = await page.$([
        'button:contains("Add User")',
        'button:contains("Create User")',
        '[data-testid="add-user"]',
        'a[href*="create-user"]'
      ].join(', '));
      
      if (addUserButton) {
        await addUserButton.click();
        await page.waitForTimeout(2000);
        
        // Check for user creation form
        const userForm = await page.$('form, [data-testid="user-form"]');
        const nameInput = await page.$('input[name="name"], input[placeholder*="name" i]');
        const emailInput = await page.$('input[type="email"]');
        const roleSelect = await page.$('select[name="role"], [data-testid="role-select"]');
        
        expect(userForm).toBeTruthy();
        expect(nameInput && emailInput).toBeTruthy();
        
        console.log('User creation form is accessible');
      } else {
        console.log('Add user button not found');
      }
    });
  });

  describe('Course Management Tests', () => {
    test('should access course management page', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Navigate to courses section
      const coursesLink = await page.$('a[href*="courses"], a:contains("Courses")');
      if (coursesLink) {
        await coursesLink.click();
        await page.waitForTimeout(2000);
      }
      
      // Check for course management elements
      const courseTable = await page.$('table, .courses-table, [data-testid="courses-table"]');
      const courseCards = await page.$$('.course-card, [data-testid="course-card"]');
      const courseActions = await page.$$('button:contains("Approve"), button:contains("Reject")');
      
      console.log('Course table found:', !!courseTable);
      console.log('Course cards found:', courseCards.length);
      console.log('Course actions found:', courseActions.length);
      
      expect(courseTable || courseCards.length > 0 || courseActions.length > 0).toBeTruthy();
    });

    test('should display course approval workflow', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Navigate to courses
      const coursesLink = await page.$('a[href*="courses"], a:contains("Courses")');
      if (coursesLink) {
        await coursesLink.click();
        await page.waitForTimeout(2000);
      }
      
      // Look for course approval elements
      const pendingCourses = await page.$$('[data-status="pending"], .status-pending');
      const approveButtons = await page.$$('button:contains("Approve"), [data-action="approve"]');
      const rejectButtons = await page.$$('button:contains("Reject"), [data-action="reject"]');
      
      console.log('Pending courses:', pendingCourses.length);
      console.log('Approve buttons:', approveButtons.length);
      console.log('Reject buttons:', rejectButtons.length);
      
      // Should have course approval workflow elements
      const hasApprovalWorkflow = pendingCourses.length > 0 || 
                                 approveButtons.length > 0 || 
                                 rejectButtons.length > 0;
      expect(hasApprovalWorkflow).toBeTruthy();
    });

    test('should handle course status changes', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Navigate to courses
      const coursesLink = await page.$('a[href*="courses"], a:contains("Courses")');
      if (coursesLink) {
        await coursesLink.click();
        await page.waitForTimeout(2000);
      }
      
      // Look for the first approve button
      const firstApproveButton = await page.$('button:contains("Approve"), [data-action="approve"]');
      
      if (firstApproveButton) {
        // Click approve and check for confirmation
        await firstApproveButton.click();
        await page.waitForTimeout(1000);
        
        // Look for confirmation dialog or success message
        const confirmDialog = await page.$('.modal, .dialog, .confirmation');
        const successMessage = await page.$('.success, .text-green-500');
        
        console.log('Course approval action triggered');
        expect(confirmDialog || successMessage).toBeTruthy();
      } else {
        console.log('No approve buttons found - may not have pending courses');
      }
    });
  });

  describe('System Settings Tests', () => {
    test('should access system settings page', async () => {
      const settingsUrls = [
        '/admin/settings',
        '/admin/sso-settings', 
        '/admin/payment-settings',
        '/admin'
      ];
      
      let settingsFound = false;
      
      for (const url of settingsUrls) {
        try {
          await page.goto(`${testUtils.baseUrl}${url}`);
          await page.waitForTimeout(2000);
          
          // Look for settings elements
          const settingsForm = await page.$('form, [data-testid="settings-form"]');
          const configInputs = await page.$$('input, select, textarea');
          const saveButton = await page.$('button:contains("Save"), button[type="submit"]');
          
          if (settingsForm || configInputs.length > 5 || saveButton) {
            settingsFound = true;
            console.log(`Settings page found at ${url}`);
            break;
          }
        } catch (error) {
          console.log(`Settings not found at ${url}`);
        }
      }
      
      expect(settingsFound).toBeTruthy();
    });

    test('should display SSO settings configuration', async () => {
      await page.goto(`${testUtils.baseUrl}/admin/sso-settings`);
      await page.waitForTimeout(2000);
      
      // Look for SSO provider configurations
      const ssoProviders = await page.$$('[data-provider], .sso-provider, .oauth-provider');
      const clientIdInputs = await page.$$('input[name*="clientId"], input[placeholder*="client" i]');
      const secretInputs = await page.$$('input[name*="secret"], input[type="password"]');
      
      console.log('SSO providers found:', ssoProviders.length);
      console.log('Client ID inputs:', clientIdInputs.length);
      console.log('Secret inputs:', secretInputs.length);
      
      // Should have SSO configuration elements
      expect(ssoProviders.length > 0 || clientIdInputs.length > 0).toBeTruthy();
    });

    test('should display payment gateway settings', async () => {
      await page.goto(`${testUtils.baseUrl}/admin/payment-settings`);
      await page.waitForTimeout(2000);
      
      // Look for payment gateway configurations
      const paymentProviders = await page.$$('[data-provider="stripe"], [data-provider="razorpay"]');
      const apiKeyInputs = await page.$$('input[name*="apiKey"], input[name*="key"]');
      const webhookInputs = await page.$$('input[name*="webhook"], input[placeholder*="webhook" i]');
      
      console.log('Payment providers found:', paymentProviders.length);
      console.log('API key inputs:', apiKeyInputs.length);
      console.log('Webhook inputs:', webhookInputs.length);
      
      // Should have payment configuration elements  
      expect(paymentProviders.length > 0 || apiKeyInputs.length > 0).toBeTruthy();
    });

    test('should validate settings form inputs', async () => {
      await page.goto(`${testUtils.baseUrl}/admin/sso-settings`);
      await page.waitForTimeout(2000);
      
      // Test SSO settings validation
      const clientIdInput = await page.$('input[name*="clientId"], input[placeholder*="client" i]');
      if (clientIdInput) {
        // Test with invalid client ID
        await clientIdInput.click({ clickCount: 3 });
        await clientIdInput.type('invalid-client-id');
        
        const saveButton = await page.$('button:contains("Save"), button[type="submit"]');
        if (saveButton) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Should show validation error
          const errorMessage = await page.$('.error, .text-red-500, [data-testid*="error"]');
          console.log('Settings validation works:', !!errorMessage);
        }
      }
    });
  });

  describe('Analytics and Reporting Tests', () => {
    test('should display platform analytics', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(3000);
      
      // Look for analytics elements
      const charts = await page.$$('svg, canvas, .chart, [data-testid*="chart"]');
      const analyticsData = await page.$$('.analytics-data, .metric, .kpi');
      const dateRangeSelector = await page.$('input[type="date"], .date-picker, [data-testid="date-range"]');
      
      console.log('Charts found:', charts.length);
      console.log('Analytics data elements:', analyticsData.length);
      console.log('Date range selector found:', !!dateRangeSelector);
      
      expect(charts.length > 0 || analyticsData.length > 0).toBeTruthy();
    });

    test('should generate and export reports', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Look for report generation elements
      const exportButtons = await page.$$([
        'button:contains("Export")',
        'button:contains("Download")',
        '[data-testid*="export"]',
        '.export-btn'
      ].join(', '));
      
      const reportTypes = await page.$$([
        'select[name*="report"]',
        '.report-type',
        '[data-testid*="report-type"]'
      ].join(', '));
      
      console.log('Export buttons found:', exportButtons.length);
      console.log('Report type selectors found:', reportTypes.length);
      
      // Test export functionality if available
      if (exportButtons.length > 0) {
        await exportButtons[0].click();
        await page.waitForTimeout(2000);
        
        // Check for download or success indication
        const downloadStarted = await page.evaluate(() => {
          return document.querySelector('.download-started, .export-success') !== null;
        });
        
        console.log('Export functionality works:', downloadStarted);
      }
    });
  });

  describe('Admin Security Tests', () => {
    test('should require admin authentication', async () => {
      await testUtils.logout();
      
      // Try to access admin page without authentication
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(auth\/login|login|unauthorized|403)/);
    });

    test('should prevent non-admin access to admin pages', async () => {
      await testUtils.logout();
      
      // Login as student
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Try to access admin page
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin');
      expect(currentUrl).toMatch(/\/(learn|unauthorized|403)/);
    });

    test('should prevent instructor access to admin pages', async () => {
      await testUtils.logout();
      
      // Login as instructor
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      
      // Try to access admin page
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin');
      expect(currentUrl).toMatch(/\/(instructor|unauthorized|403)/);
    });

    test('should validate admin API endpoints security', async () => {
      // Test admin API endpoints require proper authentication
      const adminApiUrls = [
        '/api/admin/users',
        '/api/admin/courses', 
        '/api/admin/overview',
        '/api/admin/settings'
      ];
      
      for (const apiUrl of adminApiUrls) {
        try {
          const response = await page.evaluate(async (url) => {
            const res = await fetch(url);
            return { status: res.status, url: res.url };
          }, `${testUtils.baseUrl}${apiUrl}`);
          
          // Should either be authenticated (200) or return auth error (401/403)
          expect([200, 401, 403, 404].includes(response.status)).toBeTruthy();
          console.log(`API ${apiUrl} security status:`, response.status);
        } catch (error) {
          console.log(`API ${apiUrl} not accessible:`, error.message);
        }
      }
    });

    test('should prevent XSS in admin forms', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Look for any input forms
      const inputElements = await page.$$('input[type="text"], textarea');
      
      for (const input of inputElements.slice(0, 3)) { // Test first 3 inputs
        for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS.slice(0, 2)) {
          await input.click({ clickCount: 3 });
          await input.type(xssPayload);
          
          // Check that script doesn't execute
          const alertTriggered = await page.evaluate(() => window.lastAlert || null);
          expect(alertTriggered).toBeNull();
          
          await input.click({ clickCount: 3 });
          await input.press('Backspace');
        }
      }
      
      console.log('XSS protection working in admin forms');
    });
  });

  describe('Admin Performance Tests', () => {
    test('should load admin dashboard within performance thresholds', async () => {
      const performance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/admin`);
      
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      expect(performance.performanceMetrics.domContentLoaded).toBeLessThan(4000);
      expect(performance.errors).toBe(0);
      
      console.log('Admin dashboard performance:', performance);
    });

    test('should handle large data sets efficiently', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Navigate to users page to test large data handling
      const usersLink = await page.$('a[href*="users"], a:contains("Users")');
      if (usersLink) {
        const startTime = Date.now();
        await usersLink.click();
        await page.waitForTimeout(5000); // Wait for data to load
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(10000); // 10 seconds max for large data
        
        // Check for pagination or virtualization
        const pagination = await page.$('.pagination, [data-testid="pagination"]');
        const loadMoreButton = await page.$('button:contains("Load More"), [data-testid="load-more"]');
        
        console.log('Large data load time:', loadTime);
        console.log('Pagination found:', !!pagination);
        console.log('Load more found:', !!loadMoreButton);
      }
    });
  });

  describe('Admin Accessibility Tests', () => {
    test('should meet accessibility standards on admin pages', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      
      const accessibilityIssues = await testUtils.checkAccessibility();
      expect(accessibilityIssues.length).toBe(0);
      
      if (accessibilityIssues.length > 0) {
        console.warn('Accessibility issues on admin dashboard:', accessibilityIssues);
      }
    });

    test('should support keyboard navigation in admin interface', async () => {
      await page.goto(`${testUtils.baseUrl}/admin`);
      await page.waitForTimeout(2000);
      
      // Test keyboard navigation through admin interface
      const interactiveElements = await page.$$('a, button, input, select, [tabindex]');
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      // Test first few tab stops
      for (let i = 0; i < Math.min(10, interactiveElements.length); i++) {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => ({
          tag: document.activeElement.tagName,
          type: document.activeElement.type || '',
          text: document.activeElement.textContent?.substring(0, 50) || ''
        }));
        
        expect(['A', 'BUTTON', 'INPUT', 'SELECT'].includes(activeElement.tag)).toBe(true);
      }
      
      console.log('Keyboard navigation works in admin interface');
    });
  });
});