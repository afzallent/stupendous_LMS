import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEnrollment() {
  try {
    console.log('🔍 Testing enrollment creation...')
    
    // Get a test student
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
    
    // Get a published course
    const course = await prisma.course.findFirst({
      where: {
        status: 'PUBLISHED'
      }
    })
    
    if (!course) {
      console.log('❌ No published courses found')
      return
    }
    
    console.log(`✅ Found course: ${course.title} (ID: ${course.id})`)
    
    // Try to create enrollment
    console.log('🔍 Creating enrollment...')
    
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        status: 'ACTIVE',
        progress: 0,
        enrolledAt: new Date()
      },
      include: {
        course: {
          select: {
            title: true
          }
        },
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    console.log(`✅ Enrollment created successfully!`)
    console.log(`  - Student: ${enrollment.student.name} (${enrollment.student.email})`)
    console.log(`  - Course: ${enrollment.course.title}`)
    console.log(`  - Enrollment ID: ${enrollment.id}`)
    
  } catch (error) {
    console.error('❌ Error creating enrollment:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEnrollment()