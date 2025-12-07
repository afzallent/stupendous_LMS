#!/bin/bash

# Cleanup script to remove Clerk dependencies and files

echo "🧹 Cleaning up Clerk dependencies from Astro frontend..."

# Remove Clerk packages
echo "📦 Removing Clerk npm packages..."
npm uninstall @clerk/astro @clerk/clerk-react

# Remove Clerk-related files
echo "🗑️  Removing Clerk component files..."
rm -f src/components/ClerkProviderWrapper.tsx
rm -f src/components/ClerkProviderWrapper.jsx
rm -f src/components/auth/SignOutLink.tsx

# Remove Clerk-related pages (if they exist)
echo "🗑️  Removing old Clerk pages..."
rm -f src/pages/login.astro  # Old Clerk login page

# Clean up node_modules and reinstall
echo "🔄 Reinstalling dependencies..."
npm install

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review remaining files for Clerk imports"
echo "2. Update any components still using Clerk"
echo "3. Test authentication with Django JWT"
echo ""
echo "To search for remaining Clerk references:"
echo "  grep -r '@clerk' src/"
echo "  grep -r 'Clerk' src/"
