#!/usr/bin/env node

/**
 * File Upload System Validation CLI
 * Run this script to validate the secure file upload system
 * 
 * Usage: node scripts/validate-upload-system.js
 */

import { runSystemValidation, formatValidationReport } from '../src/lib/file-upload-validator.js'

async function main() {
  console.log('🔍 Starting File Upload System Validation...\n')
  
  try {
    const result = await runSystemValidation()
    const report = formatValidationReport(result)
    
    console.log(report)
    
    // Exit with appropriate code
    if (result.overallStatus === 'FAIL') {
      console.log('❌ Validation FAILED - Critical issues detected')
      process.exit(1)
    } else if (result.overallStatus === 'WARNING') {
      console.log('⚠️  Validation completed with WARNINGS - Review issues')
      process.exit(0)
    } else {
      console.log('✅ Validation PASSED - System is secure and ready')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  }
}

main().catch(console.error)