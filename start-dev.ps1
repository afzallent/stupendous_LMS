#!/usr/bin/env pwsh
# Interactive script to start development servers

Write-Host "=== LMS Development Server Starter ===" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Ask which servers to start
Write-Host "Which server(s) would you like to start?" -ForegroundColor Yellow
Write-Host "  1. Django backend only (port 8000)"
Write-Host "  2. Next.js frontend only (port 4000)"
Write-Host "  3. Astro frontend only (port 4321)"
Write-Host "  4. Django + Next.js"
Write-Host "  5. Django + Astro"
Write-Host "  6. All servers (Django + Next.js + Astro)"
Write-Host ""
$choice = Read-Host "Enter your choice (1-6)"

$startDjango = $false
$startNextJs = $false
$startAstro = $false

switch ($choice) {
    "1" { $startDjango = $true }
    "2" { $startNextJs = $true }
    "3" { $startAstro = $true }
    "4" { $startDjango = $true; $startNextJs = $true }
    "5" { $startDjango = $true; $startAstro = $true }
    "6" { $startDjango = $true; $startNextJs = $true; $startAstro = $true }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Green
Write-Host ""

$jobs = @()

# Start Django backend
if ($startDjango) {
    if (-not (Test-Path "$ScriptDir\venv\Scripts\python.exe")) {
        Write-Host "Virtual environment not found!" -ForegroundColor Red
        Write-Host "Please create it first: python -m venv venv" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Starting Django backend (port 8000)..." -ForegroundColor Green
    $djangoJob = Start-Job -ScriptBlock {
        Set-Location $using:ScriptDir
        & "venv\Scripts\python.exe" "backend\manage.py" "runserver"
    }
    $jobs += @{ Name = "Django"; Port = 8000; JobId = $djangoJob.Id }
    Start-Sleep -Seconds 2
}

# Start Next.js frontend
if ($startNextJs) {
    if (-not (Test-Path "$ScriptDir\frontend\package.json")) {
        Write-Host "Next.js frontend not found!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Starting Next.js frontend (port 4000)..." -ForegroundColor Green
    $nextJob = Start-Job -ScriptBlock {
        Set-Location $using:ScriptDir
        Set-Location "frontend"
        npm run dev
    }
    $jobs += @{ Name = "Next.js"; Port = 4000; JobId = $nextJob.Id }
    Start-Sleep -Seconds 2
}

# Start Astro frontend
if ($startAstro) {
    if (-not (Test-Path "$ScriptDir\frontend-astro\package.json")) {
        Write-Host "Astro frontend not found!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Starting Astro frontend (port 4321)..." -ForegroundColor Green
    $astroJob = Start-Job -ScriptBlock {
        Set-Location $using:ScriptDir
        Set-Location "frontend-astro"
        npm run dev
    }
    $jobs += @{ Name = "Astro"; Port = 4321; JobId = $astroJob.Id }
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Servers started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Server URLs:" -ForegroundColor Cyan
foreach ($job in $jobs) {
    Write-Host "   - $($job.Name): http://localhost:$($job.Port) (Job ID: $($job.JobId))" -ForegroundColor White
}
if ($startDjango) {
    Write-Host "   - Admin: http://localhost:8000/admin" -ForegroundColor White
}
Write-Host ""
Write-Host "To check server status, run: .\check-dev.ps1" -ForegroundColor Yellow
Write-Host "To stop servers, run: .\stop-dev.ps1" -ForegroundColor Yellow
Write-Host ""

# Save job IDs to file for stop script
$jobs | ConvertTo-Json | Out-File "$ScriptDir\.dev-jobs.json"

Write-Host "Press Ctrl+C to stop monitoring (servers will continue running)" -ForegroundColor Gray
Write-Host ""

# Monitor jobs
try {
    while ($true) {
        $allRunning = $true
        foreach ($job in $jobs) {
            $state = (Get-Job -Id $job.JobId -ErrorAction SilentlyContinue).State
            if ($state -eq "Failed") {
                Write-Host "$($job.Name) server failed!" -ForegroundColor Red
                Get-Job -Id $job.JobId | Receive-Job
                $allRunning = $false
            }
        }
        
        if (-not $allRunning) {
            break
        }
        
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host ""
    Write-Host "Monitoring stopped. Servers are still running in background." -ForegroundColor Yellow
}
