#!/usr/bin/env node

/**
 * Script to test certificate generation functionality
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Testing certificate functionality...\n')
    
    // Get or create a sample user
    let user = await prisma.user.findFirst({
      where: {
        role: 'STUDENT'
      }
    })
    
    if (!user) {
      console.log('📝 Creating a student user...')
      user = await prisma.user.create({
        data: {
          email: 'test.student@example.com',
          name: 'Test Student',
          password: 'password',
          role: 'STUDENT',
          bio: 'Test student for certificate functionality'
        }
      })
      console.log(`✅ Student user created: ${user.name} (${user.email})`)
    } else {
      console.log(`👨‍🎓 Student: ${user.name} (${user.email})`)
    }
    
    // Get or create a sample instructor
    let instructor = await prisma.user.findFirst({
      where: {
        role: 'TRAINER'
      }
    })
    
    if (!instructor) {
      console.log('📝 Creating an instructor user...')
      instructor = await prisma.user.create({
        data: {
          email: 'test.instructor@example.com',
          name: 'Test Instructor',
          password: 'password',
          role: 'TRAINER',
          bio: 'Test instructor for certificate functionality'
        }
      })
      console.log(`✅ Instructor user created: ${instructor.name} (${instructor.email})`)
    }
    
    // Get or create a category
    let category = await prisma.category.findFirst()
    
    if (!category) {
      console.log('📝 Creating a category...')
      category = await prisma.category.create({
        data: {
          name: 'Web Development',
          description: 'Test category for certificate functionality',
          icon: '💻'
        }
      })
      console.log(`✅ Category created: ${category.name}`)
    }
    
    // Get or create a sample course
    let course = await prisma.course.findFirst({
      include: {
        trainer: true
      }
    })
    
    if (!course) {
      console.log('📝 Creating a course...')
      course = await prisma.course.create({
        data: {
          title: 'Test Course for Certificates',
          description: 'A test course to verify certificate functionality',
          price: 0,
          status: 'PUBLISHED',
          level: 'BEGINNER',
          trainerId: instructor.id,
          categoryId: category.id
        },
        include: {
          trainer: true
        }
      })
      console.log(`✅ Course created: ${course.title}`)
    }
    
    console.log(`📚 Course: ${course.title}`)
    console.log(`👨‍🏫 Instructor: ${course.trainer.name}\n`)
    
    // Create or update a sample enrollment
    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: course.id
        }
      },
      update: {
        progress: 100,
        completedAt: new Date()
      },
      create: {
        studentId: user.id,
        courseId: course.id,
        progress: 100,
        completedAt: new Date()
      }
    })

    console.log(`✅ Enrollment created/updated with 100% progress`)
    
    // Test certificate generation
    console.log('\n🧪 Testing certificate generation...')
    
    const response = await fetch('http://localhost:3000/api/certificates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        courseId: course.id
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.log(`❌ Certificate generation failed: ${error}`)
      return
    }
    
    const result = await response.json()
    console.log(`✅ Certificate generated successfully!`)
    console.log(`🔗 Certificate ID: ${result.data.certificateId}`)
    console.log(`🌐 Certificate URL: ${result.data.certificateUrl}`)
    
    // Test certificate verification
    console.log('\n🔍 Testing certificate verification...')
    
    const verifyResponse = await fetch(`http://localhost:3000/api/certificates/verify?certificateId=${result.data.certificateId}`)
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.text()
      console.log(`❌ Certificate verification failed: ${error}`)
      return
    }
    
    const verifyResult = await verifyResponse.json()
    console.log(`✅ Certificate verified successfully!`)
    console.log(`📄 Valid: ${verifyResult.valid}`)
    if (verifyResult.certificate) {
      console.log(`👤 Student: ${verifyResult.certificate.studentName}`)
      console.log(`📚 Course: ${verifyResult.certificate.courseTitle}`)
    }
    
    console.log('\n🎉 Certificate functionality test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()