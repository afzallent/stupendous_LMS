import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { CertificateService } from "@/lib/certificate-service"

const prisma = new PrismaClient()

/**
 * POST - Generate a certificate for a completed course
 * Body: { userId: string, courseId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, courseId } = body

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: "User ID and Course ID are required" },
        { status: 400 }
      )
    }

    // Check if user is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId
        }
      },
      include: {
        student: true,
        course: {
          include: {
            trainer: true
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "User is not enrolled in this course" },
        { status: 404 }
      )
    }

    // Check if user has completed the course (100% progress)
    if (enrollment.progress < 100) {
      return NextResponse.json(
        { error: "Course not completed yet. Complete 100% of the course to get certificate" },
        { status: 400 }
      )
    }

    // Check if certificate already exists
    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    })

    if (existingCertificate) {
      return NextResponse.json({
        success: true,
        data: existingCertificate
      })
    }

    // Generate certificate ID
    const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    // Create PDF certificate using our service
    const pdfBuffer = await CertificateService.generateCertificatePDF(
      enrollment.student.name || "Student",
      enrollment.course.title,
      enrollment.completedAt || new Date(),
      enrollment.course.trainer.name || "Instructor"
    )

    // Save PDF to file system
    const fileName = `${certificateId}.pdf`
    const certificateUrl = await CertificateService.saveCertificateToFile(pdfBuffer, fileName)

    // Save certificate record to database
    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateUrl,
        certificateId,
        issuedAt: new Date(),
        expiresAt: null // Certificates don't expire by default
      }
    })

    return NextResponse.json({
      success: true,
      data: certificate
    })

  } catch (error) {
    console.error("Certificate generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ... existing GET function ...