import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * GET - Verify a certificate by ID
 * Query params: certificateId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const certificateId = searchParams.get("certificateId")

    if (!certificateId) {
      return NextResponse.json(
        { valid: false, error: "Certificate ID is required" },
        { status: 400 }
      )
    }

    const certificate = await prisma.certificate.findUnique({
      where: { certificateId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      }
    })

    if (!certificate) {
      return NextResponse.json(
        { valid: false, error: "Certificate not found" },
        { status: 404 }
      )
    }

    if (certificate.revoked) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "Certificate has been revoked",
          revokedAt: certificate.revokedAt,
          revocationReason: certificate.revocationReason
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        id: certificate.certificateId,
        studentName: certificate.user.name,
        courseTitle: certificate.course.title,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt
      }
    })

  } catch (error) {
    console.error("Certificate verification error:", error)
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}