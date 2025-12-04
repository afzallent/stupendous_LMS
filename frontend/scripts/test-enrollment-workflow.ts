import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testEnrollmentWorkflow() {
  try {
    console.log('🔍 Testing correct enrollment workflow...')
    
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
    
    // Get any published course
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
    
    // Check if student is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: course.id
        }
      }
    })
    
    if (existingEnrollment) {
      console.log(`⚠️ Student is already enrolled in this course`)
      return
    }
    
    // Create enrollment for the student
    console.log('🔍 Creating enrollment for student...')
    
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
    
    // Verify the enrollment appears in the student's dashboard
    console.log('🔍 Verifying enrollment in student dashboard...')
    
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'ACTIVE'
      },
      include: {
        course: {
          include: {
            trainer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })
    
    console.log(`✅ Student has ${studentEnrollments.length} active enrollments:`)
    studentEnrollments.forEach(enrollment => {
      console.log(`  - ${enrollment.course.title} by ${enrollment.course.trainer.name}`)
    })
    
  } catch (error) {
    console.error('❌ Error testing enrollment workflow:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEnrollmentWorkflow()