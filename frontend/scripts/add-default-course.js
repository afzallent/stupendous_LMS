#!/usr/bin/env node

/**
 * Script to add js-fundamentals-1 course to all users by default
 * 
 * This script:
 * 1. Enrolls all existing users in the js-fundamentals-1 course
 * 2. Skips users who are already enrolled
 * 3. Creates enrollment records with ACTIVE status and 0% progress
 * 
 * Usage: node scripts/add-default-course.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_COURSE_ID = 'js-fundamentals-1'

async function main() {
  try {
    console.log('🚀 Starting default course enrollment script...')
    
    // 1. Verify the course exists
    const course = await prisma.course.findUnique({
      where: { id: DEFAULT_COURSE_ID },
      select: {
        id: true,
        title: true,
        status: true,
        trainer: {
          select: { name: true }
        }
      }
    })
    
    if (!course) {
      console.error(`❌ Course with ID "${DEFAULT_COURSE_ID}" not found!`)
      process.exit(1)
    }
    
    console.log(`📚 Found course: "${course.title}" by ${course.trainer.name}`)
    console.log(`📝 Course status: ${course.status}`)
    
    // 2. Get all users (all roles)
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    console.log(`👥 Found ${allUsers.length} total users`)
    
    // 3. Check existing enrollments for this course
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        courseId: DEFAULT_COURSE_ID
      },
      select: {
        studentId: true
      }
    })
    
    const enrolledUserIds = new Set(existingEnrollments.map(e => e.studentId))
    console.log(`✅ ${enrolledUserIds.size} users already enrolled`)
    
    // 4. Filter users who need enrollment
    const usersToEnroll = allUsers.filter(user => !enrolledUserIds.has(user.id))
    
    if (usersToEnroll.length === 0) {
      console.log('🎉 All users are already enrolled in the default course!')
      return
    }
    
    console.log(`📋 ${usersToEnroll.length} users need to be enrolled:`)
    usersToEnroll.forEach(user => {
      console.log(`   - ${user.name || 'Unknown'} (${user.email}) [${user.role}]`)
    })
    
    // 5. Create enrollments for users who don't have them
    const enrollmentPromises = usersToEnroll.map(user => 
      prisma.enrollment.create({
        data: {
          studentId: user.id,
          courseId: DEFAULT_COURSE_ID,
          status: 'ACTIVE',
          progress: 0,
          enrolledAt: new Date()
        }
      })
    )
    
    console.log('\n⏳ Creating enrollments...')
    const createdEnrollments = await Promise.all(enrollmentPromises)
    
    console.log(`✅ Successfully enrolled ${createdEnrollments.length} users in "${course.title}"`)
    
    // 6. Verify final enrollment count
    const finalEnrollmentCount = await prisma.enrollment.count({
      where: {
        courseId: DEFAULT_COURSE_ID
      }
    })
    
    console.log(`📊 Total enrollments for "${course.title}": ${finalEnrollmentCount}`)
    
    // 7. Create activity logs for the enrollments
    console.log('\n📝 Creating activity logs...')
    const activityPromises = usersToEnroll.map(user =>
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'COURSE_ENROLLED',
          details: `Automatically enrolled in default course: ${course.title}`,
          metadata: {
            courseId: DEFAULT_COURSE_ID,
            courseTitle: course.title,
            enrollmentType: 'DEFAULT',
            scriptName: 'add-default-course.js'
          }
        }
      })
    )
    
    await Promise.all(activityPromises)
    console.log(`✅ Created ${activityPromises.length} activity logs`)
    
    console.log('\n🎉 Default course enrollment completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   • Course: ${course.title} (${DEFAULT_COURSE_ID})`)
    console.log(`   • Total users: ${allUsers.length}`)
    console.log(`   • Previously enrolled: ${enrolledUserIds.size}`)
    console.log(`   • Newly enrolled: ${createdEnrollments.length}`)
    console.log(`   • Final enrollment count: ${finalEnrollmentCount}`)
    
  } catch (error) {
    console.error('❌ Error during enrollment process:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute the script
main()
  .then(() => {
    console.log('\n✨ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })