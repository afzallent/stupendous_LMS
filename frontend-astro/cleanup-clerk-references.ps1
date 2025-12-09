# PowerShell script to remove all Clerk references from Astro frontend

Write-Host "🧹 Cleaning up Clerk references from Astro frontend..." -ForegroundColor Cyan

$files = @(
    "src/pages/dashboard/trainer/courses/new.astro",
    "src/pages/dashboard/trainer/settings.astro",
    "src/pages/dashboard/trainer/discussions.astro",
    "src/pages/dashboard/trainer/students.astro",
    "src/pages/dashboard/trainer/assessments/new.astro",
    "src/pages/dashboard/trainer/analytics.astro",
    "src/pages/dashboard/student/courses.astro",
    "src/pages/dashboard/student/certificates.astro",
    "src/pages/dashboard/student/assessments.astro",
    "src/pages/dashboard/student/discussions.astro",
    "src/pages/dashboard/student/settings.astro"
)

$count = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "  Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        
        # Remove ClerkProviderWrapper import line
        $content = $content -replace "import ClerkProviderWrapper from [^;]+;`n", ""
        
        # Remove <ClerkProviderWrapper> opening tag
        $content = $content -replace "<ClerkProviderWrapper>`n", ""
        
        # Remove </ClerkProviderWrapper> closing tag
        $content = $content -replace "</ClerkProviderWrapper>`n", ""
        $content = $content -replace "</ClerkProviderWrapper> `n", ""
        
        # Save the cleaned content
        Set-Content -Path $fullPath -Value $content -NoNewline
        
        $count++
        Write-Host "    ✅ Cleaned" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n✨ Cleanup complete! Processed $count files." -ForegroundColor Green
Write-Host "🔍 You may want to manually check these files for any remaining Clerk references." -ForegroundColor Cyan
