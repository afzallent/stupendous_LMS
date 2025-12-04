import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPayments() {
  try {
    console.log('🔍 Checking payments...')
    
    // Get all payments
    const payments = await prisma.payment.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (payments.length === 0) {
      console.log('No payments found in the database')
    } else {
      console.log(`Found ${payments.length} payments:`)
      payments.forEach(payment => {
        console.log(`  - ${payment.student.name} (${payment.student.email}) paid ${payment.amount} ${payment.currency} for "${payment.course.title}" - Status: ${payment.status}`)
      })
    }
    
  } catch (error) {
    console.error('Error checking payments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPayments()