#!/bin/bash

echo "🔒 Testing Authentication Middleware"
echo "===================================="

BASE_URL="http://localhost:3001"

echo ""
echo "1. Testing /learn access without authentication:"
RESPONSE=$(curl -s -I -L "$BASE_URL/learn" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"301"* ]]; then
    echo "✅ PASS: /learn redirects when not authenticated"
else
    echo "❌ FAIL: /learn accessible without authentication"
fi

echo ""
echo "2. Testing /admin access without authentication:"
RESPONSE=$(curl -s -I -L "$BASE_URL/admin" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"301"* ]]; then
    echo "✅ PASS: /admin redirects when not authenticated"
else
    echo "❌ FAIL: /admin accessible without authentication"
fi

echo ""
echo "3. Testing /instructor access without authentication:"
RESPONSE=$(curl -s -I -L "$BASE_URL/instructor" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"301"* ]]; then
    echo "✅ PASS: /instructor redirects when not authenticated"
else
    echo "❌ FAIL: /instructor accessible without authentication"
fi

echo ""
echo "4. Testing public route /courses (should be accessible):"
RESPONSE=$(curl -s -I -L "$BASE_URL/courses" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"200"* ]]; then
    echo "✅ PASS: /courses is publicly accessible"
else
    echo "❌ FAIL: /courses not accessible"
fi

echo ""
echo "5. Testing public route / (should be accessible):"
RESPONSE=$(curl -s -I -L "$BASE_URL/" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"200"* ]]; then
    echo "✅ PASS: / is publicly accessible"
else
    echo "❌ FAIL: / not accessible"
fi

echo ""
echo "🏁 Authentication Test Complete"#!/bin/bash

echo "🔒 Testing Authentication Middleware"
echo "===================================="

BASE_URL="http://localhost:3001"

echo ""
echo "1. Testing /learn access without authentication:"
RESPONSE=$(curl -s -I -L "$BASE_URL/learn" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"301"* ]]; then
    echo "✅ PASS: /learn redirects when not authenticated"
else
    echo "❌ FAIL: /learn accessible without authentication"
fi

echo ""
echo "2. Testing /admin access without authentication:"
RESPONSE=$(curl -s -I -L "$BASE_URL/admin" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"301"* ]]; then
    echo "✅ PASS: /admin redirects when not authenticated"
else
    echo "❌ FAIL: /admin accessible without authentication"
fi

echo ""
echo "3. Testing /instructor access without authentication:"
RESPONSE=$(curl -s -I -L "$BASE_URL/instructor" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"302"* ]] || [[ $RESPONSE == *"301"* ]]; then
    echo "✅ PASS: /instructor redirects when not authenticated"
else
    echo "❌ FAIL: /instructor accessible without authentication"
fi

echo ""
echo "4. Testing public route /courses (should be accessible):"
RESPONSE=$(curl -s -I -L "$BASE_URL/courses" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"200"* ]]; then
    echo "✅ PASS: /courses is publicly accessible"
else
    echo "❌ FAIL: /courses not accessible"
fi

echo ""
echo "5. Testing public route / (should be accessible):"
RESPONSE=$(curl -s -I -L "$BASE_URL/" | head -n 1)
echo "Response: $RESPONSE"

if [[ $RESPONSE == *"200"* ]]; then
    echo "✅ PASS: / is publicly accessible"
else
    echo "❌ FAIL: / not accessible"
fi

echo ""
echo "🏁 Authentication Test Complete"