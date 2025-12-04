import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Web Development' },
      update: {},
      create: {
        name: 'Web Development',
        description: 'Learn to build modern web applications',
        icon: '💻'
      }
    }),
    prisma.category.upsert({
      where: { name: 'Data Science' },
      update: {},
      create: {
        name: 'Data Science',
        description: 'Master data analysis and machine learning',
        icon: '📊'
      }
    }),
    prisma.category.upsert({
      where: { name: 'Design' },
      update: {},
      create: {
        name: 'Design',
        description: 'UI/UX design and visual creativity',
        icon: '🎨'
      }
    }),
    prisma.category.upsert({
      where: { name: 'Business' },
      update: {},
      create: {
        name: 'Business',
        description: 'Business skills and entrepreneurship',
        icon: '💼'
      }
    }),
    prisma.category.upsert({
      where: { name: 'Marketing' },
      update: {},
      create: {
        name: 'Marketing',
        description: 'Digital marketing and growth strategies',
        icon: '📈'
      }
    }),
    prisma.category.upsert({
      where: { name: 'Photography' },
      update: {},
      create: {
        name: 'Photography',
        description: 'Photography skills and techniques',
        icon: '📷'
      }
    })
  ])

  // Create users (instructors)
  const instructors = await Promise.all([
    prisma.user.upsert({
      where: { email: 'sarah.chen@example.com' },
      update: {},
      create: {
        email: 'sarah.chen@example.com',
        name: 'Dr. Sarah Chen',
        role: 'TRAINER',
        bio: 'Full-stack developer with 10+ years of experience in web development'
      }
    }),
    prisma.user.upsert({
      where: { email: 'michael.rodriguez@example.com' },
      update: {},
      create: {
        email: 'michael.rodriguez@example.com',
        name: 'Prof. Michael Rodriguez',
        role: 'TRAINER',
        bio: 'Data scientist and machine learning expert'
      }
    }),
    prisma.user.upsert({
      where: { email: 'emily.johnson@example.com' },
      update: {},
      create: {
        email: 'emily.johnson@example.com',
        name: 'Emily Johnson',
        role: 'TRAINER',
        bio: 'UI/UX designer with passion for creating beautiful user experiences'
      }
    }),
    prisma.user.upsert({
      where: { email: 'alex.thompson@example.com' },
      update: {},
      create: {
        email: 'alex.thompson@example.com',
        name: 'Alex Thompson',
        role: 'TRAINER',
        bio: 'React specialist and frontend architect'
      }
    }),
    prisma.user.upsert({
      where: { email: 'maria.garcia@example.com' },
      update: {},
      create: {
        email: 'maria.garcia@example.com',
        name: 'Maria Garcia',
        role: 'TRAINER',
        bio: 'Digital marketing expert and growth strategist'
      }
    }),
    prisma.user.upsert({
      where: { email: 'james.wilson@example.com' },
      update: {},
      create: {
        email: 'james.wilson@example.com',
        name: 'Dr. James Wilson',
        role: 'TRAINER',
        bio: 'Python expert and data analysis specialist'
      }
    })
  ])

  // Create students
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: 'student1@example.com' },
      update: {},
      create: {
        email: 'student1@example.com',
        name: 'John Doe',
        role: 'STUDENT'
      }
    }),
    prisma.user.upsert({
      where: { email: 'student2@example.com' },
      update: {},
      create: {
        email: 'student2@example.com',
        name: 'Jane Smith',
        role: 'STUDENT'
      }
    })
  ])

  // Create courses
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        title: 'Complete Web Development Bootcamp',
        description: 'Learn HTML, CSS, JavaScript, React, Node.js and more in this comprehensive course',
        price: 89.99,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        trainerId: instructors[0].id,
        categoryId: categories[0].id
      }
    }),
    prisma.course.create({
      data: {
        title: 'Data Science and Machine Learning',
        description: 'Master Python, pandas, scikit-learn, and deep learning with TensorFlow',
        price: 129.99,
        level: 'INTERMEDIATE',
        status: 'PUBLISHED',
        trainerId: instructors[1].id,
        categoryId: categories[1].id
      }
    }),
    prisma.course.create({
      data: {
        title: 'UI/UX Design Masterclass',
        description: 'Create stunning user interfaces and experiences with Figma and design principles',
        price: 79.99,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        trainerId: instructors[2].id,
        categoryId: categories[2].id
      }
    }),
    prisma.course.create({
      data: {
        title: 'Advanced React and Redux',
        description: 'Build scalable applications with React hooks, context API, and Redux toolkit',
        price: 99.99,
        level: 'ADVANCED',
        status: 'PUBLISHED',
        trainerId: instructors[3].id,
        categoryId: categories[0].id
      }
    }),
    prisma.course.create({
      data: {
        title: 'Digital Marketing Strategy',
        description: 'Learn SEO, social media marketing, content marketing, and paid advertising',
        price: 69.99,
        level: 'BEGINNER',
        status: 'PUBLISHED',
        trainerId: instructors[4].id,
        categoryId: categories[4].id
      }
    }),
    prisma.course.create({
      data: {
        title: 'Python for Data Analysis',
        description: 'Master data manipulation, visualization, and analysis with Python and pandas',
        price: 89.99,
        level: 'INTERMEDIATE',
        status: 'PUBLISHED',
        trainerId: instructors[5].id,
        categoryId: categories[1].id
      }
    })
  ])

  // Create enrollments
  const enrollments = await Promise.all([
    prisma.enrollment.create({
      data: {
        studentId: students[0].id,
        courseId: courses[0].id,
        status: 'ACTIVE',
        progress: 75
      }
    }),
    prisma.enrollment.create({
      data: {
        studentId: students[0].id,
        courseId: courses[1].id,
        status: 'ACTIVE',
        progress: 45
      }
    }),
    prisma.enrollment.create({
      data: {
        studentId: students[1].id,
        courseId: courses[1].id,
        status: 'ACTIVE',
        progress: 60
      }
    }),
    prisma.enrollment.create({
      data: {
        studentId: students[1].id,
        courseId: courses[5].id,
        status: 'ACTIVE',
        progress: 30
      }
    })
  ])

  // Create reviews
  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        rating: 5,
        comment: 'Excellent course! Very comprehensive and well-structured.',
        studentId: students[0].id,
        courseId: courses[0].id
      }
    }),
    prisma.review.create({
      data: {
        rating: 4,
        comment: 'Great content, but could use more practical examples.',
        studentId: students[0].id,
        courseId: courses[1].id
      }
    }),
    prisma.review.create({
      data: {
        rating: 5,
        comment: 'Amazing instructor! Learned so much.',
        studentId: students[1].id,
        courseId: courses[1].id
      }
    }),
    prisma.review.create({
      data: {
        rating: 4,
        comment: 'Good course, very informative.',
        studentId: students[1].id,
        courseId: courses[5].id
      }
    })
  ])

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${categories.length} categories`)
  console.log(`Created ${instructors.length} instructors`)
  console.log(`Created ${students.length} students`)
  console.log(`Created ${courses.length} courses`)
  console.log(`Created ${enrollments.length} enrollments`)
  console.log(`Created ${reviews.length} reviews`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })