# PowerShell script to remove all ClerkProviderWrapper references from Astro files

$files = @(
    "src/pages/dashboard/trainer/students.astro",
    "src/pages/dashboard/trainer/settings.astro",
    "src/pages/dashboard/trainer/discussions.astro",
    "src/pages/dashboard/trainer/courses/new.astro",
    "src/pages/dashboard/trainer/assessments/new.astro",
    "src/pages/dashboard/trainer/analytics.astro",
    "src/pages/dashboard/student/discussions.astro",
    "src/pages/dashboard/student/assessments.astro"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file"
        
        $content = Get-Content $fullPath -Raw
        
        # Remove ClerkProviderWrapper import line
        $content = $content -replace "import ClerkProviderWrapper from [^;]+;`r?`n", ""
        
        # Remove opening tag
        $content = $content -replace "<ClerkProviderWrapper>`r?`n", ""
        
        # Remove closing tag
        $content = $content -replace "</ClerkProviderWrapper>`r?`n", ""
        
        # Save the file
        Set-Content -Path $fullPath -Value $content -NoNewline
        
        Write-Host "  Cleaned $file"
    } else {
        Write-Host "  File not found: $file"
    }
}

Write-Host ""
Write-Host "Clerk cleanup complete!"
