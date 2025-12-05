#!/bin/bash
# Setup script for Django endpoints implementation

echo "=========================================="
echo "Django Endpoints Setup"
echo "=========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

echo "📦 Step 1: Installing Pillow for image handling..."
pip install Pillow>=10.0.0

echo ""
echo "🔄 Step 2: Creating migrations..."
python manage.py makemigrations core
python manage.py makemigrations courses

echo ""
echo "🔄 Step 3: Applying migrations..."
python manage.py migrate

echo ""
echo "📁 Step 4: Creating media directories..."
mkdir -p media/avatars
mkdir -p media/course_thumbnails
mkdir -p media/lesson_videos

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start Django server: python manage.py runserver"
echo "2. Test endpoints with the Next.js frontend"
echo ""
echo "📚 See DJANGO_ENDPOINTS_IMPLEMENTATION.md for details"
