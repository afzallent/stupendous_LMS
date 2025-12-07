#!/usr/bin/env pwsh
# Stop both Django backend and Next.js frontend servers

Write-Host "Stopping LMS Servers..." -ForegroundColor Cyan
Write-Host ""

# Try to read job IDs from file
$jobsFile = ".server-jobs.json"
$stoppedCount = 0

if (Test-Path $jobsFile) {
    try {
        $jobs = Get-Content $jobsFile | ConvertFrom-Json
        
        # Stop Django job
        if ($jobs.DjangoJobId) {
            $djangoJob = Get-Job -Id $jobs.DjangoJobId -ErrorAction SilentlyContinue
            if ($djangoJob) {
                Write-Host "Stopping Django server (Job $($jobs.DjangoJobId))..." -ForegroundColor Yellow
                Stop-Job -Id $jobs.DjangoJobId
                Remove-Job -Id $jobs.DjangoJobId -Force
                $stoppedCount++
            }
        }
        
        # Stop Next.js job
        if ($jobs.NextJobId) {
            $nextJob = Get-Job -Id $jobs.NextJobId -ErrorAction SilentlyContinue
            if ($nextJob) {
                Write-Host "Stopping Next.js server (Job $($jobs.NextJobId))..." -ForegroundColor Yellow
                Stop-Job -Id $jobs.NextJobId
                Remove-Job -Id $jobs.NextJobId -Force
                $stoppedCount++
            }
        }
        
        # Remove the jobs file
        Remove-Item $jobsFile -Force
    } catch {
        Write-Host "Could not read job IDs from file" -ForegroundColor Yellow
    }
}

# Also try to stop any running jobs
$allJobs = Get-Job -ErrorAction SilentlyContinue
if ($allJobs) {
    Write-Host "Cleaning up any remaining background jobs..." -ForegroundColor Yellow
    $allJobs | Stop-Job
    $allJobs | Remove-Job -Force
    $stoppedCount += $allJobs.Count
}

# Kill processes by port (fallback)
Write-Host "Checking for processes on ports 3000 and 8000..." -ForegroundColor Yellow

# Kill process on port 3000 (Next.js)
try {
    $nextProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($nextProcess) {
        Write-Host "Killing Next.js process (PID: $nextProcess)..." -ForegroundColor Yellow
        Stop-Process -Id $nextProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        # Use taskkill as fallback
        taskkill /PID $nextProcess /F /T 2>$null
        $stoppedCount++
    }
} catch {
    Write-Host "Error killing Next.js process: $_" -ForegroundColor Yellow
}

# Kill process on port 8000 (Django)
try {
    $djangoProcess = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($djangoProcess) {
        Write-Host "Killing Django process (PID: $djangoProcess)..." -ForegroundColor Yellow
        Stop-Process -Id $djangoProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        # Use taskkill as fallback
        taskkill /PID $djangoProcess /F /T 2>$null
        $stoppedCount++
    }
} catch {
    Write-Host "Error killing Django process: $_" -ForegroundColor Yellow
}

# Kill any node processes (Next.js)
Write-Host "Killing any remaining node processes..." -ForegroundColor Yellow
taskkill /IM node.exe /F /T 2>$null
$stoppedCount++

Write-Host ""
if ($stoppedCount -gt 0) {
    Write-Host "Servers stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "No running servers found" -ForegroundColor Gray
}
Write-Host ""
