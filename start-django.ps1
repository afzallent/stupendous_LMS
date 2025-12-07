# Start Django Server
Write-Host "Starting Django Backend Server..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Check for virtual environment
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & ".\venv\Scripts\Activate.ps1"
} elseif (Test-Path "..\venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & "..\venv\Scripts\Activate.ps1"
} else {
    Write-Host "Warning: No virtual environment found!" -ForegroundColor Yellow
    Write-Host "Create one with: python -m venv venv" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Django server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start Django server
python manage.py runserver
