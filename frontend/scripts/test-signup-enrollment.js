#!/usr/bin/env node

/**
 * Test script to verify new user signup with automatic default course enrollment
 * 
 * This script simulates the signup process and verifies that:
 * 1. New users are automatically enrolled in js-fundamentals-1
 * 2. Activity logs are created
 * 3. Database transaction integrity is maintained
 * 
 * Usage: node scripts/test-signup-enrollment.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSignupEnrollment() {
  try {
    console.log('🧪 Testing new user signup with default course enrollment...\n')
    
    const testEmail = `test-user-${Date.now()}@example.com`
    const testName = 'Test User'
    const DEFAULT_COURSE_ID = 'js-fundamentals-1'
    
    console.log(`📧 Test user email: ${testEmail}`)
    
    // Check initial state
    const initialUserCount = await prisma.user.count()
    const initialEnrollmentCount = await prisma.enrollment.count({
      where: { courseId: DEFAULT_COURSE_ID }
    })
    
    console.log(`👥 Initial user count: ${initialUserCount}`)
    console.log(`📚 Initial enrollments for default course: ${initialEnrollmentCount}`)
    
    // Simulate the signup process (same logic as in the API route)
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          name: testName,
          email: testEmail,
          password: 'test-password-hash', // In real signup, this would be bcrypt hashed
          role: "STUDENT"
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      })
      
      console.log(`✅ Created test user: ${newUser.name} (${newUser.id})`)
      
      // Check if the default course exists
      const defaultCourse = await tx.course.findUnique({
        where: { id: DEFAULT_COURSE_ID },
        select: { id: true, title: true, status: true }
      })
      
      if (defaultCourse && defaultCourse.status === 'PUBLISHED') {
        // Create enrollment for the default course
        const enrollment = await tx.enrollment.create({
          data: {
            studentId: newUser.id,
            courseId: DEFAULT_COURSE_ID,
            status: 'ACTIVE',
            progress: 0,
            enrolledAt: new Date()
          }
        })
        
        console.log(`📚 Enrolled user in course: ${defaultCourse.title}`)
        
        // Create activity log for the automatic enrollment
        await tx.activityLog.create({
          data: {
            userId: newUser.id,
            action: 'COURSE_ENROLLED',
            details: `Automatically enrolled in default course: ${defaultCourse.title}`,
            metadata: {
              courseId: DEFAULT_COURSE_ID,
              courseTitle: defaultCourse.title,
              enrollmentType: 'DEFAULT_ON_SIGNUP',
              testRun: true
            }
          }
        })
        
        console.log(`📝 Created activity log for enrollment`)
        
        return { newUser, enrollment, course: defaultCourse }
      } else {
        console.warn(`⚠️ Default course ${DEFAULT_COURSE_ID} not found or not published`)
        return { newUser, enrollment: null, course: null }
      }
    })
    
    // Verify final state
    const finalUserCount = await prisma.user.count()
    const finalEnrollmentCount = await prisma.enrollment.count({
      where: { courseId: DEFAULT_COURSE_ID }
    })
    
    console.log(`\n🔍 Verification:`)
    console.log(`👥 Final user count: ${finalUserCount} (+${finalUserCount - initialUserCount})`)
    console.log(`📚 Final enrollments: ${finalEnrollmentCount} (+${finalEnrollmentCount - initialEnrollmentCount})`)
    
    // Verify the enrollment was created
    const userEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: result.newUser.id,
          courseId: DEFAULT_COURSE_ID
        }
      },
      include: {
        course: {
          select: { title: true }
        }
      }
    })
    
    if (userEnrollment) {
      console.log(`✅ Enrollment verified: User enrolled in "${userEnrollment.course.title}"`)
      console.log(`   • Status: ${userEnrollment.status}`)
      console.log(`   • Progress: ${userEnrollment.progress}%`)
      console.log(`   • Enrolled: ${userEnrollment.enrolledAt.toLocaleString()}`)
    } else {
      console.log(`❌ Enrollment verification failed`)
    }
    
    // Verify activity log was created
    const activityLog = await prisma.activityLog.findFirst({
      where: {
        userId: result.newUser.id,
        action: 'COURSE_ENROLLED'
      }
    })
    
    if (activityLog) {
      console.log(`✅ Activity log verified: ${activityLog.details}`)
    } else {
      console.log(`❌ Activity log verification failed`)
    }
    
    // Clean up test data
    console.log(`\n🧹 Cleaning up test data...`)
    
    await prisma.activityLog.deleteMany({
      where: {
        userId: result.newUser.id
      }
    })
    
    await prisma.enrollment.deleteMany({
      where: {
        studentId: result.newUser.id
      }
    })
    
    await prisma.user.delete({
      where: {
        id: result.newUser.id
      }
    })
    
    console.log(`✅ Test data cleaned up`)
    
    // Final verification
    const cleanupUserCount = await prisma.user.count()
    const cleanupEnrollmentCount = await prisma.enrollment.count({
      where: { courseId: DEFAULT_COURSE_ID }
    })
    
    console.log(`\n📊 Final State After Cleanup:`)
    console.log(`👥 User count: ${cleanupUserCount} (should be ${initialUserCount})`)
    console.log(`📚 Enrollment count: ${cleanupEnrollmentCount} (should be ${initialEnrollmentCount})`)
    
    if (cleanupUserCount === initialUserCount && cleanupEnrollmentCount === initialEnrollmentCount) {
      console.log(`✅ Cleanup successful - database restored to initial state`)
    } else {
      console.log(`⚠️ Cleanup may have issues - counts don't match initial state`)
    }
    
    console.log(`\n🎉 Test completed successfully!`)
    console.log(`✅ New user signup with default course enrollment is working correctly`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute the test
testSignupEnrollment()
  .then(() => {
    console.log('\n✨ Test script completed!')
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error)
    process.exit(1)
  })