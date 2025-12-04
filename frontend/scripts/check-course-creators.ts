import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCourseCreators() {
  try {
    console.log('🔍 Checking course creators...')
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    
    const userMap = Object.fromEntries(users.map(user => [user.id, user]))
    
    // Get all courses with their trainers
    const courses = await prisma.course.findMany({
      include: {
        trainer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    console.log('Courses and their creators:')
    courses.forEach(course => {
      console.log(`  - "${course.title}" (ID: ${course.id}) - Created by: ${course.trainer.name} (${course.trainer.email})`)
    })
    
  } catch (error) {
    console.error('Error checking course creators:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCourseCreators()