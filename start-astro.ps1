# Start Astro Server
Write-Host "Starting Astro Frontend Server..." -ForegroundColor Cyan

# Navigate to frontend-astro directory
Set-Location -Path "$PSScriptRoot\frontend-astro"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Starting Astro server on http://localhost:4321" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Start Astro server
npm run dev
