#!/usr/bin/env pwsh
# Check the status of Django backend and Next.js frontend servers

Write-Host "🔍 Checking LMS Server Status..." -ForegroundColor Cyan
Write-Host ""

# Check Django (port 8000)
Write-Host "Django Backend (port 8000):" -ForegroundColor Yellow
$djangoProcess = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($djangoProcess) {
    $pid = $djangoProcess.OwningProcess | Select-Object -First 1
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    Write-Host "  ✅ Running (PID: $pid, Process: $($process.ProcessName))" -ForegroundColor Green
    
    # Try to check if it's responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✅ Responding (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Not responding" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Not running" -ForegroundColor Red
}

Write-Host ""

# Check Next.js (port 3000)
Write-Host "Next.js Frontend (port 3000):" -ForegroundColor Yellow
$nextProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($nextProcess) {
    $pid = $nextProcess.OwningProcess | Select-Object -First 1
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    Write-Host "  ✅ Running (PID: $pid, Process: $($process.ProcessName))" -ForegroundColor Green
    
    # Try to check if it's responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ✅ Responding (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Not responding" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Not running" -ForegroundColor Red
}

Write-Host ""

# Check background jobs
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    Write-Host "Background Jobs:" -ForegroundColor Yellow
    $jobs | Format-Table Id, Name, State, HasMoreData -AutoSize
} else {
    Write-Host "No background jobs found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   - Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   - Admin:    http://localhost:8000/admin" -ForegroundColor White
Write-Host ""
