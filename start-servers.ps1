#!/usr/bin/env pwsh
# Start both Django backend and Next.js frontend servers

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting LMS Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "$ScriptDir\venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create it first: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Start Django backend
Write-Host "Starting Django backend server (port 8000)..." -ForegroundColor Green
$djangoJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir
    & "venv\Scripts\python.exe" "backend\manage.py" "runserver"
}

# Wait a moment for Django to start
Start-Sleep -Seconds 3

# Start Next.js frontend
Write-Host "Starting Next.js frontend server (port 4000)..." -ForegroundColor Green
$nextJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir
    Set-Location "frontend"
    npm run dev
}

Write-Host ""
Write-Host "Servers started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Server URLs:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:4000" -ForegroundColor White
Write-Host "   - Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   - Admin:    http://localhost:8000/admin" -ForegroundColor White
Write-Host ""
Write-Host "Job IDs:" -ForegroundColor Cyan
Write-Host "   - Django:  $($djangoJob.Id)" -ForegroundColor White
Write-Host "   - Next.js: $($nextJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "To stop servers, run: .\stop-servers.ps1" -ForegroundColor Yellow
Write-Host "To view logs, run: Get-Job | Receive-Job" -ForegroundColor Yellow
Write-Host ""

# Save job IDs to file for stop script
@{
    DjangoJobId = $djangoJob.Id
    NextJobId = $nextJob.Id
} | ConvertTo-Json | Out-File "$ScriptDir\.server-jobs.json"

Write-Host "Press Ctrl+C to stop monitoring (servers will continue running)" -ForegroundColor Gray
Write-Host ""

# Monitor jobs
try {
    while ($true) {
        $djangoState = (Get-Job -Id $djangoJob.Id).State
        $nextState = (Get-Job -Id $nextJob.Id).State
        
        if ($djangoState -eq "Failed" -or $nextState -eq "Failed") {
            Write-Host "One or more servers failed!" -ForegroundColor Red
            Get-Job | Receive-Job
            break
        }
        
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host ""
    Write-Host "Monitoring stopped. Servers are still running in background." -ForegroundColor Yellow
}
