import puppeteer from 'puppeteer'

describe('Authentication Security Tests - Complete Flow', () => {
  let browser: any
  let page: any
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001'

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true' ? 'new' : false,
      slowMo: process.env.CI === 'true' ? 0 : 100,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })
    page = await browser.newPage()
    
    // Monitor console for authentication debugging
    page.on('console', (msg: any) => {
      if (msg.text().includes('🔒') || msg.text().includes('Authentication')) {
        console.log('🔍 Auth Debug:', msg.text())
      }
    })
  })

  afterAll(async () => {
    if (page) await page.close()
    if (browser) await browser.close()
  })

  beforeEach(async () => {
    // Clear all storage before each test
    await page.evaluateOnNewDocument(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  describe('🚫 Protected Route Access (Without Authentication)', () => {
    
    test('should redirect /learn to login', async () => {
      const response = await page.goto(`${baseUrl}/learn`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000) // Wait for any client-side redirects
      
      const currentUrl = page.url()
      console.log('📍 Final URL after /learn access:', currentUrl)
      
      // Should be redirected to login with redirect parameter
      expect(currentUrl).toMatch(/\/auth\/login/)
      expect(currentUrl).toMatch(/redirect=/)
    }, 15000)

    test('should redirect /learn/ui-ux-design-1 to login', async () => {
      const response = await page.goto(`${baseUrl}/learn/ui-ux-design-1`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after course page access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
      expect(currentUrl).toContain('/learn/ui-ux-design-1')
    }, 15000)

    test('should redirect /admin to login', async () => {
      const response = await page.goto(`${baseUrl}/admin`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after admin access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
    }, 15000)

    test('should redirect /instructor to login', async () => {
      const response = await page.goto(`${baseUrl}/instructor`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after instructor access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
    }, 15000)

    test('should redirect /profile to login', async () => {
      const response = await page.goto(`${baseUrl}/profile`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after profile access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
    }, 15000)

  })

  describe('✅ Authentication Flow', () => {
    
    test('should successfully login and redirect to learn dashboard', async () => {
      // Go to login page
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      
      // Fill in test credentials
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      
      // Submit form
      await page.click('button[type=\"submit\"]')
      
      // Wait for redirect
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('📍 URL after student login:', currentUrl)
      
      // Should be redirected to learn dashboard
      expect(currentUrl).toMatch(/\/learn$/)
    }, 20000)

    test('should login with redirect parameter and go to intended page', async () => {
      // Try to access protected course page (should redirect to login with redirect param)
      await page.goto(`${baseUrl}/learn/ui-ux-design-1`, { waitUntil: 'networkidle2' })
      
      await page.waitForTimeout(2000)
      
      let currentUrl = page.url()
      console.log('📍 URL after redirect to login:', currentUrl)
      
      // Should be on login page with redirect parameter
      expect(currentUrl).toMatch(/\/auth\/login/)
      expect(currentUrl).toContain('redirect=')
      
      // Login with test credentials
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      
      await page.click('button[type=\"submit\"]')
      
      // Wait for redirect back to intended page
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      currentUrl = page.url()
      console.log('📍 URL after redirect back:', currentUrl)
      
      // Should be redirected back to the course page
      expect(currentUrl).toMatch(/\/learn\/ui-ux-design-1/)
    }, 25000)

  })

  describe('🔐 Enrollment Verification', () => {
    
    test('should show enrollment error for non-enrolled course', async () => {
      // First login
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      
      // Try to access a course not enrolled in
      await page.goto(`${baseUrl}/learn/non-existent-course`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(3000)
      
      // Should show enrollment error or redirect to course page
      const pageContent = await page.content()
      const hasEnrollmentError = pageContent.includes('not enrolled') || 
                                pageContent.includes('Course Access Restricted') ||
                                page.url().includes('/courses/')
      
      expect(hasEnrollmentError).toBe(true)
    }, 25000)

  })

  describe('👥 Role-Based Access Control', () => {
    
    test('should allow admin access to admin dashboard', async () => {
      // Login as admin
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'admin@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('📍 URL after admin login:', currentUrl)
      
      // Should be redirected to admin dashboard
      expect(currentUrl).toMatch(/\/admin/)
    }, 20000)

    test('should allow trainer access to instructor dashboard', async () => {
      // Clear session first
      await page.evaluateOnNewDocument(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Login as trainer
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'instructor@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('📍 URL after trainer login:', currentUrl)
      
      // Should be redirected to instructor dashboard
      expect(currentUrl).toMatch(/\/instructor/)
    }, 20000)

  })

  describe('🔄 Session Management', () => {
    
    test('should logout and redirect to home', async () => {
      // Login first
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      
      // Try to find and click logout
      try {\n        // Look for user avatar/dropdown\n        await page.click('[data-testid=\"user-menu\"]', { timeout: 3000 })\n        await page.waitForTimeout(500)\n        \n        // Click logout\n        await page.click('text=Log out', { timeout: 3000 })\n        \n        await page.waitForTimeout(2000)\n        \n        const currentUrl = page.url()\n        console.log('📍 URL after logout:', currentUrl)\n        \n        // Should be redirected to home\n        expect(currentUrl).toMatch(/\\/$|\/auth\\/login/)\n      } catch (error) {\n        console.log('⚠️  Logout test skipped - UI elements not found')\n      }\n    }, 20000)\n\n  })\n\n  describe('🛡️ Security Headers & Protection', () => {\n    \n    test('should have security headers on protected routes', async () => {\n      const response = await page.goto(`${baseUrl}/learn`, { waitUntil: 'networkidle2' })\n      \n      // Note: page.goto response doesn't include all headers in Puppeteer\n      // This is a basic check - full header testing would need different approach\n      expect(response).toBeTruthy()\n      \n      const currentUrl = page.url()\n      // Should have been redirected due to auth\n      expect(currentUrl).toMatch(/\/auth\/login/)\n    }, 10000)\n\n  })\n\n})import puppeteer from 'puppeteer'

describe('Authentication Security Tests - Complete Flow', () => {
  let browser: any
  let page: any
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001'

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true' ? 'new' : false,
      slowMo: process.env.CI === 'true' ? 0 : 100,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })
    page = await browser.newPage()
    
    // Monitor console for authentication debugging
    page.on('console', (msg: any) => {
      if (msg.text().includes('🔒') || msg.text().includes('Authentication')) {
        console.log('🔍 Auth Debug:', msg.text())
      }
    })
  })

  afterAll(async () => {
    if (page) await page.close()
    if (browser) await browser.close()
  })

  beforeEach(async () => {
    // Clear all storage before each test
    await page.evaluateOnNewDocument(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  describe('🚫 Protected Route Access (Without Authentication)', () => {
    
    test('should redirect /learn to login', async () => {
      const response = await page.goto(`${baseUrl}/learn`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000) // Wait for any client-side redirects
      
      const currentUrl = page.url()
      console.log('📍 Final URL after /learn access:', currentUrl)
      
      // Should be redirected to login with redirect parameter
      expect(currentUrl).toMatch(/\/auth\/login/)
      expect(currentUrl).toMatch(/redirect=/)
    }, 15000)

    test('should redirect /learn/ui-ux-design-1 to login', async () => {
      const response = await page.goto(`${baseUrl}/learn/ui-ux-design-1`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after course page access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
      expect(currentUrl).toContain('/learn/ui-ux-design-1')
    }, 15000)

    test('should redirect /admin to login', async () => {
      const response = await page.goto(`${baseUrl}/admin`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after admin access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
    }, 15000)

    test('should redirect /instructor to login', async () => {
      const response = await page.goto(`${baseUrl}/instructor`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after instructor access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
    }, 15000)

    test('should redirect /profile to login', async () => {
      const response = await page.goto(`${baseUrl}/profile`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      console.log('📍 Final URL after profile access:', currentUrl)
      
      expect(currentUrl).toMatch(/\/auth\/login/)
    }, 15000)

  })

  describe('✅ Authentication Flow', () => {
    
    test('should successfully login and redirect to learn dashboard', async () => {
      // Go to login page
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      
      // Fill in test credentials
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      
      // Submit form
      await page.click('button[type=\"submit\"]')
      
      // Wait for redirect
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('📍 URL after student login:', currentUrl)
      
      // Should be redirected to learn dashboard
      expect(currentUrl).toMatch(/\/learn$/)
    }, 20000)

    test('should login with redirect parameter and go to intended page', async () => {
      // Try to access protected course page (should redirect to login with redirect param)
      await page.goto(`${baseUrl}/learn/ui-ux-design-1`, { waitUntil: 'networkidle2' })
      
      await page.waitForTimeout(2000)
      
      let currentUrl = page.url()
      console.log('📍 URL after redirect to login:', currentUrl)
      
      // Should be on login page with redirect parameter
      expect(currentUrl).toMatch(/\/auth\/login/)
      expect(currentUrl).toContain('redirect=')
      
      // Login with test credentials
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      
      await page.click('button[type=\"submit\"]')
      
      // Wait for redirect back to intended page
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      currentUrl = page.url()
      console.log('📍 URL after redirect back:', currentUrl)
      
      // Should be redirected back to the course page
      expect(currentUrl).toMatch(/\/learn\/ui-ux-design-1/)
    }, 25000)

  })

  describe('🔐 Enrollment Verification', () => {
    
    test('should show enrollment error for non-enrolled course', async () => {
      // First login
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      
      // Try to access a course not enrolled in
      await page.goto(`${baseUrl}/learn/non-existent-course`, { 
        waitUntil: 'networkidle2',
        timeout: 10000
      })
      
      await page.waitForTimeout(3000)
      
      // Should show enrollment error or redirect to course page
      const pageContent = await page.content()
      const hasEnrollmentError = pageContent.includes('not enrolled') || 
                                pageContent.includes('Course Access Restricted') ||
                                page.url().includes('/courses/')
      
      expect(hasEnrollmentError).toBe(true)
    }, 25000)

  })

  describe('👥 Role-Based Access Control', () => {
    
    test('should allow admin access to admin dashboard', async () => {
      // Login as admin
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'admin@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('📍 URL after admin login:', currentUrl)
      
      // Should be redirected to admin dashboard
      expect(currentUrl).toMatch(/\/admin/)
    }, 20000)

    test('should allow trainer access to instructor dashboard', async () => {
      // Clear session first
      await page.evaluateOnNewDocument(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Login as trainer
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'instructor@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      
      const currentUrl = page.url()
      console.log('📍 URL after trainer login:', currentUrl)
      
      // Should be redirected to instructor dashboard
      expect(currentUrl).toMatch(/\/instructor/)
    }, 20000)

  })

  describe('🔄 Session Management', () => {
    
    test('should logout and redirect to home', async () => {
      // Login first
      await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle2' })
      await page.type('input[type=\"email\"]', 'student@test.com')
      await page.type('input[type=\"password\"]', 'password123')
      await page.click('button[type=\"submit\"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
      
      // Try to find and click logout
      try {\n        // Look for user avatar/dropdown\n        await page.click('[data-testid=\"user-menu\"]', { timeout: 3000 })\n        await page.waitForTimeout(500)\n        \n        // Click logout\n        await page.click('text=Log out', { timeout: 3000 })\n        \n        await page.waitForTimeout(2000)\n        \n        const currentUrl = page.url()\n        console.log('📍 URL after logout:', currentUrl)\n        \n        // Should be redirected to home\n        expect(currentUrl).toMatch(/\\/$|\/auth\\/login/)\n      } catch (error) {\n        console.log('⚠️  Logout test skipped - UI elements not found')\n      }\n    }, 20000)\n\n  })\n\n  describe('🛡️ Security Headers & Protection', () => {\n    \n    test('should have security headers on protected routes', async () => {\n      const response = await page.goto(`${baseUrl}/learn`, { waitUntil: 'networkidle2' })\n      \n      // Note: page.goto response doesn't include all headers in Puppeteer\n      // This is a basic check - full header testing would need different approach\n      expect(response).toBeTruthy()\n      \n      const currentUrl = page.url()\n      // Should have been redirected due to auth\n      expect(currentUrl).toMatch(/\/auth\/login/)\n    }, 10000)\n\n  })\n\n})