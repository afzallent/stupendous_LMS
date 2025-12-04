# CourseCompass V2 - Comprehensive Test Suite

This directory contains a comprehensive Puppeteer-based test suite that covers all aspects of the CourseCompass V2 application.

## Test Coverage

### 🔐 Authentication Tests (`auth.test.js`)
- Login/logout functionality with boundary value testing
- Signup form validation with comprehensive edge cases
- Session management and security
- Rate limiting and CSRF protection
- XSS and SQL injection prevention

### 📝 Form Validation Tests (`formValidation.test.js`)
- Comprehensive boundary value testing for all form fields
- Email, password, name, course title, description, and price validation
- Real-time validation feedback testing
- Accessibility compliance (ARIA labels, keyboard navigation)
- Security validation (XSS, SQL injection prevention)

### 🛡️ Security Tests (`security.test.js`)
- Cross-Site Scripting (XSS) protection
- SQL injection prevention
- CSRF token validation
- File upload security
- HTTP security headers validation
- Session security and token management
- Data exposure prevention

### 📚 Course Management Tests (`courseManagement.test.js`)
- Course creation workflow
- File upload functionality (images, videos, documents)
- Course publishing and status management
- Form validation with boundary values
- Performance testing for course operations
- Security testing for instructor-only features

### 🎓 Student Learning Tests (`studentLearning.test.js`)
- Course discovery and search functionality
- Shopping cart operations
- Enrollment and payment workflows
- Learning interface and progress tracking
- Video playback controls
- Profile management

### 👑 Admin Dashboard Tests (`adminDashboard.test.js`)
- User management (CRUD operations)
- Course moderation and approval workflow
- System settings and configuration
- Analytics and reporting
- Role-based access control
- Security validation for admin-only features

### ⚡ Performance Tests (`performance.test.js`)
- Page load time measurement
- Resource optimization validation
- Network efficiency testing
- Mobile performance testing
- Memory usage monitoring
- Core Web Vitals measurement

## Installation and Setup

```bash
# Install dependencies (already done)
npm install --save-dev puppeteer @types/puppeteer jest @types/jest jest-puppeteer

# Make test runner executable
chmod +x tests/test-runner.js
```

## Running Tests

### Quick Start
```bash
# Run all tests in local environment
npm run test:e2e

# Run smoke tests only
npm run test:smoke

# Run with visible browser (headed mode)
npm run test:headed
```

### Advanced Usage
```bash
# Using the test runner directly
node tests/test-runner.js --env local --mode full
node tests/test-runner.js --env staging --mode regression --headed
node tests/test-runner.js --env production --mode smoke --parallel

# Run specific test suites
npx jest tests/auth.test.js --config=tests/jest.config.js
npx jest tests/security.test.js --config=tests/jest.config.js --verbose
```

### Command Line Options

| Option | Description | Values |
|--------|-------------|---------|
| `--env` | Test environment | `local`, `staging`, `production` |
| `--mode` | Test mode | `smoke`, `regression`, `full` |
| `--browser` | Browser engine | `chromium`, `firefox`, `webkit` |
| `--headed` | Show browser window | flag |
| `--parallel` | Run suites in parallel | flag |
| `--no-report` | Skip report generation | flag |

## Test Modes

### Smoke Tests (5-10 minutes)
- Authentication basics
- Critical form validation
- Essential security checks

### Regression Tests (15-20 minutes)
- Authentication and security
- Course management core features
- User role validation

### Full Test Suite (30-45 minutes)
- All test suites
- Comprehensive coverage
- Performance benchmarks

## Environment Configuration

### Local Environment
- URL: `http://localhost:3000`
- Automatically starts dev server
- Uses test database
- Full feature access

### Staging Environment
- URL: Set via `STAGING_URL` environment variable
- Pre-production testing
- Real-like data scenarios

### Production Environment
- URL: Set via `PRODUCTION_URL` environment variable
- Read-only tests only
- Monitoring and health checks

## Test Data and Fixtures

### Test Users
```javascript
// Pre-configured test users
STUDENT: { email: 'student@test.com', password: 'password123' }
INSTRUCTOR: { email: 'instructor@test.com', password: 'password123' }
ADMIN: { email: 'admin@test.com', password: 'password123' }
```

### Boundary Value Testing
- Email: Valid/invalid formats, length limits, special characters
- Passwords: Strength requirements, length limits, special cases
- Names: Unicode support, length limits, invalid characters
- Prices: Numeric validation, decimal places, negative values
- Descriptions: Length limits, HTML injection prevention

### Security Test Payloads
- XSS: Script tags, event handlers, JavaScript protocols
- SQL Injection: Union queries, boolean conditions, comment injection
- File Upload: Malicious file types, oversized files, script injection

## Performance Benchmarks

| Metric | Excellent | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| Page Load | < 1s | < 3s | < 5s | > 10s |
| DOM Content Loaded | < 1.5s | < 2.5s | < 4s | > 5s |
| First Contentful Paint | < 1s | < 2s | < 3s | > 4s |
| JavaScript Bundle | < 500KB | < 1MB | < 2MB | > 2MB |
| CSS Bundle | < 100KB | < 200KB | < 500KB | > 500KB |

## Generated Reports

### JSON Report
- Detailed test results
- Performance metrics
- Error details
- Machine-readable format

### HTML Report
- Visual test summary
- Success/failure rates
- Suite-by-suite breakdown
- Timeline and duration

### Screenshots
- Automatic screenshot on test failure
- Before/after state captures
- Error state documentation

## Best Practices

### Test Writing
1. Use descriptive test names
2. Include boundary value testing
3. Test both positive and negative scenarios
4. Validate security implications
5. Check accessibility compliance

### Performance
1. Clear browser state between tests
2. Use appropriate timeouts
3. Monitor memory usage
4. Test on different network conditions

### Security
1. Test input validation thoroughly
2. Verify output encoding
3. Check authentication/authorization
4. Validate file upload restrictions

### Maintenance
1. Update test data regularly
2. Review and update benchmarks
3. Monitor test execution times
4. Keep security payloads current

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    npm ci
    npm run test:e2e:ci
  env:
    CI: true
    BASE_URL: http://localhost:3000
```

### Jenkins Example
```groovy
stage('E2E Tests') {
  steps {
    sh 'npm ci'
    sh 'node tests/test-runner.js --env staging --mode regression'
  }
  post {
    always {
      publishHTML([
        allowMissing: false,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'tests/reports',
        reportFiles: '*.html',
        reportName: 'E2E Test Report'
      ])
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Browser Launch Failures**
   ```bash
   # Install missing dependencies
   npx puppeteer browsers install chrome
   ```

2. **Permission Issues**
   ```bash
   # Fix permissions
   chmod +x tests/test-runner.js
   ```

3. **Network Timeouts**
   ```bash
   # Increase timeout
   export TEST_TIMEOUT=60000
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=4096 tests/test-runner.js
   ```

### Debug Mode
```bash
# Run with debug output
DEBUG=puppeteer:* node tests/test-runner.js --headed

# Keep browser open after test
DEBUG_HOLD=true node tests/test-runner.js --headed
```

## Contributing

1. Add new test files to the `tests/` directory
2. Update test runner configuration
3. Follow existing naming conventions
4. Include comprehensive documentation
5. Test against all environments

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test logs and screenshots
3. Verify environment configuration
4. Contact the development team