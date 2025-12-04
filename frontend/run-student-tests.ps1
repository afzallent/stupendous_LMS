# Student Journey Tests - PowerShell Runner

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Student Journey Tests - Headed Mode  " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Starting tests with visible Chrome browser..." -ForegroundColor Green
Write-Host ""

# Create screenshots directory if it doesn't exist
if (!(Test-Path -Path "screenshots")) {
    New-Item -ItemType Directory -Path "screenshots" | Out-Null
    Write-Host "📁 Created screenshots directory" -ForegroundColor Blue
}

# Set environment variable for headed mode
$env:JEST_PUPPETEER_CONFIG = "tests/jest-puppeteer-headed.config.js"

Write-Host "📋 Test Configuration:" -ForegroundColor Cyan
Write-Host "  - Mode: Headed (visible browser)"
Write-Host "  - Browser: Chrome"
Write-Host "  - Window Size: 1920x1080"
Write-Host "  - Screenshots: Enabled"
Write-Host ""

# Run the tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
& npx jest tests/student-journey.test.js --config=tests/jest.config.js --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ All tests passed successfully!    " -ForegroundColor Green
    Write-Host "  📸 Check screenshots folder          " -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ Tests failed! Check output above. " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")