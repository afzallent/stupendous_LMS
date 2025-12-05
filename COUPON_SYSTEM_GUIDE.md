# Coupon System Guide

## Overview

The LMS now includes a coupon system that allows students to enroll in courses using discount codes. This is particularly useful during the pre-release phase when payment gateways are not yet integrated.

## Features

- **Flexible Discounts**: Coupons can offer 0-100% discount
- **Usage Limits**: Set maximum number of uses per coupon (or unlimited)
- **Validity Periods**: Set start and end dates for coupon validity
- **Admin Management**: Full coupon management through Django admin
- **API Integration**: RESTful API for coupon validation and enrollment
- **Frontend UI**: Dedicated coupon enrollment page

## Pre-Release Coupon

A special **PRERELEASE** coupon has been created with:
- **Code**: PRERELEASE
- **Discount**: 100% (Free enrollment)
- **Max Uses**: Unlimited
- **Valid**: From now, no expiration
- **Status**: Active

This allows early adopters to access all courses for free during the pre-release phase.

## Backend Implementation

### Models

**Coupon Model** (`backend/courses/models.py`):
```python
class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    discount_percentage = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    is_active = models.BooleanField(default=True)
    max_uses = models.IntegerField(null=True, blank=True)
    times_used = models.IntegerField(default=0)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
```

### API Endpoints

**Enroll with Coupon**:
- **Endpoint**: `POST /api/enrollments/enroll_with_coupon/`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "course_id": "1",
    "coupon_code": "PRERELEASE"
  }
  ```
- **Response** (Success):
  ```json
  {
    "detail": "Successfully enrolled with PRERELEASE coupon (100% discount).",
    "enrollment": {
      "id": 1,
      "student": 1,
      "course": {...},
      "enrolled_at": "2024-12-05T18:00:00Z"
    },
    "discount_percentage": 100
  }
  ```
- **Response** (Error):
  ```json
  {
    "detail": "Invalid coupon code."
  }
  ```

### Validation Rules

The system validates:
1. **Coupon Exists**: Code must exist in database
2. **Is Active**: Coupon must be marked as active
3. **Valid Date Range**: Current date must be within valid_from and valid_until
4. **Usage Limit**: If max_uses is set, times_used must be less than max_uses
5. **Not Already Enrolled**: User must not already be enrolled in the course

## Django Admin Management

### Accessing Coupon Management

1. Login to Django admin: `http://localhost:8000/admin/`
2. Navigate to **Courses** → **Coupons**

### Creating a New Coupon

1. Click **Add Coupon** button
2. Fill in the fields:
   - **Code**: Unique coupon code (e.g., SUMMER2024)
   - **Description**: What the coupon is for
   - **Discount Percentage**: 0-100 (100 = free)
   - **Is Active**: Check to enable the coupon
   - **Max Uses**: Leave blank for unlimited, or set a number
   - **Valid From**: When the coupon becomes active
   - **Valid Until**: When the coupon expires (optional)
3. Click **Save**

### Managing Existing Coupons

**List View** shows:
- Code
- Discount percentage
- Status badge (Valid/Invalid)
- Times used
- Max uses
- Validity dates

**Actions**:
- Click on a coupon to edit it
- Use filters to find specific coupons
- Search by code or description
- View usage statistics

### Deactivating a Coupon

1. Click on the coupon
2. Uncheck **Is Active**
3. Click **Save**

## Frontend Implementation

### Coupon Enrollment Page

**URL**: `/checkout/coupon?courseId={id}`

**Features**:
- Clean, user-friendly interface
- Real-time validation
- Error handling with clear messages
- Success confirmation
- Auto-redirect to course after enrollment
- Highlights PRERELEASE coupon

### Integration with Course Detail Page

The course detail page now includes an **"Enroll with Coupon"** button that:
- Appears alongside the "Add to Cart" button
- Redirects to the coupon enrollment page
- Passes the course ID automatically

## Usage Examples

### For Students

1. **Browse Courses**: Go to `/courses` and select a course
2. **Click "Enroll with Coupon"**: On the course detail page
3. **Enter Coupon Code**: Type `PRERELEASE` (or any valid coupon)
4. **Click "Enroll Now"**: System validates and enrolls you
5. **Start Learning**: Automatically redirected to the course

### For Admins

**Create a Limited-Time Coupon**:
```bash
cd backend
python manage.py create_coupon \
  --code LAUNCH50 \
  --discount 50 \
  --description "Launch week - 50% off" \
  --max-uses 100
```

