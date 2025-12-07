# Check Development Servers Status
Write-Host "CourseCompass LMS - Server Status Check" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check Django server
Write-Host "Django Backend (Port 8000):" -ForegroundColor Yellow
$djangoProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*manage.py*runserver*" }
if ($djangoProcesses) {
    Write-Host "  Status: RUNNING" -ForegroundColor Green
    $djangoProcesses | ForEach-Object {
        Write-Host "  PID: $($_.Id)" -ForegroundColor Gray
    }
    
    # Test HTTP connection
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/courses/" -Method GET -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  HTTP Status: $($response.StatusCode) OK" -ForegroundColor Green
        Write-Host "  URL: http://localhost:8000" -ForegroundColor Cyan
    } catch {
        Write-Host "  HTTP Status: Cannot connect (server may be starting)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status: NOT RUNNING" -ForegroundColor Red
    Write-Host "  Run 'start-dev.ps1' to start servers" -ForegroundColor Gray
}

Write-Host ""

# Check Astro server
Write-Host "Astro Frontend (Port 4321):" -ForegroundColor Yellow
$astroProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*astro*dev*" }
if ($astroProcesses) {
    Write-Host "  Status: RUNNING" -ForegroundColor Green
    $astroProcesses | ForEach-Object {
        Write-Host "  PID: $($_.Id)" -ForegroundColor Gray
    }
    
    # Test HTTP connection
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4321" -Method GET -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  HTTP Status: $($response.StatusCode) OK" -ForegroundColor Green
        Write-Host "  URL: http://localhost:4321" -ForegroundColor Cyan
    } catch {
        Write-Host "  HTTP Status: Cannot connect (server may be starting)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Status: NOT RUNNING" -ForegroundColor Red
    Write-Host "  Run 'start-dev.ps1' to start servers" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan

# Check for port conflicts
Write-Host ""
Write-Host "Port Usage:" -ForegroundColor Yellow
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
$port4321 = Get-NetTCPConnection -LocalPort 4321 -ErrorAction SilentlyContinue

if ($port8000) {
    Write-Host "  Port 8000: IN USE" -ForegroundColor Green
} else {
    Write-Host "  Port 8000: AVAILABLE" -ForegroundColor Gray
}

if ($port4321) {
    Write-Host "  Port 4321: IN USE" -ForegroundColor Green
} else {
    Write-Host "  Port 4321: AVAILABLE" -ForegroundColor Gray
}

Write-Host ""
