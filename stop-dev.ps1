# Stop Development Servers (Django + Astro)
Write-Host "Stopping CourseCompass LMS Development Servers..." -ForegroundColor Cyan

# Stop Django server (Python processes running manage.py runserver)
$djangoProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*manage.py*runserver*" }
if ($djangoProcesses) {
    Write-Host "Stopping Django server..." -ForegroundColor Yellow
    $djangoProcesses | ForEach-Object {
        Stop-Process -Id $_.Id -Force
        Write-Host "  Stopped Django process (PID: $($_.Id))" -ForegroundColor Green
    }
} else {
    Write-Host "Django server is not running" -ForegroundColor Gray
}

# Stop Astro server (Node processes running astro dev)
$astroProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*astro*dev*" }
if ($astroProcesses) {
    Write-Host "Stopping Astro server..." -ForegroundColor Yellow
    $astroProcesses | ForEach-Object {
        Stop-Process -Id $_.Id -Force
        Write-Host "  Stopped Astro process (PID: $($_.Id))" -ForegroundColor Green
    }
} else {
    Write-Host "Astro server is not running" -ForegroundColor Gray
}

# Also stop any PowerShell windows that might be hosting these servers
$psWindows = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { 
    $_.MainWindowTitle -like "*manage.py*" -or $_.MainWindowTitle -like "*npm*" 
}
if ($psWindows) {
    Write-Host "Stopping server terminal windows..." -ForegroundColor Yellow
    $psWindows | ForEach-Object {
        Stop-Process -Id $_.Id -Force
    }
}

Write-Host ""
Write-Host "All development servers stopped" -ForegroundColor Green
