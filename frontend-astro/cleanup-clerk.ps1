# PowerShell cleanup script to remove Clerk dependencies and files

Write-Host "🧹 Cleaning up Clerk dependencies from Astro frontend..." -ForegroundColor Cyan

# Remove Clerk packages
Write-Host "📦 Removing Clerk npm packages..." -ForegroundColor Yellow
npm uninstall @clerk/astro @clerk/clerk-react

# Remove Clerk-related files
Write-Host "🗑️  Removing Clerk component files..." -ForegroundColor Yellow
$filesToRemove = @(
    "src/components/ClerkProviderWrapper.tsx",
    "src/components/ClerkProviderWrapper.jsx",
    "src/components/auth/SignOutLink.tsx",
    "src/pages/login.astro"
)

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  Removed: $file" -ForegroundColor Gray
    }
}

# Clean up node_modules and reinstall
Write-Host "🔄 Reinstalling dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review remaining files for Clerk imports"
Write-Host "2. Update any components still using Clerk"
Write-Host "3. Test authentication with Django JWT"
Write-Host ""
Write-Host "To search for remaining Clerk references:" -ForegroundColor Cyan
Write-Host "  Get-ChildItem -Recurse -Include *.tsx,*.ts,*.jsx,*.js,*.astro | Select-String '@clerk'"
Write-Host "  Get-ChildItem -Recurse -Include *.tsx,*.ts,*.jsx,*.js,*.astro | Select-String 'Clerk'"
