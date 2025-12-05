#!/usr/bin/env pwsh
# Restart both Django backend and Next.js frontend servers

Write-Host "Restarting LMS Servers..." -ForegroundColor Cyan
Write-Host ""

# Stop servers first
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
& ".\stop-servers.ps1"

# Wait a moment
Start-Sleep -Seconds 2

# Start servers
Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Yellow
& ".\start-servers.ps1"
