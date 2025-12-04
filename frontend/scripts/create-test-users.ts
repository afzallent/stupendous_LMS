import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/jwt'

const prisma = new PrismaClient()

async function createTestUsers() {
  try {
    console.log('Creating test users...')
    
    // Hash passwords
    const hashedPassword = await hashPassword('password123')
    
    // Create test users
    const users = [
      {
        name: 'John Student',
        email: 'student@test.com',
        password: hashedPassword,
        role: 'STUDENT'
      },
      {
        name: 'Jane Instructor',
        email: 'instructor@test.com',
        password: hashedPassword,
        role: 'TRAINER'
      },
      {
        name: 'Admin User',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    ]
    
    for (const userData of users) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`)
        continue
      }
      
      const user = await prisma.user.create({
        data: userData as any,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      })
      
      console.log(`Created user: ${user.name} (${user.email}) - ${user.role}`)
    }
    
    console.log('Test users created successfully!')
    console.log('You can now test login with:')
    console.log('- student@test.com / password123')
    console.log('- instructor@test.com / password123 (TRAINER role)') 
    console.log('- admin@test.com / password123')
    
  } catch (error) {
    console.error('Error creating test users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUsers()