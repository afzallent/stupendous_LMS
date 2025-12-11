#!/usr/bin/env pwsh
# Interactive script to stop development servers

Write-Host "=== LMS Development Server Stopper ===" -ForegroundColor Cyan
Write-Host ""

# Check which ports are in use
$ports = @(
    @{ Name = "Django Backend"; Port = 8000 },
    @{ Name = "Next.js Frontend"; Port = 4000 },
    @{ Name = "Astro Frontend"; Port = 4321 }
)

$runningServers = @()

foreach ($server in $ports) {
    $process = Get-NetTCPConnection -LocalPort $server.Port -ErrorAction SilentlyContinue
    if ($process) {
        $procId = $process.OwningProcess | Select-Object -First 1
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        $runningServers += @{
            Name = $server.Name
            Port = $server.Port
            PID = $procId
            ProcessName = $proc.ProcessName
        }
    }
}

if ($runningServers.Count -eq 0) {
    Write-Host "No development servers are currently running." -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# Display running servers
Write-Host "Running servers:" -ForegroundColor Yellow
for ($i = 0; $i -lt $runningServers.Count; $i++) {
    $server = $runningServers[$i]
    Write-Host "  $($i + 1). $($server.Name) - Port $($server.Port) (PID: $($server.PID))"
}
Write-Host "  $($runningServers.Count + 1). Stop ALL servers"
Write-Host "  0. Cancel"
Write-Host ""

$choice = Read-Host "Enter your choice"

if ($choice -eq "0") {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}

$serversToStop = @()

if ($choice -eq ($runningServers.Count + 1).ToString()) {
    # Stop all servers
    $serversToStop = $runningServers
    Write-Host ""
    Write-Host "Stopping all servers..." -ForegroundColor Yellow
} elseif ([int]$choice -ge 1 -and [int]$choice -le $runningServers.Count) {
    # Stop specific server
    $serversToStop = @($runningServers[[int]$choice - 1])
    Write-Host ""
    Write-Host "Stopping $($serversToStop[0].Name)..." -ForegroundColor Yellow
} else {
    Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Stop background jobs first
$jobsFile = ".dev-jobs.json"
if (Test-Path $jobsFile) {
    try {
        $jobs = Get-Content $jobsFile | ConvertFrom-Json
        foreach ($job in $jobs) {
            $bgJob = Get-Job -Id $job.JobId -ErrorAction SilentlyContinue
            if ($bgJob) {
                Write-Host "Stopping background job for $($job.Name) (Job ID: $($job.JobId))..." -ForegroundColor Yellow
                Stop-Job -Id $job.JobId -ErrorAction SilentlyContinue
                Remove-Job -Id $job.JobId -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item $jobsFile -Force -ErrorAction SilentlyContinue
    } catch {
        # Ignore errors
    }
}

# Stop processes by PID
foreach ($server in $serversToStop) {
    Write-Host "Killing $($server.Name) (PID: $($server.PID))..." -ForegroundColor Yellow
    
    try {
        # Try graceful stop first
        Stop-Process -Id $server.PID -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        
        # Use taskkill as fallback to kill child processes too
        taskkill /PID $server.PID /F /T 2>$null
        
        Write-Host "  $($server.Name) stopped successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Error stopping $($server.Name): $_" -ForegroundColor Red
    }
}

# If stopping all, also kill any remaining node processes
if ($serversToStop.Count -eq $runningServers.Count) {
    Write-Host ""
    Write-Host "Cleaning up any remaining node processes..." -ForegroundColor Yellow
    taskkill /IM node.exe /F /T 2>$null
    
    # Clean up any remaining background jobs
    $allJobs = Get-Job -ErrorAction SilentlyContinue
    if ($allJobs) {
        Write-Host "Cleaning up background jobs..." -ForegroundColor Yellow
        $allJobs | Stop-Job -ErrorAction SilentlyContinue
        $allJobs | Remove-Job -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
