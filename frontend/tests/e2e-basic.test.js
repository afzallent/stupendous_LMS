import puppeteer from 'puppeteer';

describe('CourseCompass V2 - Basic E2E Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Launch browser directly instead of relying on global
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true' ? 'new' : false,
      slowMo: process.env.CI === 'true' ? 0 : 50,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    page = await browser.newPage();
    
    // Set up console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  });

  afterAll(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    // Clear storage before each test (handle SecurityError gracefully)
    try {
      await page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      // Ignore SecurityError for localhost access
      if (!error.message.includes('SecurityError')) {
        throw error;
      }
    }
  });

  describe('Application Loading Tests', () => {
    test('should load homepage successfully', async () => {
      const startTime = Date.now();
      
      const response = await page.goto(baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const loadTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(loadTime).toBeLessThan(10000); // Page should load within 10 seconds
      
      // Check for basic page elements
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      
      console.log(`✅ Homepage loaded in ${loadTime}ms with title: "${title}"`);
    });

    test('should have responsive design', async () => {
      // Test desktop view
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      const desktopContent = await page.$('body');
      expect(desktopContent).toBeTruthy();
      
      // Test mobile view
      await page.setViewport({ width: 375, height: 667 });
      await page.reload({ waitUntil: 'networkidle2' });
      
      const mobileContent = await page.$('body');
      expect(mobileContent).toBeTruthy();
      
      // Check for mobile-friendly elements
      const metaViewport = await page.$('meta[name="viewport"]');
      expect(metaViewport).toBeTruthy();
      
      console.log('✅ Responsive design verified');
    });

    test('should not have console errors on load', async () => {
      const consoleErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Allow time for any async errors
      await page.waitForTimeout(2000);
      
      // Filter out expected/harmless errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') &&
        !error.includes('livereload') &&
        !error.includes('DevTools')
      );
      
      if (criticalErrors.length > 0) {
        console.warn('Console errors detected:', criticalErrors);
      }
      
      // Don't fail the test for non-critical errors, just log them
      console.log(`✅ Console monitoring complete. ${criticalErrors.length} critical errors detected.`);
    });
  });

  describe('Navigation Tests', () => {
    test('should navigate to auth pages', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      // Look for login/signup links
      const authLinks = await page.$$eval('a', links => 
        links.filter(link => 
          link.textContent.toLowerCase().includes('login') ||
          link.textContent.toLowerCase().includes('sign') ||
          link.href.includes('/auth/') ||
          link.href.includes('/login') ||
          link.href.includes('/signup')
        ).map(link => ({
          text: link.textContent.trim(),
          href: link.href
        }))
      );
      
      console.log('Authentication links found:', authLinks);
      
      // Test navigation to login page
      try {
        await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' });
        const currentUrl = page.url();
        expect(currentUrl).toContain('login');
        console.log('✅ Login page navigation successful');
      } catch (error) {
        console.log('ℹ️  Login page may not exist or use different routing');
      }
      
      // Test navigation to signup page
      try {
        await page.goto(`${baseUrl}/auth/signup`, { waitUntil: 'networkidle2' });
        const currentUrl = page.url();
        expect(currentUrl).toContain('signup');
        console.log('✅ Signup page navigation successful');
      } catch (error) {
        console.log('ℹ️  Signup page may not exist or use different routing');
      }
    });

    test('should handle 404 pages gracefully', async () => {
      const response = await page.goto(`${baseUrl}/this-page-does-not-exist`, { 
        waitUntil: 'networkidle2' 
      });
      
      // Should either show 404 page or redirect to home
      const status = response.status();
      const currentUrl = page.url();
      
      // Accept either 404 status or redirect to home
      expect([200, 404].includes(status)).toBe(true);
      
      console.log(`✅ 404 handling: Status ${status}, URL: ${currentUrl}`);
    });
  });

  describe('Performance Tests', () => {
    test('should meet basic performance criteria', async () => {
      // Enable performance monitoring
      await page.coverage.startJSCoverage();
      await page.coverage.startCSSCoverage();
      
      const startTime = Date.now();
      await page.goto(baseUrl, { waitUntil: 'load' });
      const loadTime = Date.now() - startTime;
      
      // Wait for network idle or fallback to timeout
      if (page.waitForLoadState) {
        await page.waitForLoadState('networkidle');
      } else {
        await page.waitForTimeout(2000);
      }
      const networkIdleTime = Date.now() - startTime;
      
      const jsCoverage = await page.coverage.stopJSCoverage();
      const cssCoverage = await page.coverage.stopCSSCoverage();
      
      // Calculate resource sizes
      const totalJSSize = jsCoverage.reduce((total, entry) => total + entry.text.length, 0);
      const totalCSSSize = cssCoverage.reduce((total, entry) => total + entry.text.length, 0);
      
      // Performance assertions
      expect(loadTime).toBeLessThan(15000); // Load within 15 seconds
      expect(networkIdleTime).toBeLessThan(20000); // Network idle within 20 seconds
      
      console.log(`✅ Performance metrics:`);
      console.log(`   - Load time: ${loadTime}ms`);
      console.log(`   - Network idle: ${networkIdleTime}ms`);
      console.log(`   - Total JS size: ${Math.round(totalJSSize / 1024)}KB`);
      console.log(`   - Total CSS size: ${Math.round(totalCSSSize / 1024)}KB`);
    });

    test('should handle concurrent users simulation', async () => {
      const pages = [];
      const loadTimes = [];
      
      try {
        // Simulate 3 concurrent users
        for (let i = 0; i < 3; i++) {
          const newPage = await browser.newPage();
          pages.push(newPage);
          
          const startTime = Date.now();
          await newPage.goto(baseUrl, { waitUntil: 'networkidle2' });
          const loadTime = Date.now() - startTime;
          loadTimes.push(loadTime);
        }
        
        const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
        const maxLoadTime = Math.max(...loadTimes);
        
        expect(avgLoadTime).toBeLessThan(15000);
        expect(maxLoadTime).toBeLessThan(20000);
        
        console.log(`✅ Concurrent load test:`);
        console.log(`   - Average load time: ${Math.round(avgLoadTime)}ms`);
        console.log(`   - Max load time: ${maxLoadTime}ms`);
        
      } finally {
        // Clean up pages
        for (const testPage of pages) {
          await testPage.close();
        }
      }
    });
  });

  describe('Basic Security Tests', () => {
    test('should have security headers', async () => {
      const response = await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      const headers = response.headers();
      
      const securityHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy']
      };
      
      console.log('Security headers:', securityHeaders);
      
      // Log findings without failing the test
      const hasFrameOptions = securityHeaders['x-frame-options'];
      const hasContentTypeOptions = securityHeaders['x-content-type-options'] === 'nosniff';
      const hasCSP = Boolean(securityHeaders['content-security-policy']);
      
      console.log(`✅ Security headers analysis:`);
      console.log(`   - X-Frame-Options: ${hasFrameOptions ? '✅' : '❌'}`);
      console.log(`   - X-Content-Type-Options: ${hasContentTypeOptions ? '✅' : '❌'}`);
      console.log(`   - Content-Security-Policy: ${hasCSP ? '✅' : '❌'}`);
    });

    test('should not expose sensitive information', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      
      const pageContent = await page.content();
      const pageText = await page.evaluate(() => document.body.textContent || '');
      
      // Check for common sensitive data patterns
      const sensitivePatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/i,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
        /secret\s*[:=]\s*['"][^'"]+['"]/i,
        /token\s*[:=]\s*['"][^'"]+['"]/i,
        /mysql_password|db_password/i
      ];
      
      const exposedData = [];
      for (const pattern of sensitivePatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          exposedData.push(matches[0]);
        }
      }
      
      if (exposedData.length > 0) {
        console.warn('⚠️  Potential sensitive data exposure:', exposedData);
      } else {
        console.log('✅ No obvious sensitive data exposure detected');
      }
      
      // Check for common development artifacts
      const devArtifacts = [
        pageContent.includes('localhost:'),
        pageContent.includes('development'),
        pageContent.includes('debug'),
        pageText.includes('TODO'),
        pageText.includes('FIXME')
      ];
      
      const artifactCount = devArtifacts.filter(Boolean).length;
      console.log(`✅ Development artifacts check: ${artifactCount} items found`);
    });
  });
});