import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_SEED_PASSWORD = 'password'
const DEFAULT_SEED_PASSWORD_SALT_ROUNDS = 12

async function main() {
    console.log('🌱 Seeding database...')

    // Create categories
    const webDevCategory = await prisma.category.upsert({
        where: { name: 'Web Development' },
        update: {},
        create: {
            name: 'Web Development',
            description: 'Learn modern web development technologies',
            icon: '💻'
        }
    })

    const dataCategory = await prisma.category.upsert({
        where: { name: 'Data Science' },
        update: {},
        create: {
            name: 'Data Science',
            description: 'Master data analysis and machine learning',
            icon: '📊'
        }
    })

    const designCategory = await prisma.category.upsert({
        where: { name: 'Design' },
        update: {},
        create: {
            name: 'Design',
            description: 'Create beautiful and functional designs',
            icon: '🎨'
        }
    })

    // Create users
    const student = await prisma.user.upsert({
        where: { email: 'student@example.com' },
        update: {},
        create: {
            email: 'student@example.com',
            name: 'John Student',
            password: 'password', // In real app, this would be hashed
            role: 'STUDENT',
            bio: 'Passionate learner interested in web development'
        }
    })

    const instructor1 = await prisma.user.upsert({
        where: { email: 'instructor@example.com' },
        update: {},
        create: {
            email: 'instructor@example.com',
            name: 'Jane Instructor',
            password: 'password',
            role: 'TRAINER',
            bio: 'Senior developer with 10+ years of experience'
        }
    })

    const instructor2 = await prisma.user.upsert({
        where: { email: 'john.smith@example.com' },
        update: {},
        create: {
            email: 'john.smith@example.com',
            name: 'John Smith',
            password: 'password',
            role: 'TRAINER',
            bio: 'React specialist and full-stack developer'
        }
    })

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: 'password',
            role: 'ADMIN',
            bio: 'System administrator'
        }
    })

    // Create courses
    const reactCourse = await prisma.course.upsert({
        where: { id: 'react-course-1' },
        update: {},
        create: {
            id: 'react-course-1',
            title: 'Complete React Development Course',
            description: 'Master React from basics to advanced concepts including hooks, context, and modern patterns.',
            price: 99.99,
            status: 'PUBLISHED',
            level: 'INTERMEDIATE',
            trainerId: instructor2.id,
            categoryId: webDevCategory.id
        }
    })

    const jsCourse = await prisma.course.upsert({
        where: { id: 'js-fundamentals-1' },
        update: {},
        create: {
            id: 'js-fundamentals-1',
            title: 'JavaScript Fundamentals',
            description: 'Learn JavaScript from scratch with hands-on projects and real-world examples.',
            price: 79.99,
            status: 'PUBLISHED',
            level: 'BEGINNER',
            trainerId: instructor1.id,
            categoryId: webDevCategory.id
        }
    })

    const designCourse = await prisma.course.upsert({
        where: { id: 'ui-ux-design-1' },
        update: {},
        create: {
            id: 'ui-ux-design-1',
            title: 'UI/UX Design Principles',
            description: 'Create beautiful and user-friendly interfaces with modern design principles.',
            price: 89.99,
            status: 'PUBLISHED',
            level: 'BEGINNER',
            trainerId: instructor1.id,
            categoryId: designCategory.id
        }
    })

    // Create chapters and lessons for React course
    const reactChapter1 = await prisma.chapter.upsert({
        where: { id: 'react-ch1' },
        update: {},
        create: {
            id: 'react-ch1',
            title: 'Getting Started with React',
            order: 1,
            courseId: reactCourse.id
        }
    })

    const reactChapter2 = await prisma.chapter.upsert({
        where: { id: 'react-ch2' },
        update: {},
        create: {
            id: 'react-ch2',
            title: 'Advanced React Concepts',
            order: 2,
            courseId: reactCourse.id
        }
    })

    // Create chapters and lessons for JavaScript Fundamentals course
    const jsChapter1 = await prisma.chapter.upsert({
        where: { id: 'js-ch1' },
        update: {},
        create: {
            id: 'js-ch1',
            title: 'JavaScript Basics',
            order: 1,
            courseId: jsCourse.id
        }
    })

    const jsChapter2 = await prisma.chapter.upsert({
        where: { id: 'js-ch2' },
        update: {},
        create: {
            id: 'js-ch2',
            title: 'Functions and Objects',
            order: 2,
            courseId: jsCourse.id
        }
    })

    const jsChapter3 = await prisma.chapter.upsert({
        where: { id: 'js-ch3' },
        update: {},
        create: {
            id: 'js-ch3',
            title: 'DOM Manipulation',
            order: 3,
            courseId: jsCourse.id
        }
    })

    // Create lessons
    const lessons = [
        // React lessons
        {
            id: 'react-lesson-1',
            title: 'Introduction to React',
            description: 'Learn what React is and why it\'s popular',
            duration: 1200, // 20 minutes
            order: 1,
            chapterId: reactChapter1.id,
            courseId: reactCourse.id
        },
        {
            id: 'react-lesson-2',
            title: 'Setting up Development Environment',
            description: 'Install Node.js, npm, and create your first React app',
            duration: 1800, // 30 minutes
            order: 2,
            chapterId: reactChapter1.id,
            courseId: reactCourse.id
        },
        {
            id: 'react-lesson-17',
            title: 'Advanced State Management with Redux',
            description: 'Learn Redux for complex state management',
            duration: 2400, // 40 minutes
            order: 17,
            chapterId: reactChapter2.id,
            courseId: reactCourse.id
        },
        // JavaScript Fundamentals lessons
        {
            id: 'js-lesson-1',
            title: 'Introduction to JavaScript',
            description: 'What is JavaScript and why is it important?',
            duration: 900, // 15 minutes
            order: 1,
            chapterId: jsChapter1.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-2',
            title: 'Variables and Data Types',
            description: 'Learn about var, let, const and JavaScript data types',
            duration: 1200, // 20 minutes
            order: 2,
            chapterId: jsChapter1.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-3',
            title: 'Operators and Expressions',
            description: 'Mathematical and logical operators in JavaScript',
            duration: 1000, // 16 minutes
            order: 3,
            chapterId: jsChapter1.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-4',
            title: 'Control Flow: If Statements',
            description: 'Making decisions with if, else if, and else',
            duration: 1100, // 18 minutes
            order: 4,
            chapterId: jsChapter1.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-5',
            title: 'Loops: For and While',
            description: 'Repeating code with for and while loops',
            duration: 1300, // 21 minutes
            order: 5,
            chapterId: jsChapter1.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-6',
            title: 'Functions Basics',
            description: 'Creating and calling functions',
            duration: 1500, // 25 minutes
            order: 1,
            chapterId: jsChapter2.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-7',
            title: 'Function Parameters and Return Values',
            description: 'Passing data to functions and getting results back',
            duration: 1400, // 23 minutes
            order: 2,
            chapterId: jsChapter2.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-8',
            title: 'Arrow Functions',
            description: 'Modern function syntax with arrow functions',
            duration: 1000, // 16 minutes
            order: 3,
            chapterId: jsChapter2.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-9',
            title: 'Objects and Properties',
            description: 'Creating and working with JavaScript objects',
            duration: 1600, // 26 minutes
            order: 4,
            chapterId: jsChapter2.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-10',
            title: 'Arrays and Array Methods',
            description: 'Storing and manipulating lists of data',
            duration: 1800, // 30 minutes
            order: 5,
            chapterId: jsChapter2.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-11',
            title: 'Introduction to the DOM',
            description: 'Understanding the Document Object Model',
            duration: 1200, // 20 minutes
            order: 1,
            chapterId: jsChapter3.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-12',
            title: 'Selecting Elements',
            description: 'Finding elements with querySelector and getElementById',
            duration: 1400, // 23 minutes
            order: 2,
            chapterId: jsChapter3.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-13',
            title: 'Changing Element Content',
            description: 'Modifying text and HTML content',
            duration: 1300, // 21 minutes
            order: 3,
            chapterId: jsChapter3.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-14',
            title: 'Event Handling',
            description: 'Responding to user clicks and interactions',
            duration: 1700, // 28 minutes
            order: 4,
            chapterId: jsChapter3.id,
            courseId: jsCourse.id
        },
        {
            id: 'js-lesson-15',
            title: 'Building Your First Interactive Project',
            description: 'Create a simple calculator using JavaScript',
            duration: 2400, // 40 minutes
            order: 5,
            chapterId: jsChapter3.id,
            courseId: jsCourse.id
        }
    ]

    for (const lesson of lessons) {
        await prisma.lesson.upsert({
            where: { id: lesson.id },
            update: {},
            create: lesson
        })
    }

    // Create enrollments for student
    const enrollment1 = await prisma.enrollment.upsert({
        where: {
            studentId_courseId: {
                studentId: student.id,
                courseId: reactCourse.id
            }
        },
        update: {},
        create: {
            studentId: student.id,
            courseId: reactCourse.id,
            progress: 65,
            status: 'ACTIVE'
        }
    })

    const enrollment2 = await prisma.enrollment.upsert({
        where: {
            studentId_courseId: {
                studentId: student.id,
                courseId: jsCourse.id
            }
        },
        update: {},
        create: {
            studentId: student.id,
            courseId: jsCourse.id,
            progress: 90,
            status: 'ACTIVE'
        }
    })

    const enrollment3 = await prisma.enrollment.upsert({
        where: {
            studentId_courseId: {
                studentId: student.id,
                courseId: designCourse.id
            }
        },
        update: {},
        create: {
            studentId: student.id,
            courseId: designCourse.id,
            progress: 30,
            status: 'ACTIVE'
        }
    })

    // Create progress records
    await prisma.progress.upsert({
        where: {
            studentId_lessonId: {
                studentId: student.id,
                lessonId: 'react-lesson-1'
            }
        },
        update: {},
        create: {
            studentId: student.id,
            lessonId: 'react-lesson-1',
            enrollmentId: enrollment1.id,
            completed: true,
            watchTime: 1200
        }
    })

    await prisma.progress.upsert({
        where: {
            studentId_lessonId: {
                studentId: student.id,
                lessonId: 'react-lesson-2'
            }
        },
        update: {},
        create: {
            studentId: student.id,
            lessonId: 'react-lesson-2',
            enrollmentId: enrollment1.id,
            completed: true,
            watchTime: 1800
        }
    })

    console.log('✅ Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

