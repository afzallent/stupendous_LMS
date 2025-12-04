import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsersAndEnrollments() {
  try {
    console.log('🔍 Checking users in database...')
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    console.log('Users:')
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}`)
    })
    
    console.log('\n🔍 Checking enrollments...')
    
    // Get all enrollments
    const enrollments = await prisma.enrollment.findMany({
      include: {
        student: {
          select: {
            email: true,
            name: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      }
    })
    
    console.log('Enrollments:')
    enrollments.forEach(enrollment => {
      console.log(`  - ${enrollment.student.name} (${enrollment.student.email}) enrolled in "${enrollment.course.title}"`)
    })
    
    console.log('\n🔍 Checking courses...')
    
    // Get all courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        status: true
      }
    })
    
    console.log('Courses:')
    courses.forEach(course => {
      console.log(`  - "${course.title}" (ID: ${course.id}) - Status: ${course.status}`)
    })
    
  } catch (error) {
    console.error('Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersAndEnrollments()