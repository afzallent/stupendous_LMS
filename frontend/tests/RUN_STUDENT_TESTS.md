# Student Journey Test Suite - Usage Guide

## Overview
This test suite simulates a complete student journey through the CourseCompass LMS platform using Puppeteer with visible Chrome windows.

## Test Scenarios Covered

1. **Homepage Navigation** - Access site and view available courses
2. **Course Selection** - Browse and select 2 courses for purchase
3. **UPI Payment** - Complete checkout using UPI payment method
4. **Registration/Login** - Create new student account or login
5. **Course Access** - Access enrolled courses and start learning
6. **Course Features** - Test navigation, quizzes, discussions
7. **Logout/Re-login** - Test session persistence
8. **Performance Check** - Verify site performance and accessibility

## Running the Tests

### With Visible Browser (Headed Mode)
```bash
npm run test:student:headed
```

### Watch Mode (Auto-reruns on changes)
```bash
npm run test:student:watch
```

### Standard Mode (Headless)
```bash
npm run test:student
```

## Prerequisites

1. **Start the development server:**
```bash
npm run dev
```

2. **Ensure database is seeded:**
```bash
npm run db:seed
```

3. **Create screenshots directory:**
```bash
mkdir -p screenshots
```

## Test Configuration

The test uses the following configuration for headed mode:
- Browser window size: 1920x1080
- Slow motion: 100ms delay between actions
- DevTools: Enabled for debugging
- Screenshots: Saved to `screenshots/` directory

## UPI Payment Testing

The test suite includes a comprehensive UPI payment helper that:
- Generates valid UPI IDs for different providers (GPay, PhonePe, Paytm, BHIM)
- Creates unique transaction IDs
- Handles payment confirmation and errors
- Supports payment retry logic
- Verifies payment in transaction history

### Supported UPI Providers
- Google Pay (@okaxis)
- PhonePe (@ybl)
- Paytm (@paytm)
- BHIM (@upi)

## Test Data

Each test run creates unique test data:
- Email: `student_[timestamp]@test.com`
- Password: `TestPassword123!`
- UPI ID: Dynamically generated
- Transaction ID: `TXN[timestamp][random]`

## Debugging Tips

1. **Pause at specific points:**
   Add `await page.waitForTimeout(10000);` to pause execution

2. **Take additional screenshots:**
   ```javascript
   await page.screenshot({ path: 'screenshots/debug.png', fullPage: true });
   ```

3. **Open DevTools:**
   The browser DevTools are automatically opened in headed mode

4. **Check console logs:**
   The test outputs detailed progress messages

## Common Issues & Solutions

### Issue: Test times out
**Solution:** Increase timeout in test configuration or specific test cases

### Issue: Elements not found
**Solution:** Check if selectors match your application's HTML structure

### Issue: Payment flow doesn't complete
**Solution:** The test includes mock payment success for development environments

### Issue: Login fails
**Solution:** Ensure the authentication system is running and JWT tokens are properly configured

## Performance Metrics

The test suite measures and reports:
- DOM Content Load time
- Page Load Complete time
- First Paint timing
- First Contentful Paint timing
- Accessibility issues (missing alt texts, labels)

## Expected Output

Successful test run should show:
```
✅ Homepage loaded
📚 Found X courses available
🛒 Selected 2 courses for purchase
✅ Payment completed successfully
✅ Registration successful
🎓 Started learning first course
✅ All tests passed
```

## Customization

To modify test behavior, edit:
- `tests/student-journey.test.js` - Main test suite
- `tests/jest-puppeteer-headed.config.js` - Browser configuration
- `tests/helpers/upi-payment-helper.js` - Payment handling logic

## CI/CD Integration

For CI environments, use headless mode:
```bash
CI=true npm run test:student
```

This will run tests without visible browser and with reduced delays.