#!/usr/bin/env node

/**
 * Script to verify default course enrollment status
 * 
 * This script shows:
 * 1. Current enrollment count for js-fundamentals-1
 * 2. List of all enrolled users
 * 3. Any users who might not be enrolled
 * 
 * Usage: node scripts/verify-default-course.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_COURSE_ID = 'js-fundamentals-1'

async function main() {
  try {
    console.log('🔍 Verifying default course enrollment status...\n')
    
    // 1. Get course information
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
      return
    }
    
    console.log(`📚 Course: "${course.title}" by ${course.trainer.name}`)
    console.log(`📝 Status: ${course.status}\n`)
    
    // 2. Get all users
    const totalUsers = await prisma.user.count()
    console.log(`👥 Total users in system: ${totalUsers}`)
    
    // 3. Get enrollments for default course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: DEFAULT_COURSE_ID
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    })
    
    console.log(`✅ Users enrolled in "${course.title}": ${enrollments.length}\n`)
    
    // 4. List enrolled users
    console.log('📋 Enrolled Users:')
    enrollments.forEach((enrollment, index) => {
      const user = enrollment.student
      console.log(`   ${index + 1}. ${user.name || 'Unknown'} (${user.email}) [${user.role}]`)
      console.log(`      • Enrolled: ${enrollment.enrolledAt.toLocaleDateString()}`)
      console.log(`      • Progress: ${enrollment.progress}%`)
      console.log(`      • Status: ${enrollment.status}`)
    })
    
    // 5. Check for users not enrolled
    const enrolledUserIds = enrollments.map(e => e.studentId)
    const unenrolledUsers = await prisma.user.findMany({
      where: {
        id: {
          notIn: enrolledUserIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    if (unenrolledUsers.length > 0) {
      console.log(`\n⚠️ Users NOT enrolled (${unenrolledUsers.length}):`)
      unenrolledUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || 'Unknown'} (${user.email}) [${user.role}]`)
      })
    } else {
      console.log(`\n🎉 All users are enrolled in the default course!`)
    }
    
    // 6. Show activity logs for recent enrollments
    const recentLogs = await prisma.activityLog.findMany({
      where: {
        action: 'COURSE_ENROLLED',
        details: {
          contains: course.title
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    if (recentLogs.length > 0) {
      console.log(`\n📊 Recent Enrollment Activity (last ${recentLogs.length}):`)
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.user.name} - ${log.createdAt.toLocaleString()}`)
        console.log(`      ${log.details}`)
      })
    }
    
    // 7. Summary
    console.log(`\n📈 Summary:`)
    console.log(`   • Total Users: ${totalUsers}`)
    console.log(`   • Enrolled Users: ${enrollments.length}`)
    console.log(`   • Enrollment Rate: ${((enrollments.length / totalUsers) * 100).toFixed(1)}%`)
    console.log(`   • Unenrolled Users: ${unenrolledUsers.length}`)
    
    if (enrollments.length === totalUsers) {
      console.log(`\n✨ Perfect! All users are enrolled in the default course.`)
    } else {
      console.log(`\n💡 Suggestion: Run 'npm run db:default-course' to enroll remaining users.`)
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute the script
main()
  .then(() => {
    console.log('\n✅ Verification completed!')
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error)
    process.exit(1)
  })