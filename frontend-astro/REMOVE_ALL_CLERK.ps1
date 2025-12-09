# Complete Clerk Removal Script for Astro Frontend
# This script removes ALL Clerk references from the codebase

Write-Host "🧹 COMPLETE CLERK REMOVAL SCRIPT" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$totalCleaned = 0
$errors = @()

# Function to clean a file
function Clean-ClerkReferences {
    param(
        [string]$FilePath
    )
    
    if (-not (Test-Path $FilePath)) {
        return $false
    }
    
    try {
        $content = Get-Content $FilePath -Raw -ErrorAction Stop
        $originalContent = $content
        
        # Remove all Clerk-related imports
        $content = $content -replace "import ClerkProviderWrapper from [^;]+;`r?`n", ""
        $content = $content -replace "import ClerkTrainerWrapper from [^;]+;`r?`n", ""
        $content = $content -replace "import.*ClerkProviderWrapper.*`r?`n", ""
        
        # Remove wrapper tags
        $content = $content -replace "<ClerkProviderWrapper>`r?`n", ""
        $content = $content -replace "</ClerkProviderWrapper>`r?`n", ""
        $content = $content -replace "</ClerkProviderWrapper> `r?`n", ""
        $content = $content -replace "<ClerkTrainerWrapper>`r?`n", ""
        $content = $content -replace "</ClerkTrainerWrapper>`r?`n", ""
        
        # Remove Clerk comments
        $content = $content -replace "// Clerk-based authentication.*`r?`n", ""
        $content = $content -replace "// and middleware\. The dashboard pages are protected by Clerk\.`r?`n", ""
        
        # Only save if content changed
        if ($content -ne $originalContent) {
            Set-Content -Path $FilePath -Value $content -NoNewline -ErrorAction Stop
            return $true
        }
        
        return $false
    }
    catch {
        $script:errors += "Error processing $FilePath : $_"
        return $false
    }
}

Write-Host "📁 Cleaning Student Dashboard Pages..." -ForegroundColor Yellow
$studentFiles = @(
    "src/pages/dashboard/student/courses.astro",
    "src/pages/dashboard/student/certificates.astro",
    "src/pages/dashboard/student/assessments.astro",
    "src/pages/dashboard/student/discussions.astro",
    "src/pages/dashboard/student/settings.astro"
)

foreach ($file in $studentFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Clean-ClerkReferences -FilePath $fullPath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
        $totalCleaned++
    } else {
        Write-Host "  ⏭️  $file (no changes or not found)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📁 Cleaning Trainer Dashboard Pages..." -ForegroundColor Yellow
$trainerFiles = @(
    "src/pages/dashboard/trainer/courses/new.astro",
    "src/pages/dashboard/trainer/courses/index.astro",
    "src/pages/dashboard/trainer/courses/[courseId]/lessons.astro",
    "src/pages/dashboard/trainer/settings.astro",
    "src/pages/dashboard/trainer/discussions.astro",
    "src/pages/dashboard/trainer/students.astro",
    "src/pages/dashboard/trainer/assessments/new.astro",
    "src/pages/dashboard/trainer/analytics.astro",
    "src/pages/dashboard/trainer/index.astro"
)

foreach ($file in $trainerFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Clean-ClerkReferences -FilePath $fullPath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
        $totalCleaned++
    } else {
        Write-Host "  ⏭️  $file (no changes or not found)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📁 Cleaning Component Files..." -ForegroundColor Yellow
$componentFiles = @(
    "src/components/dashboard/UserInfoWrapped.tsx"
)

foreach ($file in $componentFiles) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Clean-ClerkReferences -FilePath $fullPath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
        $totalCleaned++
    } else {
        Write-Host "  ⏭️  $file (no changes or not found)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✨ Cleanup Complete!" -ForegroundColor Green
Write-Host "   Files cleaned: $totalCleaned" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Errors encountered:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   $error" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Run 'npm run dev' to test the changes" -ForegroundColor White
Write-Host "   2. Check for any remaining Clerk errors" -ForegroundColor White
Write-Host "   3. Admin pages (trainers.astro, students.astro) need manual rewrite" -ForegroundColor White
Write-Host ""
Write-Host "🔍 To verify, run:" -ForegroundColor Cyan
Write-Host "   Get-ChildItem -Recurse -Include *.astro,*.tsx,*.ts | Select-String 'Clerk' -List" -ForegroundColor White
Write-Host ""
