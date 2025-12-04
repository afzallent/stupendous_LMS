#!/usr/bin/env node

/**
 * JavaScript version of certificate service test
 */

const PDFDocument = require('pdfkit')
const { createWriteStream, existsSync, mkdirSync } = require('fs')
const { join } = require('path')

/**
 * Generate a PDF certificate
 * @param studentName Name of the student
 * @param courseTitle Title of the course
 * @param completionDate Date of completion
 * @param instructorName Name of the instructor
 * @returns Buffer containing the PDF
 */
async function generateCertificatePDF(
  studentName,
  courseTitle,
  completionDate,
  instructorName
) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4"
      })

      const chunks = []
      
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer)
      })
      doc.on("error", (err) => reject(err))

      // Certificate design
      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height)
        .fillColor("#f8fafc")
        .fill()

      // Header
      doc.fillColor("#1e40af")
        .fontSize(36)
        .font("Helvetica-Bold")
        .text("CERTIFICATE", 0, 80, {
          align: "center"
        })

      doc.fillColor("#3b82f6")
        .fontSize(24)
        .font("Helvetica")
        .text("of Completion", 0, 130, {
          align: "center"
        })

      // Decorative elements
      doc.strokeColor("#93c5fd")
        .lineWidth(2)
        .moveTo(100, 170)
        .lineTo(doc.page.width - 100, 170)
        .stroke()

      // Main content
      doc.fillColor("#374151")
        .fontSize(18)
        .font("Helvetica")
        .text("This is to certify that", 0, 200, {
          align: "center"
        })

      doc.fillColor("#1e40af")
        .fontSize(32)
        .font("Helvetica-Bold")
        .text(studentName, 0, 240, {
          align: "center"
        })

      doc.fillColor("#374151")
        .fontSize(18)
        .font("Helvetica")
        .text("has successfully completed the course", 0, 290, {
          align: "center"
        })

      doc.fillColor("#1e40af")
        .fontSize(28)
        .font("Helvetica-Bold")
        .text(courseTitle, 0, 330, {
          align: "center"
        })

      doc.fillColor("#374151")
        .fontSize(16)
        .font("Helvetica")
        .text(
          `Issued on: ${completionDate.toLocaleDateString()}`,
          0,
          390,
          {
            align: "center"
          }
        )

      // Instructor info
      doc.fillColor("#374151")
        .fontSize(14)
        .font("Helvetica")
        .text(`Instructor: ${instructorName}`, 0, 430, {
          align: "center"
        })

      // Signature line
      doc.strokeColor("#93c5fd")
        .lineWidth(1)
        .moveTo(doc.page.width / 2 - 100, 480)
        .lineTo(doc.page.width / 2 + 100, 480)
        .stroke()

      doc.fillColor("#374151")
        .fontSize(12)
        .font("Helvetica")
        .text("Instructor Signature", 0, 490, {
          align: "center"
        })

      // Verification info
      doc.fillColor("#10b981")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Verified by CourseCompass", 0, 520, {
          align: "center"
        })

      // Footer
      doc.fillColor("#9ca3af")
        .fontSize(10)
        .font("Helvetica")
        .text(
          "This certificate is automatically generated and digitally verified.",
          0,
          doc.page.height - 40,
          {
            align: "center"
          }
        )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Save certificate to file system
 * @param buffer PDF buffer
 * @param fileName File name to save as
 * @returns Path to saved file
 */
async function saveCertificateToFile(buffer, fileName) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure certificates directory exists
      const certificatesDir = join(process.cwd(), "public", "certificates")
      if (!existsSync(certificatesDir)) {
        mkdirSync(certificatesDir, { recursive: true })
      }

      const filePath = join(certificatesDir, fileName)
      const writeStream = createWriteStream(filePath)
      
      writeStream.on("finish", () => resolve(`/certificates/${fileName}`))
      writeStream.on("error", reject)
      
      writeStream.write(buffer)
      writeStream.end()
    } catch (error) {
      reject(error)
    }
  })
}

async function main() {
  try {
    console.log('🔍 Testing certificate service directly with JavaScript...\n')
    
    // Test certificate generation
    console.log('🧪 Generating certificate PDF...')
    
    const pdfBuffer = await generateCertificatePDF(
      'John Doe',
      'Complete React Development Course',
      new Date(),
      'Jane Smith'
    )
    
    console.log(`✅ Certificate PDF generated successfully!`)
    console.log(`📄 PDF size: ${pdfBuffer.length} bytes`)
    
    // Test saving certificate to file
    console.log('\n💾 Saving certificate to file...')
    
    const fileName = `TEST-CERT-${Date.now()}.pdf`
    const certificateUrl = await saveCertificateToFile(pdfBuffer, fileName)
    
    console.log(`✅ Certificate saved successfully!`)
    console.log(`🔗 Certificate URL: ${certificateUrl}`)
    
    console.log('\n🎉 Direct certificate service test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main()