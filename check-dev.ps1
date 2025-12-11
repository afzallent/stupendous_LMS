#!/usr/bin/env pwsh
# Check the status of development servers

Write-Host "=== LMS Development Server Status ===" -ForegroundColor Cyan
Write-Host ""

$ports = @(
    @{ Name = "Django Backend"; Port = 8000; Url = "http://localhost:8000" },
    @{ Name = "Next.js Frontend"; Port = 4000; Url = "http://localhost:4000" },
    @{ Name = "Astro Frontend"; Port = 4321; Url = "http://localhost:4321" }
)

$runningCount = 0

foreach ($server in $ports) {
    Write-Host "$($server.Name) - port $($server.Port):" -ForegroundColor Yellow
    
    $process = Get-NetTCPConnection -LocalPort $server.Port -ErrorAction SilentlyContinue
    if ($process) {
        $procId = $process.OwningProcess | Select-Object -First 1
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        Write-Host "  Status: " -NoNewline -ForegroundColor White
        Write-Host "RUNNING" -ForegroundColor Green
        Write-Host "  PID: $procId" -ForegroundColor White
        Write-Host "  Process: $($proc.ProcessName)" -ForegroundColor White
        
        # Try to check if it's responding
        try {
            $response = Invoke-WebRequest -Uri $server.Url -TimeoutSec 2 -ErrorAction Stop
            Write-Host "  Health: " -NoNewline -ForegroundColor White
            Write-Host "RESPONDING (Status: $($response.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "  Health: " -NoNewline -ForegroundColor White
            Write-Host "NOT RESPONDING" -ForegroundColor Yellow
        }
        
        $runningCount++
    } else {
        Write-Host "  Status: " -NoNewline -ForegroundColor White
        Write-Host "NOT RUNNING" -ForegroundColor Red
    }
    Write-Host ""
}

# Summary
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  $runningCount of $($ports.Count) servers running" -ForegroundColor White
Write-Host ""

# Check background jobs
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    Write-Host "Background Jobs:" -ForegroundColor Yellow
    $jobs | Format-Table Id, Name, State, HasMoreData -AutoSize
    Write-Host ""
}

# Show URLs
Write-Host "Server URLs:" -ForegroundColor Cyan
Write-Host "   - Django Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   - Django Admin:    http://localhost:8000/admin" -ForegroundColor White
Write-Host "   - Next.js Frontend: http://localhost:4000" -ForegroundColor White
Write-Host "   - Astro Frontend:   http://localhost:4321" -ForegroundColor White
Write-Host ""
