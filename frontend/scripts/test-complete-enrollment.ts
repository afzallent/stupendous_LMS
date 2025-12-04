import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCompleteEnrollment() {
  try {
    console.log('🔍 Testing complete enrollment process...')
    
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
    
    // Simulate the enrollment API call
    console.log('🔍 Simulating enrollment API call...')
    
    const response = await fetch('http://localhost:3000/api/enrollments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: student.id,
        courseIds: [course.id],
        paymentId: `test_payment_${Date.now()}`,
        paymentMethod: 'stripe',
        amount: course.price
      })
    })
    
    console.log(`Response status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Enrollment API call successful:', data)
    } else {
      const errorText = await response.text()
      console.log(`❌ Enrollment API call failed: ${response.status} - ${errorText}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing enrollment:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCompleteEnrollment()