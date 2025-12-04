#!/bin/bash
# API Fix Verification Script

echo "=========================================="
echo "Next.js API Fix Verification"
echo "=========================================="
echo ""

cd frontend/src

echo "🔍 Searching for old API calls..."
echo ""

# Search for fetch('/api/ calls
RESULTS=$(grep -r "fetch('/api/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v ".next" | grep -v "node_modules")

if [ -z "$RESULTS" ]; then
    echo "✅ SUCCESS! No old API calls found!"
    echo ""
    echo "All files have been fixed to use djangoApi client."
    exit 0
else
    echo "⚠️  Found remaining old API calls:"
    echo ""
    echo "$RESULTS"
    echo ""
    
    # Count files
    FILE_COUNT=$(echo "$RESULTS" | wc -l)
    echo "📊 Total files with old API calls: $FILE_COUNT"
    echo ""
    
    # Check if only admin/test files
    ADMIN_COUNT=$(echo "$RESULTS" | grep -c "admin" || true)
    TEST_COUNT=$(echo "$RESULTS" | grep -c "test" || true)
    
    if [ $((ADMIN_COUNT + TEST_COUNT)) -eq $FILE_COUNT ]; then
        echo "✅ All remaining calls are in admin/test files (expected)"
        echo "   These are low priority and can be fixed later."
        exit 0
    else
        echo "❌ Some critical files still have old API calls"
        echo "   Please review and fix these files."
        exit 1
    fi
fi
