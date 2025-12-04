#!/usr/bin/env node

/**
 * Simple test of PDFKit functionality
 */

const PDFDocument = require('pdfkit')
const { createWriteStream, existsSync, mkdirSync } = require('fs')
const { join } = require('path')

async function main() {
  try {
    console.log('🔍 Testing PDFKit directly...\n')
    
    // Test PDF generation
    console.log('🧪 Generating simple PDF...')
    
    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4"
    })

    const chunks = []
    
    doc.on("data", (chunk) => chunks.push(chunk))
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks)
      console.log(`✅ PDF generated successfully!`)
      console.log(`📄 PDF size: ${buffer.length} bytes`)
      
      // Test saving PDF to file
      console.log('\n💾 Saving PDF to file...')
      
      // Ensure certificates directory exists
      const certificatesDir = join(process.cwd(), "public", "certificates")
      if (!existsSync(certificatesDir)) {
        mkdirSync(certificatesDir, { recursive: true })
      }

      const fileName = `TEST-PDF-${Date.now()}.pdf`
      const filePath = join(certificatesDir, fileName)
      
      const writeStream = createWriteStream(filePath)
      writeStream.on("finish", () => {
        console.log(`✅ PDF saved successfully!`)
        console.log(`🔗 File path: ${filePath}`)
        console.log('\n🎉 Simple PDF test completed successfully!')
      })
      writeStream.on("error", (err) => {
        console.error('❌ Error saving PDF:', err)
      })
      
      writeStream.write(buffer)
      writeStream.end()
    })

    // Add some content to the PDF
    doc.text('Hello, World!', 100, 100)
    doc.end()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main()