**Create a Free Trial Coupon**:
```bash
python manage.py create_coupon \
  --code FREETRIAL \
  --discount 100 \
  --description "Free trial for new users" \
  --max-uses 50
```

**Check Coupon Status** (Django Shell):
```python
from courses.models import Coupon

# Get coupon
coupon = Coupon.objects.get(code='PRERELEASE')

# Check validity
print(f"Valid: {coupon.is_valid()}")
print(f"Times Used: {coupon.times_used}")
print(f"Max Uses: {coupon.max_uses or 'Unlimited'}")
```

## Management Commands

### Create Coupon

```bash
python manage.py create_coupon [OPTIONS]
```

**Options**:
- `--code`: Coupon code (default: PRERELEASE)
- `--discount`: Discount percentage (default: 100)
- `--description`: Coupon description
- `--max-uses`: Maximum number of uses (default: unlimited)

**Example**:
```bash
python manage.py create_coupon \
  --code EARLYBIRD \
  --discount 75 \
  --description "Early bird special - 75% off" \
  --max-uses 25
```

## Testing

### Test Coupon Enrollment

1. **Create a test user** (if not already logged in)
2. **Navigate to a course**: `/courses/1`
3. **Click "Enroll with Coupon"**
4. **Enter**: `PRERELEASE`
5. **Verify**: You should be enrolled and redirected to the course

### Test Invalid Coupon

1. **Navigate to coupon page**: `/checkout/coupon?courseId=1`
2. **Enter**: `INVALID123`
3. **Verify**: Error message "Invalid coupon code."

### Test Expired Coupon

1. **In Django admin**, create a coupon with `valid_until` in the past
2. **Try to use it**
3. **Verify**: Error message "This coupon is no longer valid."

### Test Usage Limit

1. **Create a coupon** with `max_uses=1`
2. **Use it once** successfully
3. **Try to use it again**
4. **Verify**: Error message "This coupon is no longer valid."

## API Testing with cURL

### Enroll with Coupon

```bash
# Get access token first (login)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"student@example.com","password":"password"}'

# Use the access token to enroll
curl -X POST http://localhost:8000/api/enrollments/enroll_with_coupon/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_id":"1","coupon_code":"PRERELEASE"}'
```

## Troubleshooting

### Coupon Not Working

**Check**:
1. Is the coupon active? (`is_active = True`)
2. Is it within the valid date range?
3. Has it reached max uses?
4. Is the code spelled correctly? (case-insensitive)
5. Is the user already enrolled?

**Solution**: Check Django admin or use Django shell to inspect the coupon.

### "Invalid coupon code" Error

**Causes**:
- Coupon doesn't exist
- Code is misspelled
- Coupon is inactive

**Solution**: Verify the coupon exists and is active in Django admin.

### "This coupon is no longer valid" Error

**Causes**:
- Coupon has expired (`valid_until` passed)
- Max uses reached
- Coupon is inactive

**Solution**: Check coupon validity in Django admin.

### Already Enrolled Error

**Cause**: User is already enrolled in the course

**Solution**: This is expected behavior. Users cannot enroll twice.

## Future Enhancements

Potential improvements for the coupon system:

1. **Course-Specific Coupons**: Limit coupons to specific courses
2. **User-Specific Coupons**: One-time use coupons for specific users
3. **Bulk Coupon Generation**: Generate multiple unique codes at once
4. **Analytics Dashboard**: Track coupon usage and conversion rates
5. **Email Integration**: Send coupon codes via email
6. **Referral System**: Generate coupons for user referrals
7. **Tiered Discounts**: Different discounts based on cart value
8. **Combination Rules**: Allow/disallow combining multiple coupons

## Security Considerations

1. **Case-Insensitive**: Coupon codes are converted to uppercase
2. **Unique Codes**: Database constraint ensures uniqueness
3. **Authentication Required**: Must be logged in to use coupons
4. **Validation**: Server-side validation prevents abuse
5. **Usage Tracking**: System tracks how many times each coupon is used
6. **Atomic Operations**: Enrollment and coupon usage are atomic

## Related Documentation

- `DJANGO_ADMIN_GUIDE.md` - Django admin user management
- `README.md` - Project overview
- `backend/README.md` - Backend documentation
- `API_CLEANUP_GUIDE.md` - API endpoints reference

## Support

For issues or questions about the coupon system:
1. Check this guide first
2. Review Django admin for coupon status
3. Check backend logs for errors
4. Test with the PRERELEASE coupon
5. Contact the development team

---

**Happy Learning! 🎓**
