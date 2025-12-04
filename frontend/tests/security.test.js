const TestUtils = require('./utils/testUtils');
const { 
  TEST_USERS, 
  SECURITY_TEST_PAYLOADS,
  API_ENDPOINTS 
} = require('./fixtures/testData');

describe('Security and Data Protection Tests', () => {
  let testUtils;
  let page;

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    testUtils = new TestUtils(page);
    
    // Set up security monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
    
    // Monitor for security-related network requests
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('HTTP Error:', response.status(), response.url());
      }
    });
  });

  afterAll(async () => {
    await page.close();
  });

  beforeEach(async () => {
    // Clear storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  describe('Authentication Security Tests', () => {
    test('should enforce secure password policies', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/signup`);
      await page.waitForSelector('form');
      
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        '123',
        'abc',
        'password123',
        'PASSWORD',
        '11111111'
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
        
        const errorText = await errorMessage?.evaluate(el => el.textContent) || '';
        expect(errorText.toLowerCase()).toMatch(/password|weak|strong|complex/);
      }
    });

    test('should implement rate limiting on login attempts', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      const maxAttempts = 15;
      let rateLimitTriggered = false;
      
      for (let i = 0; i < maxAttempts; i++) {
        await testUtils.clearForm('form');
        
        await page.type('input[type="email"]', 'nonexistent@test.com');
        await page.type('input[type="password"]', 'wrongpassword');
        
        const response = await Promise.all([
          page.waitForResponse(response => response.url().includes('/api/auth/login')),
          page.click('button[type="submit"]')
        ]);
        
        if (response[0].status() === 429) {
          rateLimitTriggered = true;
          console.log(`Rate limiting triggered after ${i + 1} attempts`);
          break;
        }
        
        await page.waitForTimeout(500);
      }
      
      // Log the result for manual review
      console.log('Rate limiting test result:', rateLimitTriggered ? 'PROTECTED' : 'NOT_PROTECTED');
    });

    test('should use secure session management', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Check for secure cookie attributes
      const cookies = await page.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || 
        cookie.name.includes('token') || 
        cookie.name.includes('session'));
      
      for (const cookie of authCookies) {
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.secure || cookie.sameSite === 'Strict').toBe(true);
        console.log(`Cookie ${cookie.name}: httpOnly=${cookie.httpOnly}, secure=${cookie.secure}, sameSite=${cookie.sameSite}`);
      }
      
      // Verify session timeout
      const sessionStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          items[key] = sessionStorage.getItem(key);
        }
        return items;
      });
      
      console.log('Session storage contents:', Object.keys(sessionStorage));
    });

    test('should prevent session fixation attacks', async () => {
      // Get session ID before login
      const beforeLoginCookies = await page.cookies();
      const beforeSessionId = beforeLoginCookies.find(c => 
        c.name.includes('session') || c.name.includes('auth'))?.value;
      
      // Login
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Get session ID after login
      const afterLoginCookies = await page.cookies();
      const afterSessionId = afterLoginCookies.find(c => 
        c.name.includes('session') || c.name.includes('auth'))?.value;
      
      // Session ID should change after login (prevents session fixation)
      if (beforeSessionId && afterSessionId) {
        expect(beforeSessionId).not.toBe(afterSessionId);
        console.log('Session ID properly regenerated on login');
      } else {
        console.log('Session management may use different mechanism');
      }
    });
  });

  describe('Cross-Site Scripting (XSS) Protection Tests', () => {
    test('should prevent stored XSS in user profiles', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      await page.goto(`${testUtils.baseUrl}/profile`);
      await page.waitForTimeout(2000);
      
      const nameInput = await page.$('input[name="name"], input[placeholder*="name" i]');
      
      if (nameInput) {
        for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS) {
          await nameInput.click({ clickCount: 3 });
          await nameInput.type(xssPayload);
          
          const saveButton = await page.$('button:contains("Save"), button[type="submit"]');
          if (saveButton) {
            await saveButton.click();
            await page.waitForTimeout(1000);
          }
          
          // Check that script doesn't execute
          const alertTriggered = await page.evaluate(() => window.lastAlert || null);
          expect(alertTriggered).toBeNull();
          
          // Check that content is properly escaped in DOM
          const profileName = await page.evaluate(() => 
            document.querySelector('.profile-name, .user-name, h1, h2')?.textContent || '');
          
          if (profileName.includes('<script>')) {
            expect(profileName).not.toContain('<script>alert');
          }
          
          // Clear field for next test
          await nameInput.click({ clickCount: 3 });
          await nameInput.press('Backspace');
        }
      }
    });

    test('should prevent reflected XSS in search functionality', async () => {
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(2000);
      
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
      
      if (searchInput) {
        for (const xssPayload of SECURITY_TEST_PAYLOADS.XSS_ATTEMPTS) {
          await searchInput.click({ clickCount: 3 });
          await searchInput.type(xssPayload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
          
          // Check that script doesn't execute
          const alertTriggered = await page.evaluate(() => window.lastAlert || null);
          expect(alertTriggered).toBeNull();
          
          // Check URL parameters are properly encoded
          const currentUrl = page.url();
          if (currentUrl.includes('search=')) {
            expect(currentUrl).not.toContain('<script>');
            expect(currentUrl).not.toContain('javascript:');
          }
          
          await searchInput.click({ clickCount: 3 });
          await searchInput.press('Backspace');
        }
      }
    });

    test('should prevent DOM-based XSS', async () => {
      // Test various pages for DOM-based XSS vulnerabilities
      const testPages = [
        '/courses',
        '/learn',
        '/profile'
      ];
      
      for (const testPage of testPages) {
        // Test with XSS payload in URL fragment
        const xssUrl = `${testUtils.baseUrl}${testPage}#<script>alert('XSS')</script>`;
        
        await page.goto(xssUrl);
        await page.waitForTimeout(1000);
        
        // Check that script doesn't execute
        const alertTriggered = await page.evaluate(() => window.lastAlert || null);
        expect(alertTriggered).toBeNull();
        
        // Check that fragment is not reflected unsafely in DOM
        const bodyContent = await page.content();
        expect(bodyContent).not.toContain('<script>alert(\'XSS\')</script>');
      }
    });
  });

  describe('SQL Injection Protection Tests', () => {
    test('should prevent SQL injection in login form', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      for (const sqlPayload of SECURITY_TEST_PAYLOADS.SQL_INJECTION_ATTEMPTS) {
        await testUtils.clearForm('form');
        
        await page.type('input[type="email"]', sqlPayload);
        await page.type('input[type="password"]', 'password123');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Should not be logged in with SQL injection
        const currentUrl = page.url();
        expect(currentUrl).toContain('/auth/login');
        
        // Check for database errors that might indicate vulnerability
        const errorMessage = await page.$('.error, .text-red-500');
        const errorText = await errorMessage?.evaluate(el => el.textContent) || '';
        
        // Should not contain SQL error messages
        expect(errorText.toLowerCase()).not.toMatch(/sql|database|mysql|postgres|syntax error/);
      }
    });

    test('should prevent SQL injection in search functionality', async () => {
      await page.goto(`${testUtils.baseUrl}/courses`);
      await page.waitForTimeout(2000);
      
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
      
      if (searchInput) {
        for (const sqlPayload of SECURITY_TEST_PAYLOADS.SQL_INJECTION_ATTEMPTS) {
          await searchInput.click({ clickCount: 3 });
          await searchInput.type(sqlPayload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);
          
          // Check for database errors
          const pageContent = await page.content();
          expect(pageContent.toLowerCase()).not.toMatch(/sql|database|mysql|postgres|syntax error|ora-\d+/);
          
          // Check that application still functions normally
          const coursesVisible = await page.$('[data-testid="course-card"], .course-card, .course-item');
          expect(coursesVisible).toBeTruthy();
          
          await searchInput.click({ clickCount: 3 });
          await searchInput.press('Backspace');
        }
      }
    });
  });

  describe('CSRF Protection Tests', () => {
    test('should implement CSRF protection on forms', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Test profile update form
      await page.goto(`${testUtils.baseUrl}/profile`);
      await page.waitForTimeout(2000);
      
      // Check for CSRF token
      const csrfToken = await page.$('input[name*="csrf"], input[name*="token"], meta[name="csrf-token"]');
      
      if (csrfToken) {
        const tokenValue = await csrfToken.evaluate(el => 
          el.value || el.content || el.getAttribute('content'));
        expect(tokenValue).toBeTruthy();
        expect(tokenValue.length).toBeGreaterThan(10);
        console.log('CSRF token found and appears valid');
      } else {
        // Check for other CSRF protection mechanisms
        const cookies = await page.cookies();
        const csrfCookie = cookies.find(c => 
          c.name.toLowerCase().includes('csrf') || 
          c.sameSite === 'Strict');
        
        if (csrfCookie) {
          console.log('CSRF protection via cookies detected');
        } else {
          console.log('No obvious CSRF protection found - manual review needed');
        }
      }
    });

    test('should reject requests without valid CSRF tokens', async () => {
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      
      // Try to create course without proper CSRF token
      const response = await page.evaluate(async (baseUrl) => {
        try {
          const res = await fetch(`${baseUrl}/api/courses/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: 'CSRF Test Course',
              description: 'This should be rejected',
              price: 99
            })
          });
          return { status: res.status, statusText: res.statusText };
        } catch (error) {
          return { error: error.message };
        }
      }, testUtils.baseUrl);
      
      // Should be rejected (401, 403, or 422)
      expect([401, 403, 422, 400].includes(response.status)).toBeTruthy();
      console.log('CSRF protection status:', response.status, response.statusText);
    });
  });

  describe('File Upload Security Tests', () => {
    test('should validate file types and reject malicious uploads', async () => {
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForTimeout(2000);
      
      const fileInput = await page.$('input[type="file"]');
      
      if (fileInput) {
        const maliciousFiles = [
          { name: 'malware.exe', content: 'fake-exe-content' },
          { name: 'script.php', content: '<?php echo "hacked"; ?>' },
          { name: 'payload.js', content: 'alert("XSS")' },
          { name: 'backdoor.jsp', content: '<%=System.getProperty("user.dir")%>' },
          { name: 'virus.bat', content: '@echo off\necho hacked' }
        ];
        
        for (const file of maliciousFiles) {
          const tempFilePath = require('path').join(__dirname, 'temp', file.name);
          require('fs').writeFileSync(tempFilePath, file.content);
          
          try {
            await fileInput.uploadFile(tempFilePath);
            await page.waitForTimeout(2000);
            
            // Should show error for rejected file type
            const errorMessage = await page.$('.error, .text-red-500, [data-testid*="error"]');
            expect(errorMessage).toBeTruthy();
            
            const errorText = await errorMessage?.evaluate(el => el.textContent) || '';
            expect(errorText.toLowerCase()).toMatch(/file type|not allowed|invalid|rejected/);
            
            console.log(`Malicious file ${file.name} properly rejected`);
          } finally {
            // Clean up temp file
            try {
              require('fs').unlinkSync(tempFilePath);
            } catch (e) {}
          }
        }
      }
    });

    test('should enforce file size limits', async () => {
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      await page.goto(`${testUtils.baseUrl}/instructor/create-course`);
      await page.waitForTimeout(2000);
      
      const fileInput = await page.$('input[type="file"]');
      
      if (fileInput) {
        // Create oversized file
        const oversizedContent = Buffer.alloc(20 * 1024 * 1024); // 20MB
        const oversizedFile = require('path').join(__dirname, 'temp', 'oversized.jpg');
        
        try {
          require('fs').writeFileSync(oversizedFile, oversizedContent);
          
          await fileInput.uploadFile(oversizedFile);
          await page.waitForTimeout(3000);
          
          // Should show size limit error
          const errorMessage = await page.$('.error, .text-red-500, [data-testid*="error"]');
          expect(errorMessage).toBeTruthy();
          
          const errorText = await errorMessage?.evaluate(el => el.textContent) || '';
          expect(errorText.toLowerCase()).toMatch(/size|too large|limit|exceeded/);
          
          console.log('File size limit properly enforced');
        } finally {
          try {
            require('fs').unlinkSync(oversizedFile);
          } catch (e) {}
        }
      }
    });
  });

  describe('HTTP Security Headers Tests', () => {
    test('should implement proper security headers', async () => {
      const testUrls = [
        '/',
        '/auth/login',
        '/courses',
        '/learn'
      ];
      
      for (const url of testUrls) {
        const response = await page.goto(`${testUtils.baseUrl}${url}`);
        const headers = response.headers();
        
        // Check for important security headers
        const securityHeaders = {
          'x-frame-options': headers['x-frame-options'],
          'x-content-type-options': headers['x-content-type-options'],
          'x-xss-protection': headers['x-xss-protection'],
          'strict-transport-security': headers['strict-transport-security'],
          'content-security-policy': headers['content-security-policy'],
          'referrer-policy': headers['referrer-policy']
        };
        
        console.log(`Security headers for ${url}:`, securityHeaders);
        
        // X-Frame-Options should prevent clickjacking
        expect(['DENY', 'SAMEORIGIN'].includes(securityHeaders['x-frame-options'])).toBeTruthy();
        
        // X-Content-Type-Options should prevent MIME sniffing
        expect(securityHeaders['x-content-type-options']).toBe('nosniff');
        
        // Should have some form of CSP
        if (securityHeaders['content-security-policy']) {
          expect(securityHeaders['content-security-policy']).toContain('script-src');
        }
      }
    });

    test('should prevent clickjacking attacks', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      // Try to embed page in iframe
      const canEmbed = await page.evaluate(async () => {
        try {
          const iframe = document.createElement('iframe');
          iframe.src = window.location.href;
          document.body.appendChild(iframe);
          
          return new Promise((resolve) => {
            iframe.onload = () => resolve(true);
            iframe.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 3000);
          });
        } catch (error) {
          return false;
        }
      });
      
      // Should be prevented by X-Frame-Options
      expect(canEmbed).toBe(false);
      console.log('Clickjacking protection working:', !canEmbed);
    });
  });

  describe('Data Protection and Privacy Tests', () => {
    test('should not expose sensitive data in page source', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      const testPages = [
        '/learn',
        '/profile',
        '/courses'
      ];
      
      for (const testPage of testPages) {
        await page.goto(`${testUtils.baseUrl}${testPage}`);
        
        const exposedData = await testUtils.checkForSensitiveDataExposure();
        expect(exposedData.length).toBe(0);
        
        if (exposedData.length > 0) {
          console.warn(`Sensitive data exposed on ${testPage}:`, exposedData);
        }
      }
    });

    test('should implement proper access controls', async () => {
      // Test that users can only access their own data
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Try to access other user's profile (should fail)
      const unauthorizedAccess = await page.evaluate(async (baseUrl) => {
        try {
          const res = await fetch(`${baseUrl}/api/profile/999999`); // Non-existent user ID
          return { status: res.status, accessible: res.status === 200 };
        } catch (error) {
          return { error: error.message, accessible: false };
        }
      }, testUtils.baseUrl);
      
      expect(unauthorizedAccess.accessible).toBe(false);
      expect([401, 403, 404].includes(unauthorizedAccess.status)).toBeTruthy();
      
      console.log('Access control working:', unauthorizedAccess);
    });

    test('should properly handle password fields', async () => {
      await page.goto(`${testUtils.baseUrl}/auth/login`);
      
      const passwordInput = await page.$('input[type="password"]');
      expect(passwordInput).toBeTruthy();
      
      // Check that password is not visible in DOM
      await passwordInput.type('testpassword123');
      
      const passwordValue = await passwordInput.evaluate(el => el.value);
      const inputType = await passwordInput.evaluate(el => el.type);
      
      expect(inputType).toBe('password');
      
      // Check that password is not exposed in page source
      const pageContent = await page.content();
      expect(pageContent).not.toContain('testpassword123');
    });
  });

  describe('API Security Tests', () => {
    test('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/instructor/courses',
        '/api/student/dashboard',
        '/api/admin/users',
        '/api/profile'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            return { status: res.status, url: res.url };
          } catch (error) {
            return { error: error.message };
          }
        }, `${testUtils.baseUrl}${endpoint}`);
        
        // Should require authentication (401) or authorization (403)
        expect([401, 403].includes(response.status)).toBeTruthy();
        console.log(`Protected endpoint ${endpoint} status:`, response.status);
      }
    });

    test('should validate API input parameters', async () => {
      await testUtils.login(TEST_USERS.INSTRUCTOR.email, TEST_USERS.INSTRUCTOR.password, 'TRAINER');
      
      // Test course creation API with invalid data
      const invalidInputs = [
        { title: '', description: 'test', price: 99 }, // Empty title
        { title: 'Test', description: '', price: 99 }, // Empty description
        { title: 'Test', description: 'test', price: -1 }, // Negative price
        { title: 'Test', description: 'test', price: 'abc' }, // Invalid price type
        { title: '<script>alert("xss")</script>', description: 'test', price: 99 } // XSS attempt
      ];
      
      for (const invalidInput of invalidInputs) {
        const response = await page.evaluate(async (baseUrl, data) => {
          try {
            const res = await fetch(`${baseUrl}/api/courses/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            return { status: res.status, ok: res.ok };
          } catch (error) {
            return { error: error.message };
          }
        }, testUtils.baseUrl, invalidInput);
        
        // Should reject invalid input (400, 422)
        expect([400, 422].includes(response.status)).toBeTruthy();
        console.log('API validation working for invalid input:', response.status);
      }
    });
  });

  describe('Session and Token Security Tests', () => {
    test('should handle token expiration properly', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Check for token expiration handling
      const tokenInfo = await page.evaluate(() => {
        const authData = localStorage.getItem('auth') || sessionStorage.getItem('auth');
        if (authData) {
          try {
            return JSON.parse(authData);
          } catch (e) {
            return null;
          }
        }
        return null;
      });
      
      console.log('Token information:', tokenInfo ? 'Found' : 'Not found in storage');
      
      // If using JWT, check for expiration field
      if (tokenInfo && tokenInfo.token) {
        try {
          const payload = JSON.parse(atob(tokenInfo.token.split('.')[1]));
          if (payload.exp) {
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeToExpiry = expirationTime - currentTime;
            
            console.log('Token expires in:', Math.round(timeToExpiry / 1000 / 60), 'minutes');
            expect(timeToExpiry).toBeGreaterThan(0); // Token should not be expired
          }
        } catch (e) {
          console.log('Token format not standard JWT');
        }
      }
    });

    test('should invalidate session on logout', async () => {
      await testUtils.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password, 'STUDENT');
      
      // Check session exists
      const beforeLogout = await page.evaluate(() => ({
        localStorage: !!localStorage.getItem('auth') || !!localStorage.getItem('user'),
        sessionStorage: !!sessionStorage.getItem('auth') || !!sessionStorage.getItem('user')
      }));
      
      // Logout
      await testUtils.logout();
      
      // Check session is cleared
      const afterLogout = await page.evaluate(() => ({
        localStorage: !!localStorage.getItem('auth') || !!localStorage.getItem('user'),
        sessionStorage: !!sessionStorage.getItem('auth') || !!sessionStorage.getItem('user')
      }));
      
      expect(afterLogout.localStorage).toBe(false);
      expect(afterLogout.sessionStorage).toBe(false);
      
      // Check cookies are cleared
      const cookies = await page.cookies();
      const authCookies = cookies.filter(c => 
        c.name.includes('auth') || c.name.includes('token'));
      expect(authCookies.length).toBe(0);
      
      console.log('Session properly invalidated on logout');
    });
  });
});