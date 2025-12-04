#!/usr/bin/env node

/**
 * Direct test of certificate service functionality using ES modules
 */

// Use dynamic import for ES modules
async function main() {
  try {
    console.log('🔍 Testing certificate service directly with ES modules...\n')
    
    const { CertificateService } = await import('../src/lib/certificate-service.ts')
    
    // Test certificate generation
    console.log('🧪 Generating certificate PDF...')
    
    const pdfBuffer = await CertificateService.generateCertificatePDF(
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
    const certificateUrl = await CertificateService.saveCertificateToFile(pdfBuffer, fileName)
    
    console.log(`✅ Certificate saved successfully!`)
    console.log(`🔗 Certificate URL: ${certificateUrl}`)
    
    console.log('\n🎉 Direct certificate service test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main()