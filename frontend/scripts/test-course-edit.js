#!/usr/bin/env node

/**
 * Script to check existing courses for testing edit functionality
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Checking existing courses...\n')
    
    // Get all courses with their trainers
    const courses = await prisma.course.findMany({
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        category: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            chapters: true,
            enrollments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (courses.length === 0) {
      console.log('❌ No courses found in the database.')
      console.log('💡 Run the seed script first: npx prisma db seed')
      return
    }
    
    console.log(`📚 Found ${courses.length} courses:\n`)
    
    courses.forEach((course, index) => {
      console.log(`${index + 1}. "${course.title}" (ID: ${course.id})`)
      console.log(`   👨‍🏫 Instructor: ${course.trainer.name} (${course.trainer.email})`)
      console.log(`   📂 Category: ${course.category?.name || 'Uncategorized'}`)
      console.log(`   📊 Status: ${course.status}`)
      console.log(`   💰 Price: $${course.price || 0}`)
      console.log(`   📖 Chapters: ${course._count.chapters}`)
      console.log(`   👥 Enrollments: ${course._count.enrollments}`)
      console.log(`   🔗 Edit URL: /instructor/create-course?edit=${course.id}`)
      console.log()
    })
    
    // Get instructor users
    const instructors = await prisma.user.findMany({
      where: {
        role: 'TRAINER'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
    
    console.log(`👨‍🏫 Available Instructors (${instructors.length}):\n`)
    instructors.forEach((instructor, index) => {
      console.log(`${index + 1}. ${instructor.name} (${instructor.email}) - ID: ${instructor.id}`)
    })
    
    console.log('\n🧪 Test Instructions:')
    console.log('1. Login as an instructor (instructor@test.com)')
    console.log('2. Go to /instructor page')
    console.log('3. Click "Edit" on any course card')
    console.log('4. The course should load in edit mode with existing data')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()