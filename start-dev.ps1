# Start Development Servers (Django + Astro)
Write-Host "Starting CourseCompass LMS Development Servers..." -ForegroundColor Cyan

# Check if servers are already running
$djangoRunning = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*manage.py*runserver*" }
$astroRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*astro*dev*" }

if ($djangoRunning) {
    Write-Host "Django server is already running (PID: $($djangoRunning.Id))" -ForegroundColor Yellow
} else {
    Write-Host "Starting Django backend server..." -ForegroundColor Green
    
    # Check for virtual environment
    $venvPath = "backend\venv\Scripts\Activate.ps1"
    $rootVenvPath = "venv\Scripts\Activate.ps1"
    
    if (Test-Path $venvPath) {
        # Use backend venv
        $djangoCommand = "cd backend; .\venv\Scripts\Activate.ps1; python manage.py runserver"
    } elseif (Test-Path $rootVenvPath) {
        # Use root venv
        $djangoCommand = "..\venv\Scripts\Activate.ps1; cd backend; python manage.py runserver"
    } else {
        # Try system Python
        Write-Host "  Warning: No virtual environment found, using system Python" -ForegroundColor Yellow
        $djangoCommand = "cd backend; python manage.py runserver"
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $djangoCommand -WindowStyle Normal
    Start-Sleep -Seconds 3
}

if ($astroRunning) {
    Write-Host "Astro server is already running (PID: $($astroRunning.Id))" -ForegroundColor Yellow
} else {
    Write-Host "Starting Astro frontend server..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend-astro; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "Development servers starting..." -ForegroundColor Cyan
Write-Host "Django Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Astro Frontend:  http://localhost:4321" -ForegroundColor Green
Write-Host ""
Write-Host "Use 'stop-dev.ps1' to stop all servers" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: If Django fails to start, activate venv manually:" -ForegroundColor Gray
Write-Host "  cd backend" -ForegroundColor Gray
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "  python manage.py runserver" -ForegroundColor Gray
