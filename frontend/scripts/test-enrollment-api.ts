import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEnrollmentAPI() {
  try {
    console.log('🔍 Testing enrollment API...')
    
    // Get the student user
    const student = await prisma.user.findFirst({
      where: {
        email: 'student@test.com'
      }
    })
    
    if (!student) {
      console.log('❌ Student not found')
      return
    }
    
    console.log(`✅ Found student: ${student.name} (${student.email}) - ID: ${student.id}`)
    
    // Get an enrolled course
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id
      },
      include: {
        course: true
      }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollments found for student')
      return
    }
    
    console.log(`✅ Found enrollment: ${enrollment.course.title} (ID: ${enrollment.courseId})`)
    
    // Simulate the API call that the frontend would make
    console.log('🔍 Simulating enrollment API call...')
    
    // Note: In a real scenario, we would make an actual HTTP request to the API
    // But for this test, we'll directly call the Prisma query that the API uses
    
    const result = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: enrollment.courseId
        }
      },
      select: {
        id: true,
        courseId: true,
        progress: true,
        enrolledAt: true,
        updatedAt: true
      }
    })
    
    console.log('✅ Enrollment API query result:', result)
    
    // Count completed lessons
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        studentId: student.id,
        lesson: {
          courseId: enrollment.courseId
        },
        completed: true
      }
    })
    
    console.log(`✅ Completed lessons: ${completedLessons}`)
    
    console.log('✅ Enrollment API test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing enrollment API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEnrollmentAPI()