import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTestUserEnrollments() {
  try {
    console.log('🔍 Checking enrollments for test users...')
    
    // Get test users
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@test.com'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    console.log('Test Users:')
    testUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}`)
    })
    
    // Check enrollments for each test user
    for (const user of testUsers) {
      console.log(`\n🔍 Enrollments for ${user.name} (${user.email}):`)
      
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId: user.id
        },
        include: {
          course: {
            select: {
              title: true,
              id: true
            }
          }
        }
      })
      
      if (enrollments.length === 0) {
        console.log(`  - No enrollments found`)
      } else {
        enrollments.forEach(enrollment => {
          console.log(`  - Enrolled in "${enrollment.course.title}" (ID: ${enrollment.course.id})`)
        })
      }
    }
    
  } catch (error) {
    console.error('Error checking test user enrollments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTestUserEnrollments()