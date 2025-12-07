# Restart Development Servers (Django + Astro)
Write-Host "Restarting CourseCompass LMS Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Stop servers
Write-Host "Step 1: Stopping existing servers..." -ForegroundColor Yellow
& "$PSScriptRoot\stop-dev.ps1"

Write-Host ""
Write-Host "Waiting 2 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# Start servers
Write-Host ""
Write-Host "Step 2: Starting servers..." -ForegroundColor Yellow
& "$PSScriptRoot\start-dev.ps1"

Write-Host ""
Write-Host "Restart complete!" -ForegroundColor Green
