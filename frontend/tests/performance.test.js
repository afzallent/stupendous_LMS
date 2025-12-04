const TestUtils = require('./utils/testUtils');
const { 
  TEST_USERS, 
  PERFORMANCE_BENCHMARKS
} = require('./fixtures/testData');

describe('Performance and Load Time Tests', () => {
  let testUtils;
  let page;

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    testUtils = new TestUtils(page);
    
    // Enable performance monitoring
    await page.setCacheEnabled(false); // Disable cache for consistent testing
    
    // Monitor network activity
    await page.setRequestInterception(true);
    page.on('request', request => {
      request.continue();
    });
  });

  afterAll(async () => {
    await page.close();
  });

  beforeEach(async () => {
    // Clear storage and reset network monitoring
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
  });

  describe('Page Load Performance Tests', () => {
    test('should load home page within performance thresholds', async () => {
      const performance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/`);
      
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      expect(performance.performanceMetrics.domContentLoaded).toBeLessThan(3000);
      expect(performance.performanceMetrics.loadComplete).toBeLessThan(5000);
      
      console.log('Home page performance:', {
        loadTime: performance.loadTime,
        domContentLoaded: performance.performanceMetrics.domContentLoaded,
        loadComplete: performance.performanceMetrics.loadComplete,
        responses: performance.responses,
        errors: performance.errors
      });
      
      // Should not have network errors
      expect(performance.errors).toBe(0);
      
      // Should have reasonable number of requests
      expect(performance.responses).toBeLessThan(PERFORMANCE_BENCHMARKS.NETWORK_THRESHOLDS.MAX_REQUESTS);
    });

    test('should load login page within performance thresholds', async () => {
      const performance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/auth/login`);
      
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      expect(performance.performanceMetrics.domContentLoaded).toBeLessThan(2500);
      
      console.log('Login page performance:', {
        loadTime: performance.loadTime,
        domContentLoaded: performance.performanceMetrics.domContentLoaded,
        firstPaint: performance.performanceMetrics.firstPaint,
        firstContentfulPaint: performance.performanceMetrics.firstContentfulPaint
      });
      
      // Login page should be fast as it's critical for user experience
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.EXCELLENT);
    });

    test('should load courses page within performance thresholds', async () => {
      const performance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/courses`);
      
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD);
      expect(performance.performanceMetrics.domContentLoaded).toBeLessThan(4000);
      
      console.log('Courses page performance:', performance);
      
      // Courses page may have more content, so slightly more lenient
      expect(performance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.ACCEPTABLE);
    });

    test('should measure performance under slow network conditions', async () => {
      // Simulate slow 3G network
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40 // 40ms latency
      });
      
      const startTime = Date.now();
      await page.goto(`${testUtils.baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 });
      const slowNetworkLoadTime = Date.now() - startTime;
      
      console.log('Slow network performance:', {
        loadTime: slowNetworkLoadTime,
        threshold: PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.POOR
      });
      
      // Should still be usable on slow networks
      expect(slowNetworkLoadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.POOR);
      
      // Reset network conditions
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });
    });
  });

  describe('Resource Loading and Optimization Tests', () => {
    test('should optimize JavaScript bundle sizes', async () => {
      const jsResources = [];
      
      page.on('response', response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('javascript') || url.includes('.js')) {
          const contentLength = response.headers()['content-length'];
          jsResources.push({
            url,
            size: contentLength ? parseInt(contentLength) : 0,
            type: 'javascript'
          });
        }
      });
      
      await page.goto(`${testUtils.baseUrl}/`, { waitUntil: 'networkidle0' });
      
      const totalJSSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
      const largeJSFiles = jsResources.filter(resource => 
        resource.size > PERFORMANCE_BENCHMARKS.NETWORK_THRESHOLDS.MAX_JS_SIZE);
      
      console.log('JavaScript resources:', {
        totalFiles: jsResources.length,
        totalSize: totalJSSize,
        averageSize: totalJSSize / jsResources.length || 0,
        largeFiles: largeJSFiles.length
      });
      
      // Total JS should be reasonable
      expect(totalJSSize).toBeLessThan(PERFORMANCE_BENCHMARKS.NETWORK_THRESHOLDS.MAX_JS_SIZE * 2);
      
      // Individual JS files shouldn't be too large
      expect(largeJSFiles.length).toBeLessThan(3);
    });

    test('should optimize CSS bundle sizes', async () => {
      const cssResources = [];
      
      page.on('response', response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('css') || url.includes('.css')) {
          const contentLength = response.headers()['content-length'];
          cssResources.push({
            url,
            size: contentLength ? parseInt(contentLength) : 0,
            type: 'css'
          });
        }
      });
      
      await page.goto(`${testUtils.baseUrl}/`, { waitUntil: 'networkidle0' });
      
      const totalCSSSize = cssResources.reduce((sum, resource) => sum + resource.size, 0);
      
      console.log('CSS resources:', {
        totalFiles: cssResources.length,
        totalSize: totalCSSSize,
        averageSize: totalCSSSize / cssResources.length || 0
      });
      
      // CSS should be optimized
      expect(totalCSSSize).toBeLessThan(PERFORMANCE_BENCHMARKS.NETWORK_THRESHOLDS.MAX_CSS_SIZE);
    });

    test('should optimize image loading', async () => {
      const imageResources = [];
      
      page.on('response', response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('image') || 
            url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          const contentLength = response.headers()['content-length'];
          imageResources.push({
            url,
            size: contentLength ? parseInt(contentLength) : 0,
            type: 'image',
            contentType
          });
        }
      });
      
      await page.goto(`${testUtils.baseUrl}/courses`, { waitUntil: 'networkidle0' });
      
      const totalImageSize = imageResources.reduce((sum, resource) => sum + resource.size, 0);
      const largeImages = imageResources.filter(resource => 
        resource.size > PERFORMANCE_BENCHMARKS.NETWORK_THRESHOLDS.MAX_IMAGE_SIZE);
      
      console.log('Image resources:', {
        totalFiles: imageResources.length,
        totalSize: totalImageSize,
        averageSize: totalImageSize / imageResources.length || 0,
        largeImages: largeImages.length,
        modernFormats: imageResources.filter(r => r.contentType?.includes('webp')).length
      });
      
      // Should use reasonable image sizes
      expect(largeImages.length).toBeLessThan(5);
      
      // Total image size should be reasonable
      if (imageResources.length > 0) {
        expect(totalImageSize / imageResources.length).toBeLessThan(500 * 1024); // 500KB average
      }
    });

    test('should implement effective caching strategies', async () => {
      let cachedResources = 0;
      let totalResources = 0;
      
      page.on('response', response => {
        totalResources++;
        const cacheControl = response.headers()['cache-control'];
        const expires = response.headers()['expires'];
        const etag = response.headers()['etag'];
        
        if (cacheControl || expires || etag) {
          cachedResources++;
        }
      });
      
      await page.goto(`${testUtils.baseUrl}/`, { waitUntil: 'networkidle0' });
      
      const cacheEffectiveness = (cachedResources / totalResources) * 100;
      
      console.log('Caching effectiveness:', {
        totalResources,
        cachedResources,
        percentage: cacheEffectiveness.toFixed(2) + '%'
      });
      
      // At least 70% of resources should have caching headers
      expect(cacheEffectiveness).toBeGreaterThan(70);
    });
  });

  describe('Runtime Performance Tests', () => {
    test('should handle form interactions with good performance', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForSelector('form');
      
      // Measure form interaction performance
      const startTime = Date.now();
      
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'password123');
      
      const typingTime = Date.now() - startTime;
      
      // Form interactions should be responsive
      expect(typingTime).toBeLessThan(1000); // 1 second for typing
      
      console.log('Form interaction performance:', { typingTime });
    });

    test('should handle navigation with good performance', async () => {
      await page.goto(`${testUtils.baseUrl}/`);
      
      // Navigate to different pages and measure performance
      const navigationTests = [
        { from: '/', to: '/courses' },
        { from: '/courses', to: '/auth/login' },
        { from: '/auth/login', to: '/' }
      ];
      
      const navigationResults = [];
      
      for (const nav of navigationTests) {
        await page.goto(`${testUtils.baseUrl}${nav.from}`);
        
        const startTime = Date.now();
        await page.goto(`${testUtils.baseUrl}${nav.to}`, { waitUntil: 'domcontentloaded' });
        const navigationTime = Date.now() - startTime;
        
        navigationResults.push({
          route: `${nav.from} -> ${nav.to}`,
          time: navigationTime
        });
        
        // Navigation should be fast
        expect(navigationTime).toBeLessThan(3000);
      }
      
      console.log('Navigation performance:', navigationResults);
    });

    test('should maintain performance with user interactions', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      await page.goto(`${testUtils.baseUrl}/courses`);
      
      // Measure search performance
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
      
      if (searchInput) {
        const searchStartTime = Date.now();
        await searchInput.type('JavaScript');
        await page.waitForTimeout(500); // Wait for debounce
        const searchTime = Date.now() - searchStartTime;
        
        expect(searchTime).toBeLessThan(2000);
        console.log('Search interaction performance:', { searchTime });
      }
      
      // Measure clicking performance
      const courseCards = await page.$$('[data-testid="course-card"], .course-card');
      
      if (courseCards.length > 0) {
        const clickStartTime = Date.now();
        await courseCards[0].click();
        await page.waitForTimeout(1000);
        const clickTime = Date.now() - clickStartTime;
        
        expect(clickTime).toBeLessThan(3000);
        console.log('Click interaction performance:', { clickTime });
      }
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    test('should monitor memory usage during page interactions', async () => {
      await page.goto(`${testUtils.baseUrl}/`);
      
      // Get initial memory usage
      const initialMetrics = await page.metrics();
      
      // Perform various interactions
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(2000);
      
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      await page.waitForTimeout(2000);
      
      // Get final memory usage
      const finalMetrics = await page.metrics();
      
      const memoryIncrease = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
      const memoryIncreasePercentage = (memoryIncrease / initialMetrics.JSHeapUsedSize) * 100;
      
      console.log('Memory usage:', {
        initial: Math.round(initialMetrics.JSHeapUsedSize / 1024 / 1024) + ' MB',
        final: Math.round(finalMetrics.JSHeapUsedSize / 1024 / 1024) + ' MB',
        increase: Math.round(memoryIncrease / 1024 / 1024) + ' MB',
        increasePercentage: memoryIncreasePercentage.toFixed(2) + '%'
      });
      
      // Memory increase should be reasonable (less than 50MB or 100% increase)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      expect(memoryIncreasePercentage).toBeLessThan(100); // 100%
    });

    test('should handle multiple page loads without memory leaks', async () => {
      const pageLoadCycle = async (url) => {
        await page.goto(url, { waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000);
      };
      
      // Get baseline memory
      await page.goto(`${testUtils.baseUrl}/`);
      const baselineMetrics = await page.metrics();
      
      // Perform multiple page loads
      const testUrls = [
        `${testUtils.baseUrl}/courses`,
        `${testUtils.baseUrl}/auth/login`,
        `${testUtils.baseUrl}/`,
        `${testUtils.baseUrl}/courses`,
        `${testUtils.baseUrl}/auth/signup`
      ];
      
      for (const url of testUrls) {
        await pageLoadCycle(url);
      }
      
      // Force garbage collection if possible
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      const finalMetrics = await page.metrics();
      const memoryIncrease = finalMetrics.JSHeapUsedSize - baselineMetrics.JSHeapUsedSize;
      const increasePercentage = (memoryIncrease / baselineMetrics.JSHeapUsedSize) * 100;
      
      console.log('Memory leak test:', {
        baseline: Math.round(baselineMetrics.JSHeapUsedSize / 1024 / 1024) + ' MB',
        final: Math.round(finalMetrics.JSHeapUsedSize / 1024 / 1024) + ' MB',
        increase: Math.round(memoryIncrease / 1024 / 1024) + ' MB',
        increasePercentage: increasePercentage.toFixed(2) + '%'
      });
      
      // Should not have significant memory leaks
      expect(increasePercentage).toBeLessThan(200); // 200% increase threshold
    });
  });

  describe('Mobile Performance Tests', () => {
    test('should perform well on mobile devices', async () => {
      // Emulate mobile device
      await page.emulate({
        name: 'iPhone 12',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          isLandscape: false
        }
      });
      
      // Simulate slower mobile network
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
        uploadThroughput: 1 * 1024 * 1024 / 8, // 1 Mbps
        latency: 20
      });
      
      const mobilePerformance = await testUtils.measurePagePerformance(`${testUtils.baseUrl}/`);
      
      console.log('Mobile performance:', {
        loadTime: mobilePerformance.loadTime,
        domContentLoaded: mobilePerformance.performanceMetrics.domContentLoaded,
        firstPaint: mobilePerformance.performanceMetrics.firstPaint
      });
      
      // Mobile performance should be acceptable
      expect(mobilePerformance.loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.ACCEPTABLE);
      expect(mobilePerformance.performanceMetrics.domContentLoaded).toBeLessThan(5000);
      
      // Reset to desktop
      await page.emulate({
        name: 'Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: true
        }
      });
      
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0
      });
    });

    test('should handle touch interactions efficiently', async () => {
      // Emulate mobile device with touch
      await page.emulate({
        name: 'iPhone 12',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          isLandscape: false
        }
      });
      
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(2000);
      
      // Test touch interactions
      const touchElements = await page.$$('button, a, [data-testid="course-card"]');
      
      if (touchElements.length > 0) {
        const touchStartTime = Date.now();
        await touchElements[0].tap();
        await page.waitForTimeout(500);
        const touchTime = Date.now() - touchStartTime;
        
        expect(touchTime).toBeLessThan(1000); // Touch response should be quick
        console.log('Touch interaction performance:', { touchTime });
      }
      
      // Reset to desktop
      await page.emulate({
        name: 'Desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: true
        }
      });
    });
  });

  describe('Performance Monitoring and Reporting', () => {
    test('should generate comprehensive performance report', async () => {
      const performanceReport = {
        timestamp: new Date().toISOString(),
        testResults: []
      };
      
      // Test multiple pages
      const testPages = [
        { name: 'Home', url: '/' },
        { name: 'Login', url: '/auth/login' },
        { name: 'Courses', url: '/courses' },
        { name: 'Signup', url: '/auth/signup' }
      ];
      
      for (const testPage of testPages) {
        const performance = await testUtils.measurePagePerformance(
          `${testUtils.baseUrl}${testPage.url}`
        );
        
        const result = {
          page: testPage.name,
          url: testPage.url,
          loadTime: performance.loadTime,
          domContentLoaded: performance.performanceMetrics.domContentLoaded,
          firstPaint: performance.performanceMetrics.firstPaint,
          firstContentfulPaint: performance.performanceMetrics.firstContentfulPaint,
          networkRequests: performance.responses,
          errors: performance.errors,
          grade: performance.loadTime < PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.EXCELLENT ? 'A' :
                 performance.loadTime < PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.GOOD ? 'B' :
                 performance.loadTime < PERFORMANCE_BENCHMARKS.PAGE_LOAD_TIMES.ACCEPTABLE ? 'C' : 'F'
        };
        
        performanceReport.testResults.push(result);
      }
      
      // Generate report
      const reportPath = await testUtils.generateTestReport(
        performanceReport.testResults, 
        'performance_report'
      );
      
      console.log('Performance report generated:', reportPath);
      console.log('Performance summary:', performanceReport.testResults);
      
      // All pages should meet acceptable performance
      const failedPages = performanceReport.testResults.filter(result => result.grade === 'F');
      expect(failedPages.length).toBe(0);
    });

    test('should monitor Core Web Vitals', async () => {
      await page.goto(`${testUtils.baseUrl}/`);
      
      // Monitor Core Web Vitals if supported
      const coreWebVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              vitals.fid = entry.processingStart - entry.startTime;
            });
          }).observe({ entryTypes: ['first-input'] });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            vitals.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Wait for measurements
          setTimeout(() => resolve(vitals), 3000);
        });
      });
      
      console.log('Core Web Vitals:', coreWebVitals);
      
      // Check Core Web Vitals thresholds
      if (coreWebVitals.lcp) {
        expect(coreWebVitals.lcp).toBeLessThan(2500); // Good LCP < 2.5s
      }
      
      if (coreWebVitals.fid) {
        expect(coreWebVitals.fid).toBeLessThan(100); // Good FID < 100ms
      }
      
      if (coreWebVitals.cls) {
        expect(coreWebVitals.cls).toBeLessThan(0.1); // Good CLS < 0.1
      }
    });
  });
});